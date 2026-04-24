import type { DocumentationModel } from '../model/types.js';
import type { RenderResult } from './types.js';

/***
 * Renders the documentation model into README and artifact files.
 */
export function render(model: DocumentationModel): RenderResult {
  return {
    readme: renderReadme(model),
    exportsMarkdown: renderExports(model),
    components: renderComponents(model),
    exportsJson: `${JSON.stringify(model.exports, null, 2)}\n`,
    paradoxJson: `${JSON.stringify(model, null, 2)}\n`,
  };
}

function renderReadme(model: DocumentationModel): string {
  const lines = [`# ${model.packageName}`, ''];

  if (model.description) {
    lines.push(model.description, '');
  }

  if (model.exports.length > 0) {
    lines.push('## Package Exports', '');

    for (const item of model.exports) {
      lines.push(`### ${item.name}`, '');
      lines.push(item.description ?? `\`${item.kind}\` export.`, '');
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function renderExports(model: DocumentationModel): string {
  const lines = ['# Package Exports', ''];

  for (const item of model.exports) {
    lines.push(`## ${item.name}`, '');
    lines.push(`Kind: \`${item.kind}\``, '');

    if (item.description) {
      lines.push(item.description, '');
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function renderComponents(model: DocumentationModel): string {
  const lines = ['# Components', ''];

  for (const component of model.components) {
    lines.push(`## ${component.name}`, '');

    if (component.description) {
      lines.push(component.description, '');
    }

    if (component.props.length > 0) {
      lines.push('| Prop | Type | Required | Description |');
      lines.push('| --- | --- | --- | --- |');

      for (const prop of component.props) {
        lines.push(
          `| ${escapeTableCell(prop.name)} | \`${escapeTableCell(prop.type)}\` | ${
            prop.required ? 'yes' : 'no'
          } | ${escapeTableCell(prop.description ?? '')} |`,
        );
      }

      lines.push('');
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function escapeTableCell(value: string): string {
  return value.replaceAll('|', '\\|');
}
