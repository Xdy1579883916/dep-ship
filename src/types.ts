export interface DepShipConfig {
  /** CDN 基础路径，例如 https://js-c.etc4.com/tjl/ */
  publicPath: string
  /** 依赖来源的 package.json 路径，默认为当前目录下的 package.json */
  packagePath?: string
  /** 输出目录，默认为 {baseDir}/dist */
  outDir?: string
  /** 临时代理文件目录，默认为 {baseDir}/temp */
  tempDir?: string
  /** 排除的依赖包 */
  exclude?: string[]
  /** 强制包含的依赖包（如果不从 package.json 读取） */
  include?: string[]
  /** 工作基础目录，用于存放临时文件和构建产物，默认为 .dep-ship */
  baseDir?: string
  /** tsdown 的额外配置 */
  tsdownOptions?: any
  /** Manifest 文件输出路径，默认为 {baseDir}/manifest.json */
  manifestPath?: string
  /** 压缩配置 */
  zip?: {
    /** 是否开启自动压缩，默认为 false */
    enable?: boolean
    /** 压缩输出文件名，基于 baseDir，默认为 cdn.zip */
    fileName?: string
  }
}

export interface Manifest {
  [key: string]: string
}
