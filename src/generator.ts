import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { build } from 'tsdown'
import ansis from 'ansis'
import compressing from 'compressing'
import type { DepShipConfig, Manifest } from './types'

export class Generator {
  private readonly config: Required<DepShipConfig>

  constructor(config: DepShipConfig) {
    const root = process.cwd()
    const baseDir = path.resolve(root, config.baseDir || '.dep-ship')

    this.config = {
      packagePath: path.resolve(root, 'package.json'),
      baseDir,
      outDir: path.resolve(baseDir, 'dist'),
      tempDir: path.resolve(baseDir, 'temp'),
      exclude: [],
      include: [],
      tsdownOptions: {},
      manifestPath: path.resolve(baseDir, 'manifest.json'),
      zip: {
        enable: false,
        fileName: 'cdn.zip',
        ...(config.zip || {}),
      },
      ...config,
    }
  }

  /**
   * 辅助函数：确保目录存在
   */
  private async ensureDir(dir: string) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
  }

  /**
   * 辅助函数：确保文件存在
   */
  private async ensureFile(file: string) {
    const dir = path.dirname(file)
    await this.ensureDir(dir)
    if (!existsSync(file)) {
      await writeFile(file, '')
    }
  }

  /**
   * 获取需要处理的依赖列表
   */
  private async getDeps(): Promise<string[]> {
    const depsSet = new Set<string>(this.config.include)

    if (existsSync(this.config.packagePath)) {
      const pkgContent = await readFile(this.config.packagePath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      const pkgDeps = Object.keys(pkg.dependencies || {})
      pkgDeps.forEach(dep => depsSet.add(dep))
    }

    return Array.from(depsSet).filter(dep => !this.config.exclude.includes(dep))
  }

  /**
   * 生成代理入口文件
   */
  private async generateProxyFiles(deps: string[]): Promise<string[]> {
    await this.ensureDir(this.config.tempDir)
    const entryPoints: string[] = []

    for (const dep of deps) {
      const proxyPath = path.join(this.config.tempDir, `${dep.replace(/\//g, '__')}.js`)

      // 如果文件已存在，则跳过生成，允许用户手动修改代码
      if (existsSync(proxyPath)) {
        console.log(ansis.dim(`[DepShip] 使用已存在的代理文件: ${proxyPath}`))
        entryPoints.push(proxyPath)
        continue
      }

      const codeTemplate = `import * as m from "${dep}";\nexport * from "${dep}";\nexport default (m && m.default) !== undefined ? m.default : m;`

      await this.ensureFile(proxyPath)
      writeFileSync(proxyPath, codeTemplate)

      entryPoints.push(proxyPath)
    }

    return entryPoints
  }

  /**
   * 生成 Manifest 清单的插件
   */
  private bundleManifestPlugin() {
    const { publicPath, manifestPath: mPath } = this.config
    const manifest: Manifest = {}

    return {
      name: 'dep-ship-manifest',
      generateBundle(_options: any, bundle: any) {
        const baseUrl = publicPath.endsWith('/') ? publicPath : `${publicPath}/`

        for (const [fileName, output] of Object.entries(bundle)) {
          const { name, isEntry } = output as any
          if (isEntry && name) {
            const originalName = name.replace(/__/g, '/')
            const normalizedFileName = fileName.replace(/\\/g, '/')
            manifest[originalName] = `${baseUrl}${normalizedFileName}`
          }
        }
      },
      async writeBundle() {
        const dir = path.dirname(mPath)
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true })
        }
        writeFileSync(mPath, JSON.stringify(manifest, undefined, 2))
        console.log(ansis.green(`\n[DepShip] 清单文件已生成: ${mPath}`))
      }
    }
  }

  /**
   * 压缩构建产物
   */
  private async compress() {
    const { outDir, baseDir, zip } = this.config
    if (!zip.enable) return

    const zipPath = path.resolve(baseDir, zip.fileName || 'cdn.zip')
    console.log(ansis.blue(`📦 正在生成压缩包: ${zipPath}...`))

    await compressing.zip.compressDir(outDir, zipPath, {
      ignoreBase: true,
    })
    console.log(ansis.green(`✨ 压缩包已生成：${zipPath}`))
  }

  /**
   * 执行构建流程
   */
  async run() {
    console.log(ansis.blue('🚀 正在启动 DepShip...'))

    const deps = await this.getDeps()
    if (deps.length === 0) {
      console.log(ansis.yellow('未发现需要处理的依赖。'))
      return
    }

    const entryPoints = await this.generateProxyFiles(deps)

    console.log(ansis.blue(`📦 正在预构建 ${deps.length} 个依赖...`))

    await build({
      entry: entryPoints,
      format: ['esm'],
      target: 'es2020',
      platform: 'browser',
      outDir: this.config.outDir,
      minify: true,
      shims: true,
      dts: false,
      hash: true,
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
        '__VUE_PROD_DEVTOOLS__': JSON.stringify(false),
      },
      inputOptions: {
        onwarn(warning, handle) {
          if (
            warning.code === 'EVAL' ||
            warning.code === 'CIRCULAR_DEPENDENCY' ||
            warning.code === 'IMPORT_IS_UNDEFINED'
          ) return
          handle(warning)
        },
      },
      outputOptions: {
        legalComments: 'none',
        entryFileNames: `js/[name].[hash].js`,
        chunkFileNames: `chunk/[name].[hash].js`,
      },
      plugins: [
        this.bundleManifestPlugin(),
      ],
      noExternal: deps,
      inlineOnly: false,
      ...this.config.tsdownOptions,
    })

    console.log(ansis.green('✨ 构建成功完成！'))

    // 执行压缩任务
    if (this.config.zip.enable) {
      await this.compress()
    }
  }
}
