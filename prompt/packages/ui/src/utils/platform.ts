/**
 * 平台检测工具
 * 用于识别操作系统并提供平台相关的配置
 */

export interface Platform {
  /** 是否为 macOS */
  isMac: boolean
  /** 是否为 Windows */
  isWindows: boolean
  /** 是否为 Linux */
  isLinux: boolean
  /** 获取撤销操作快捷键 */
  getUndoKey: () => string
  /** 获取重做操作快捷键 */
  getRedoKey: () => string
  /** 获取命令键（Mac: Cmd, 其他: Ctrl） */
  getCommandKey: () => string
}

/**
 * 检测当前平台
 * @returns 平台信息对象
 */
export function getPlatform(): Platform {
  const platform = navigator.platform.toUpperCase()
  const isMac = platform.indexOf('MAC') >= 0
  const isWindows = platform.indexOf('WIN') >= 0
  const isLinux = platform.indexOf('LINUX') >= 0

  return {
    isMac,
    isWindows,
    isLinux,
    getUndoKey: () => (isMac ? 'Cmd+Z' : 'Ctrl+Z'),
    getRedoKey: () => (isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y'),
    getCommandKey: () => (isMac ? 'Cmd' : 'Ctrl')
  }
}

/**
 * 全局平台实例（单例）
 */
export const platform = getPlatform()
