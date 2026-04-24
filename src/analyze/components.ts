import type { AnalysisComponent, AnalysisExport } from './types.js';
import { getComponentPropsType } from './utils/getComponentPropsType.js';
import { getPropsFromType } from './utils/getPropsFromType.js';
import { isReactComponent } from './utils/isReactComponent.js';

/***
 * Extracts React components and their props from analyzed exports.
 */
export function analyzeComponents(exports: readonly AnalysisExport[]): AnalysisComponent[] {
  const components: AnalysisComponent[] = [];

  for (const e of exports) {
    if (!isReactComponent(e.node)) continue;

    const propsType = getComponentPropsType(e.node);

    const props = propsType != null ? getPropsFromType(propsType) : [];

    components.push({
      name: e.name,
      description: e.description,
      props,
    });
  }

  return components;
}
