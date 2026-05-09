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

  if (model.usage !== null) {
    lines.push('## Usage', '');
    lines.push('```bash');
    for (const command of model.usage.commands) {
      lines.push(command.command);
    }
    lines.push('```', '');
  }

  if (model.config !== null) {
    lines.push('## Configuration', '');
    lines.push(`Create a \`${model.config.configFile}\` file:`, '');
    lines.push('```ts');

    if (model.config.factoryName !== null) {
      lines.push(`import { ${model.config.factoryName} } from '${model.packageId}';`);
      lines.push('');
      lines.push(`export default ${model.config.factoryName}({`);
      lines.push('  // ...');
      lines.push('});');
    } else {
      lines.push(`import type { ${model.config.exportName} } from '${model.packageId}';`);
      lines.push('');
      lines.push('const config = {');
      lines.push('  // ...');
      lines.push(`} satisfies ${model.config.exportName};`);
      lines.push('');
      lines.push('export default config;');
    }

    lines.push('```', '');
  }

  lines.push('## Path resolution', '');
  lines.push(
    '- Config discovery: searches upward from `process.cwd()` for `paradox.config.ts/js/mjs/cjs` (required; no fallback).',
  );
  lines.push(
    '- Package root: defaults to the directory containing `paradox.config.*`; `package.root` (when relative) resolves relative to that directory.',
  );
  lines.push(
    '- Output directory: defaults to `paradox/`; `output.dir` (when relative) resolves relative to the resolved package root and must stay inside it.',
  );
  lines.push('- Modes:');
  lines.push('  - `safe`: writes generated artifacts only under the output directory');
  lines.push('  - `write`: additionally updates `<packageRoot>/README.md`', '');

  if (model.exports.length > 0) {
    lines.push('## Public API', '');

    for (const item of model.exports) {
      lines.push(`### ${item.name}`, '');
      lines.push(item.description ?? `\`${item.kind}\` export.`, '');
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function renderExports(model: DocumentationModel): string {
  const lines = ['# Public API', ''];

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
