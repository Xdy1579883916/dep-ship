import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts'
  },
  outDir: 'dist',
  target: 'node20',
  dts: true,
  format: ['cjs', 'esm'],
  clean: true,
  // 使用最新的选项名
  unbundle: false,
  // 注入 shebang 到 cli 文件
  plugins: [
    {
      name: 'shebang',
      generateBundle(_options, bundle) {
        for (const [fileName, file] of Object.entries(bundle)) {
          // 仅处理生成的 JS chunk，排除声明文件
          if (fileName.includes('cli') && (fileName.endsWith('.mjs') || fileName.endsWith('.cjs')) && file.type === 'chunk') {
            file.code = `#!/usr/bin/env node\n${file.code}`
          }
        }
      }
    }
  ]
})
