import path from 'node:path'
import { mkdir, readFile, rm, readdir, writeFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { build } from 'tsdown'
import ansis from 'ansis'
import compressing from 'compressing'
import type { DepShipConfig, Manifest } from './types'

export class Generator {
  private readonly config: Required<DepShipConfig>
  private readonly baseDir: string

  constructor(config: DepShipConfig) {
    const root = process.cwd()
    // 1. 先确定基础工作目录，默认为 .dep-ship
    const baseDir = path.resolve(root, config.baseDir || '.dep-ship')
    this.baseDir = baseDir

    // 2. 所有产物路径（outDir, tempDir, manifestPath）如果未指定或为相对路径，
    // 均相对于 baseDir 进行解析，从而确保它们都在 baseDir 内部。
    const outDir = path.resolve(baseDir, config.outDir || 'dist')
    const zipConfig = {
      enable: false,
      fileName: 'cdn.zip',
      ...(config.zip || {}),
    }

    this.config = {
      // 源代码 package.json 依然相对于项目根目录
      packagePath: path.resolve(root, config.packagePath || 'package.json'),
      baseDir,
      // 产物目录：相对于 baseDir
      outDir,
      // 临时目录：相对于 baseDir
      tempDir: path.resolve(baseDir, config.tempDir || 'temp'),
      // 清单文件：相对于 baseDir
      manifestPath: path.resolve(baseDir, config.manifestPath || 'manifest.json'),

      exclude: config.exclude || [],
      include: config.include || [],
      tsdownOptions: config.tsdownOptions || {},
      publicPath: config.publicPath,
      zip: {
        ...zipConfig,
        from: path.resolve(baseDir, zipConfig.from || outDir),
        to: path.resolve(baseDir, zipConfig.to || zipConfig.fileName || 'cdn.zip'),
      },
    } as Required<DepShipConfig>
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
   * 生成入口文件
   */
  private async generateProxyFiles(deps: string[]): Promise<string[]> {
    await this.ensureDir(this.config.tempDir)
    const entryPoints: string[] = []

    for (const dep of deps) {
      const proxyPath = path.join(this.config.tempDir, `${dep.replace(/\//g, '__')}.js`)

      // 如果文件已存在，则跳过生成，允许用户手动修改代码
      if (existsSync(proxyPath)) {
        console.log(ansis.dim(`[DepShip] 使用已存在的入口文件: ${proxyPath}`))
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
    const { zip } = this.config
    if (!zip.enable) return

    const from = path.resolve(this.baseDir, zip.from!)
    const to = path.resolve(this.baseDir, zip.to!)
    console.log(ansis.blue(`📦 正在生成压缩包: ${to}...`))

    await compressing.zip.compressDir(from, to, {
      ignoreBase: true,
    })
    console.log(ansis.green(`✨ 压缩包已生成：${zip.to}`))
  }

  /**
   * 执行构建流程
   */
  async run() {
    console.log(ansis.blue('🚀 正在启动 DepShip...'))

    // 0. 清理 baseDir，但保留 tempDir
    if (existsSync(this.config.baseDir)) {
      const items = await readdir(this.config.baseDir)
      for (const item of items) {
        const fullPath = path.resolve(this.config.baseDir, item)
        if (fullPath !== this.config.tempDir) {
          await rm(fullPath, { recursive: true, force: true })
        }
      }
    }

    const deps = await this.getDeps()
    if (deps.length === 0) {
      console.log(ansis.yellow('未发现需要处理的依赖。'))
      return
    }

    const entryPoints = await this.generateProxyFiles(deps)

    console.log(ansis.blue(`📦 正在预构建 ${deps.length} 个依赖...`))

    const userTsdownOptions = this.config.tsdownOptions || {}
    const userPlugins = Array.isArray(userTsdownOptions.plugins)
      ? userTsdownOptions.plugins
      : userTsdownOptions.plugins
        ? [userTsdownOptions.plugins]
        : []

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
      ...userTsdownOptions,
      inputOptions: {
        onLog(level, log, defaultHandler) {
          if (
              log.code === 'EVAL' ||
              log.code === 'CIRCULAR_DEPENDENCY' ||
              log.code === 'IMPORT_IS_UNDEFINED'
          ) return
          defaultHandler(level, log);
        },
        ...(userTsdownOptions.inputOptions || {}),
      },
      outputOptions: {
        comments: {
          legal: false
        },
        entryFileNames: () => `js/[name].[hash].js`,
        chunkFileNames: () => `chunk/[name].[hash].js`,
        ...(userTsdownOptions.outputOptions || {}),
      },
      plugins: [
        ...userPlugins,
        this.bundleManifestPlugin(),
      ],
      deps: {
        alwaysBundle: /.*/,
        ...(userTsdownOptions.deps || {}),
      },
    })

    console.log(ansis.green('✨ 构建成功完成！'))

    // 执行压缩任务
    if (this.config.zip.enable) {
      await this.compress()
    }
  }
}
