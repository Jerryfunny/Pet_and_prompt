/**
 * 统一模板方案
 * 使用 Mustache 作为统一的模板引擎，所有环境（包括浏览器扩展）都使用相同语法
 */

import Mustache from 'mustache';

// 导出 Mustache，让用户自己决定如何使用
export { Mustache };

// 提供便捷函数
export const render = Mustache.render.bind(Mustache); 