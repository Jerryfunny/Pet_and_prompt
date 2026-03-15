import { computed, type CSSProperties } from 'vue'

import { useThemeVars, type TooltipProps } from 'naive-ui';

type TooltipThemeOverrides = NonNullable<TooltipProps['themeOverrides']>;

interface UseTooltipThemeOptions {
  maxWidth?: CSSProperties['maxWidth'];
  maxHeight?: CSSProperties['maxHeight'];
  whiteSpace?: CSSProperties['whiteSpace'];
  wordBreak?: CSSProperties['wordBreak'];
  overflowWrap?: CSSProperties['overflowWrap'];
  padding?: CSSProperties['padding'];
  overflowY?: CSSProperties['overflowY'];
}

/**
 * Naive UI 默认会将 Tooltip 叠加层合成成接近黑色的背景，这在浅色主题下会显得突兀。
 * 这里基于 ConfigProvider 的主题变量构建 tooltip 的 themeOverrides，并提供常用的内容样式，
 * 让 Tooltip 的背景与弹层类组件保持一致，同时限制尺寸防止遮挡。
 */
export function useTooltipTheme(options: UseTooltipThemeOptions = {}) {
  const themeVars = useThemeVars();

  const tooltipThemeOverrides = computed<TooltipThemeOverrides>(() => {
    const vars = themeVars.value;

    return {
      color: vars.popoverColor,
      textColor: vars.textColor2,
      boxShadow: vars.boxShadow2,
      borderRadius: vars.borderRadius
    };
  });

  const tooltipOverlayStyle = computed<CSSProperties>(() => ({
    maxWidth: options.maxWidth ?? 'calc(100vw - 32px)',
    maxHeight: options.maxHeight ?? 'calc(100vh - 32px)'
  }));

  const tooltipContentStyle = computed<CSSProperties>(() => ({
    maxWidth: '100%',
    maxHeight: options.maxHeight ?? 'calc(100vh - 32px)',
    whiteSpace: options.whiteSpace ?? 'pre-wrap',
    wordBreak: options.wordBreak ?? 'break-word',
    overflowWrap: options.overflowWrap ?? 'anywhere',
    padding: options.padding ?? '12px 16px',
    overflowY: options.overflowY ?? 'auto',
    border: `1px solid ${themeVars.value.dividerColor}`,
    boxSizing: 'border-box'
  }));

  return {
    tooltipThemeOverrides,
    tooltipOverlayStyle,
    tooltipContentStyle
  };
}
