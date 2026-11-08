/**
 * plugins/custom/layout-block/index.ts — 显示控制布局块(meditor-layout)插件出口
 */
export {
  MEDITOR_LAYOUT_NODE_NAME,
  MEDITOR_LAYOUT_DEFAULT_LANG,
  layoutBlock,
  meditorLayoutSchema,
  remarkMeditorLayoutPlugin,
} from './layout-block-plugin';
export { createMeditorLayoutNodeView } from './layout-block-node-view';
export {
  createLayoutBlockBehaviorController,
  createLayoutBlockBehaviorPlugin,
  type LayoutBlockBehaviorController,
} from './layout-block-behavior';
export {
  createLayoutBlockEffectPlugin,
  LAYOUT_BLOCK_EFFECT_KEY,
  type LayoutEffectState,
} from './layout-block-effect';
export {
  buildJsScaffold,
  MEDITOR_LAYOUT_MESSAGE_FLAG,
  MEDITOR_LAYOUT_APP_ID,
  type MeditorLayoutResizeMessage,
} from './layout-block-scaffold';
export type { MeditorLayoutNodeViewOptions } from './layout-block-node-view';
