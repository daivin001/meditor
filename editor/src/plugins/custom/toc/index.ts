/**
 * plugins/custom/toc — 目录块([toc])
 */
export {
  MEDITOR_TOC_MDAST_TYPE,
  MEDITOR_TOC_NODE_NAME,
  remarkTocPlugin,
  tocSchema,
  tocRefreshPlugin,
  createTocNodeView,
  registerTocView,
  transformTocs,
  toc
} from './toc-plugin';
