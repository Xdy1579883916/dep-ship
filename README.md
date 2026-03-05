# DepShip 📦

**DepShip** 是一个高性能的依赖预构建工具，旨在将繁重的 `node_modules` 依赖转化为独立的、自包含的 CDN 资源（ESM 格式）。

## 核心理念 🚀

1.  **依赖外置化**：将常用的第三方库（Vue, Lodash, UI 等）预先打包成 CDN 链接。
2.  **减负提速**：主项目构建时不再重复处理这些依赖，显著缩短打包时间。
3.  **极致缓存**：利用浏览器对 CDN 资源的强缓存特性，即使主站代码更新，依赖库也无需重新下载。
4.  **源码洁癖**：项目源码中只保留业务逻辑，依赖关系通过 Manifest 清单动态管理。

## 安装 🛠️

```bash
pnpm add dep-ship -D
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
import { defineConfig } from 'dep-ship'

export default defineConfig({
  // CDN 基础路径 (必须配置)
  publicPath: 'https://cdn.example.com/assets/',
  
  // 工作基础目录 (可选，默认为 .dep-ship)
  baseDir: '.dep-ship',

  // 排除不需要 CDN 化的依赖
  exclude: ['some-local-lib'],
  
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

## 应用集成 🔗

在你的 Vite 配置或模板中，可以使用导出的工具函数来消费清单：

```typescript
import { useCDNScripts } from 'dep-ship'
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
-   **高度可扩展**：基于 `tsdown`，支持所有现代打包特性。
-   **零心智负担**：默认产物隔离在 `.dep-ship` 目录下，不污染项目源码。

## 开源协议 📄

[MIT](./LICENSE)
