import { collectPropsForExport } from '../analyzer/exports.js';
import type { AnalyzedProgram } from '../analyzer/model.js';
import type { AnalysisComponent, AnalysisExport } from './types.js';
import { getComponentPropsType } from './utils/getComponentPropsType.js';
import { getPropsFromType } from './utils/getPropsFromType.js';
import { isReactComponent } from './utils/isReactComponent.js';

/***
 * Extracts React components and their props from analyzed exports.
 */
export function analyzeComponents(
  exports: readonly AnalysisExport[],
  options: { program?: AnalyzedProgram } = {},
): AnalysisComponent[] {
  const components: AnalysisComponent[] = [];

  for (const e of exports) {
    if (!isReactComponent(e.node)) continue;

    const propsFromAnalyzer = options.program
      ? collectPropsForExport(options.program, { name: e.name, node: e.node })
      : undefined;
    const analyzerProps =
      propsFromAnalyzer?.members.map((member) => ({
        name: member.name,
        type: member.type,
        required: member.required,
        description: member.description ?? null,
      })) ?? [];
    const propsType = getComponentPropsType(e.node);
    const legacyProps = propsType != null ? getPropsFromType(propsType) : [];
    const props = analyzerProps.length > 0 ? analyzerProps : legacyProps;

    components.push({
      name: e.name,
      description: e.description,
      modulePath: e.modulePath,
      sourceLocation: e.sourceLocation,
      exportPaths: e.exportPaths,
      props,
    });
  }

  return components;
}
