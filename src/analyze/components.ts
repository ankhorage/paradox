import { collectPropsForExport } from './semantic/exports.js';
import type { AnalyzedProgram } from './semantic/model.js';
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

  for (const entry of exports) {
    if (!isReactComponent(entry.node)) continue;

    const propsFromAnalyzer = options.program
      ? collectPropsForExport(options.program, { name: entry.name, node: entry.node })
      : undefined;
    const analyzerProps =
      propsFromAnalyzer?.members.map((member) => ({
        name: member.name,
        type: member.type,
        required: member.required,
        ...(member.defaultValue !== undefined ? { defaultValue: member.defaultValue } : {}),
        description: member.description ?? null,
      })) ?? [];
    const propsType = getComponentPropsType(entry.node);
    const legacyProps = propsType != null ? getPropsFromType(propsType, options.program?.root) : [];
    const props = analyzerProps.length > 0 ? analyzerProps : legacyProps;

    components.push({
      name: entry.name,
      description: entry.description,
      isReadme: entry.isReadme,
      see: entry.see,
      security: entry.security,
      modulePath: entry.modulePath,
      sourceLocation: entry.sourceLocation,
      exportPaths: entry.exportPaths,
      props,
    });
  }

  return components;
}
