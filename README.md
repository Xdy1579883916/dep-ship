# DepShip 📦

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

**DepShip** 是一个高性能的依赖预构建工具，旨在将繁重的 `node_modules` 依赖转化为独立的、自包含的 CDN 资源（ESM 格式）。

## 核心理念 🚀

1.  **依赖外置化**：将常用的第三方库（Vue, Lodash, UI 等）预先打包成 CDN 链接。
2.  **减负提速**：主项目构建时不再重复处理这些依赖，显著缩短打包时间。
3.  **极致缓存**：利用浏览器对 CDN 资源的强缓存特性，即使主站代码更新，依赖库也无需重新下载。
4.  **源码洁癖**：项目源码中只保留业务逻辑，依赖关系通过 Manifest 清单动态管理。

## 安装 🛠️

```bash
pnpm add @dy-kit/dep-ship -D
```

## 快速上手 ⚡

### 1. 初始化配置
在项目根目录运行以下命令，生成 `dep-ship.config.ts`：

```bash
npx dep-ship init
```

### 2. 配置文件示例
`dep-ship.config.ts` 支持全量类型提示：

```typescript
import { defineConfig } from '@dy-kit/dep-ship'

export default defineConfig({
  // CDN 基础路径 (必须配置)
  publicPath: 'https://cdn.example.com/assets/',
  
  // 工作基础目录 (可选，默认为 .dep-ship)
  baseDir: '.dep-ship',

  // 排除不需要 CDN 化的依赖
  exclude: ['some-local-lib'],
  
  // 额外强制包含的依赖 (可选)
  include: [],

  // 压缩配置 (可选)
  zip: {
    enable: true,      // 开启自动压缩
    fileName: 'cdn.zip' // 压缩包名称，生成于 baseDir 目录下
  },

  // 自定义 tsdown 打包选项
  tsdownOptions: {
    minify: true
  }
})
```

### 3. 构建依赖
执行构建，将依赖转化为 CDN 资源并生成清单：

```bash
npx dep-ship build
```

构建完成后，你会得到：
-   `.dep-ship/dist/js/`：打包好的 ESM 资源文件（带 Hash）。
-   `.dep-ship/manifest.json`：资源映射清单。
-   `.dep-ship/cdn.zip`：打包好的资源压缩包（如果开启了 zip）。

## 进阶特性 🌟

### 自定义代理代码
`DepShip` 在构建前会将代理文件生成在 `.dep-ship/temp` 目录下。如果某些包的导出比较特殊（如没有默认导出），你可以手动修改这些 `.js` 文件。**只要文件已存在，`DepShip` 就会跳过自动生成过程并使用你的自定义版本。**

## 应用集成 🔗

在你的 Vite 配置或模板中，可以使用导出的工具函数来消费清单：

```typescript
import { useCDNScripts } from '@dy-kit/dep-ship'
import manifest from './.dep-ship/manifest.json'

// 获取所有或部分 CDN 链接
const scripts = useCDNScripts(manifest, {
  disabledJs: ['vue'] // 编译后，如果某些包你想使用本地调试，可以排除
})

console.log(scripts['lodash-es']) 
// 输出: https://cdn.example.com/assets/js/lodash-es.H8f2kL9.js
```

## 核心特性 ✨

-   **全量打包**：即使目标库没有 `default` 导出，也能智能处理兼容性。
-   **智能路径**：自动处理包名中的斜杠，并规范化路径。
-   **高度可扩展**：基于 `tsdown` (Powered by Rolldown)，支持所有现代打包特性。
-   **零心智负担**：默认产物隔离在 `.dep-ship` 目录下，不污染项目源码。

## 开源协议 📄

[MIT](./LICENSE) License © 2024-PRESENT [XiaDeYu](https://github.com/Xdy1579883916)


<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@dy-kit/dep-ship?style=flat&colorA=080f12&colorB=1fa669

[npm-version-href]: https://npmjs.com/package/@dy-kit/dep-ship

[npm-downloads-src]: https://img.shields.io/npm/dm/@dy-kit/dep-ship?style=flat&colorA=080f12&colorB=1fa669

[npm-downloads-href]: https://npmjs.com/package/@dy-kit/dep-ship

[bundle-src]: https://img.shields.io/bundlephobia/minzip/@dy-kit/dep-ship?style=flat&colorA=080f12&colorB=1fa669&label=minzip

[bundle-href]: https://bundlephobia.com/result?p=@dy-kit/dep-ship

[license-src]: https://img.shields.io/github/license/Xdy1579883916/dep-ship.svg?style=flat&colorA=080f12&colorB=1fa669

[license-href]: https://github.com/Xdy1579883916/dep-ship/blob/master/LICENSE
