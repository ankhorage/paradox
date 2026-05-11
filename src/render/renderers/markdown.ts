import type { DocumentationModel } from '../../model/types.js';
import type { RenderContext } from '../types.js';

type ConfigMembers = NonNullable<DocumentationModel['config']>['members'];

/***
 * Renders markdown artifacts from the documentation model.
 */
export function renderMarkdown({
  badges,
  diagrams,
  model,
  outputDir,
}: RenderContext): Pick<RenderContext['result'], 'components' | 'exportsMarkdown' | 'readme'> {
  return {
    readme: renderReadme(model, outputDir, badges, diagrams),
    exportsMarkdown: renderExports(model),
    components: renderComponents(model),
  };
}

function renderReadme(
  model: DocumentationModel,
  outputDir: string,
  badges: RenderContext['badges'],
  diagrams: RenderContext['diagrams'],
): string {
  const lines = [`# ${model.packageName}`, ''];

  if (badges.length > 0) {
    lines.push(
      badges
        .map((badge) => `![${badgeLabel(model, badge.path)}](./${outputDir}/${badge.path})`)
        .join(' '),
      '',
    );
  }

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

  const { config } = model;

  if (config !== null) {
    lines.push('## Configuration', '');
    lines.push(`Create a \`${config.configFile}\` file:`, '');
    lines.push('```ts');

    if (config.factoryName !== null) {
      lines.push(`import { ${config.factoryName} } from '${model.packageId}';`);
      lines.push('');
      lines.push(`export default ${config.factoryName}({`);
      lines.push('  // ...');
      lines.push('});');
    } else {
      lines.push(`import type { ${config.exportName} } from '${model.packageId}';`);
      lines.push('');
      lines.push('const config = {');
      lines.push('  // ...');
      lines.push(`} satisfies ${config.exportName};`);
      lines.push('');
      lines.push('export default config;');
    }

    lines.push('```', '');

    if (config.members.length > 0) {
      lines.push('### Configuration options', '');
      lines.push('| Field | Type | Required | Default | Description |');
      lines.push('| --- | --- | --- | --- | --- |');

      for (const member of flattenConfigMembers(config.members)) {
        lines.push(
          `| ${escapeTableCell(member.path)} | \`${escapeTableCell(member.type)}\` | ${
            member.required ? 'yes' : 'no'
          } | ${escapeTableCell(member.defaultValue ?? '')} | ${escapeTableCell(
            member.description ?? '',
          )} |`,
        );
      }

      lines.push('');
    }
  }

  lines.push('## Generated documentation', '');
  lines.push(`- [Interactive documentation app](./${outputDir}/index.html)`);
  lines.push(`- [Public API reference](./${outputDir}/exports.md)`);
  lines.push(`- [Component registry](./${outputDir}/components.md)`);
  for (const diagram of diagrams) {
    lines.push(`- [${diagram.title}](./${outputDir}/${diagram.path})`);
  }
  lines.push('');

  lines.push('## Architecture preview', '');
  if (diagrams.length > 0) {
    lines.push('```mermaid');
    lines.push(diagrams[0].content.trimEnd());
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
      lines.push(`- Kind: \`${item.kind}\``);
      lines.push(`- Module: \`${item.modulePath}\``);
      lines.push(
        `- Source: \`${item.sourceLocation.filePath}:${item.sourceLocation.line}:${item.sourceLocation.column}\``,
      );
      lines.push(`- Export paths: ${item.exportPaths.map((path) => `\`${path}\``).join(', ')}`);
      if (item.relatedSymbols.length > 0) {
        lines.push(
          `- Related symbols: ${item.relatedSymbols.map((symbol) => `\`${symbol}\``).join(', ')}`,
        );
      }
      lines.push('');
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function renderExports(model: DocumentationModel): string {
  const lines = ['# Public API', ''];

  for (const item of model.exports) {
    lines.push(`## ${item.name}`, '');
    lines.push(`Kind: \`${item.kind}\``);
    lines.push(`Module: \`${item.modulePath}\``);
    lines.push(
      `Source: \`${item.sourceLocation.filePath}:${item.sourceLocation.line}:${item.sourceLocation.column}\``,
      '',
    );

    if (item.description) {
      lines.push(item.description, '');
    }

    if (item.signatures.length > 0) {
      lines.push('### Signatures', '');
      for (const signature of item.signatures) {
        lines.push(`- \`${signature.label}\``);
        for (const parameter of signature.parameters) {
          lines.push(
            `  - ${parameter.name}: \`${parameter.type}\`${parameter.required ? '' : ' (optional)'}${
              parameter.description ? ` — ${parameter.description}` : ''
            }`,
          );
        }
        lines.push(
          `  - returns: \`${signature.returnType ?? 'void'}\`${
            signature.returnDescription ? ` — ${signature.returnDescription}` : ''
          }`,
        );
      }
      lines.push('');
    }

    if (item.members.length > 0) {
      lines.push('### Members', '');
      lines.push('| Name | Kind | Type | Required | Description |');
      lines.push('| --- | --- | --- | --- | --- |');
      for (const member of item.members) {
        lines.push(
          `| ${escapeTableCell(member.name)} | ${member.kind} | \`${escapeTableCell(
            member.type,
          )}\` | ${member.required ? 'yes' : 'no'} | ${escapeTableCell(member.description ?? '')} |`,
        );
      }
      lines.push('');
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function renderComponents(model: DocumentationModel): string {
  const lines = ['# Components', ''];

  for (const component of model.components) {
    lines.push(`## ${component.name}`, '');
    lines.push(
      `Source: \`${component.sourceLocation.filePath}:${component.sourceLocation.line}:${component.sourceLocation.column}\``,
      '',
    );

    if (component.description) {
      lines.push(component.description, '');
    }

    if (component.exportPaths.length > 0) {
      lines.push(
        `Export paths: ${component.exportPaths.map((path) => `\`${path}\``).join(', ')}`,
        '',
      );
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

function flattenConfigMembers(
  members: ConfigMembers,
  prefix = '',
): {
  path: string;
  type: string;
  required: boolean;
  description: string | null;
  defaultValue?: string;
}[] {
  return members.flatMap((member) => {
    const path = prefix ? `${prefix}.${member.name}` : member.name;
    const current = {
      path,
      type: member.type,
      required: member.required,
      description: member.description,
      defaultValue: member.defaultValue,
    };
    const children = member.children ? flattenConfigMembers(member.children, path) : [];
    return [current, ...children];
  });
}

function badgeLabel(model: DocumentationModel, badgePath: string): string {
  const fileName = badgePath.split('/').pop();
  if (!fileName) {
    return badgePath;
  }

  const id = fileName.replace(/\.svg$/, '');
  const badge = model.badges.find((entry) => entry.id === id);

  return badge ? `${badge.label}: ${badge.value}` : badgePath;
}
