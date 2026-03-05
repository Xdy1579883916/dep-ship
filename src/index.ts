import type { DepShipConfig } from './types'

export * from './types'
export * from './generator'

/**
 * 辅助函数，为配置文件提供类型提示
 */
export function defineConfig(config: DepShipConfig): DepShipConfig {
  return config
}

/**
 * 在应用中获取 CDN 资源清单中的脚本链接
 * @param manifest 清单对象
 * @param opt 选项，例如排除某些不需要 CDN 化的 JS
 */
export function useCDNScripts(manifest: Record<string, string>, opt?: { disabledJs?: string | string[] }) {
  const { disabledJs: omJs } = opt || {}

  if (omJs) {
    const shallowCopy = { ...manifest }
    const toRemove = Array.isArray(omJs) ? omJs : [omJs]
    toRemove.forEach(key => delete shallowCopy[key])
    return shallowCopy
  }

  return manifest
}
