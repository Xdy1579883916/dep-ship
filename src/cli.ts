import { cac } from 'cac'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import ansis from 'ansis'
import { createJiti } from 'jiti'
import { Generator } from './generator'

const cli = cac('dep-ship')
const jiti = createJiti(import.meta.url)

cli
  .command('init', '初始化 dep-ship.config.ts 配置文件')
  .action(async () => {
    const configPath = path.resolve(process.cwd(), 'dep-ship.config.ts')
    if (existsSync(configPath)) {
      console.log(ansis.yellow('dep-ship.config.ts 已经存在。'))
      return
    }

    const template = `import { defineConfig } from 'dep-ship'

export default defineConfig({
  // CDN 基础路径 (必须配置)
  publicPath: 'https://your-cdn-path.com/',
  // 工作基础目录 (可选，默认为 .dep-ship)
  baseDir: '.dep-ship',
  // 需要排除的依赖包 (可选)
  exclude: [],
  // 需要额外包含的依赖包 (可选，通常会自动从 package.json 读取)
  include: [],

  // 压缩配置 (可选)
  zip: {
    enable: false,
    fileName: 'cdn.zip',
  },
})
`
    await writeFile(configPath, template)
    console.log(ansis.green('已创建 dep-ship.config.ts'))
  })

cli
  .command('build', '构建依赖并准备分发到 CDN')
  .option('-c, --config <path>', '指定配置文件路径')
  .action(async (options) => {
    try {
      const configPath = options.config || path.resolve(process.cwd(), 'dep-ship.config.ts')
      let userConfig: any = {}

      if (existsSync(configPath)) {
        console.log(ansis.dim(`正在加载配置文件: ${configPath}`))
        const mod = await jiti.import(configPath) as any
        userConfig = mod.default || mod
      } else {
        console.warn(ansis.yellow(`未找到配置文件: ${configPath}，将使用默认配置。`))
      }

      const config = {
        publicPath: process.env.DEP_SHIP_PUBLIC_PATH || '',
        ...userConfig
      }

      if (!config.publicPath) {
        console.error(ansis.red('错误: 配置文件中必须提供 publicPath，或设置 DEP_SHIP_PUBLIC_PATH 环境变量'))
        process.exit(1)
      }

      const generator = new Generator(config)
      await generator.run()
    } catch (err) {
      console.error(ansis.red('构建失败:'), err)
      process.exit(1)
    }
  })

cli.help()
cli.parse()
