import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

async function replaceOnce(path, oldValue, newValue) {
  const source = await readFile(path, 'utf8');
  if (!source.includes(oldValue)) throw new Error(`Expected snippet not found in ${path}`);
  await writeFile(path, source.replace(oldValue, newValue));
}

async function replaceRegion(path, startMarker, endMarker, replacement) {
  const source = await readFile(path, 'utf8');
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Start marker not found in ${path}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`End marker not found in ${path}`);
  await writeFile(path, `${source.slice(0, start)}${replacement}${source.slice(end)}`);
}

await replaceOnce(
  'src/render/renderers/markdown.ts',
  `  if (model.usage !== null) {\n    lines.push('## Installation', '', '\`\`\`bash');\n    for (const command of model.usage.commands) lines.push(command.command);\n    lines.push('\`\`\`', '');\n  }\n\n  renderCliScenarios(lines, model, outputDir, diagrams);\n`,
  `  renderReadmeCli(lines, model, outputDir, diagrams);\n`,
);

await replaceRegion(
  'src/render/renderers/markdown.ts',
  'function renderCliScenarios(',
  'function findScenarioDiagram(',
  `function renderReadmeCli(\n  lines: string[],\n  model: DocumentationModel,\n  outputDir: string,\n  diagrams: RenderContext['diagrams'],\n): void {\n  if (model.readmeCli === null) return;\n\n  lines.push('## CLI', '');\n\n  if (model.readmeCli.description !== null) lines.push(model.readmeCli.description, '');\n\n  if (model.usage !== null && model.usage.commands.length > 0) {\n    lines.push('\`\`\`bash');\n    for (const command of model.usage.commands) lines.push(command.command);\n    lines.push('\`\`\`', '');\n  }\n\n  const scenarios = model.sequenceScenarios.filter((scenario) => scenario.kind === 'bin');\n  for (const scenario of scenarios) {\n    const diagram = findScenarioDiagram(diagrams, scenario);\n    if (scenario.description === null && diagram === undefined) continue;\n\n    lines.push('<details>');\n    lines.push(\`<summary>\${scenario.name}</summary>\`, '');\n    if (scenario.description !== null) lines.push(scenario.description, '');\n\n    if (diagram !== undefined) {\n      lines.push(\`Diagram: [\${diagram.title}](./\${outputDir}/\${diagram.path})\`, '');\n      lines.push('\`\`\`mermaid');\n      lines.push(diagram.content.trimEnd());\n      lines.push('\`\`\`', '');\n    }\n\n    lines.push('</details>', '');\n  }\n}\n\n`,
);

await replaceOnce(
  'src/render/renderers/html.ts',
  "${cliScenarios.length > 0 ? renderCliPanel(model, diagrams, cliScenarios) : ''}",
  "${model.readmeCli !== null ? renderCliPanel(model, diagrams, cliScenarios) : ''}",
);

await replaceRegion(
  'src/render/renderers/html.ts',
  'function renderCliPanel(',
  '/***\n * Renders one source file entry in the left navigation.',
  `function renderCliPanel(\n  model: DocumentationModel,\n  diagrams: readonly DiagramArtifact[],\n  scenarios: readonly SequenceScenarioEntry[],\n): string {\n  const commands = model.usage?.commands ?? [];\n  const searchText = [\n    'cli',\n    model.readmeCli?.description ?? '',\n    ...commands.map((command) => command.command),\n    ...scenarios.map((scenario) => scenario.name),\n  ].join(' ');\n\n  return \`<section class="panel" data-search="\${escapeAttribute(searchText)}">\n    <h2>CLI</h2>\n    \${model.readmeCli?.description === null || model.readmeCli?.description === undefined ? '' : \`<p>\${escapeHtml(model.readmeCli.description)}</p>\`}\n    \${commands.length === 0 ? '' : \`<pre>\${escapeHtml(commands.map((command) => command.command).join('\\n'))}</pre>\`}\n    \${scenarios\n      .map((scenario) => {\n        const diagram = findScenarioDiagram(diagrams, scenario);\n        if (scenario.description === null && diagram === undefined) return '';\n\n        return \`<article class="item" data-search="\${escapeAttribute(\n          [scenario.name, scenario.description ?? ''].join(' '),\n        )}">\n          <h3>\${escapeHtml(scenario.name)}</h3>\n          \${scenario.description === null ? '' : \`<p>\${escapeHtml(scenario.description)}</p>\`}\n          \${diagram === undefined ? '' : renderDiagramCard(diagram)}\n        </article>\`;\n      })\n      .join('')}\n  </section>\`;\n}\n\n/***\n * Renders one source file entry in the left navigation.\n`,
);

await replaceRegion(
  'src/render/renderers/html.ts',
  'function getReadmeCliScenarios(',
  '/***\n * Finds the generated Mermaid artifact for a sequence scenario.',
  `function getReadmeCliScenarios(model: DocumentationModel): SequenceScenarioEntry[] {\n  if (model.readmeCli === null) return [];\n  return model.sequenceScenarios.filter((scenario) => scenario.kind === 'bin');\n}\n\n/***\n * Finds the generated Mermaid artifact for a sequence scenario.\n`,
);

await writeFile(
  'src/cli/index.ts',
  `/***\n * Generates deterministic documentation for a package through the Paradox CLI.\n *\n * @readme\n */\nexport { default } from '../docsSurface.js';\n`,
);

await replaceOnce('src/cli/standalone.ts', ' *\n * @readme\n */', ' */');
await replaceOnce(
  'src/analyze/usage.ts',
  ' * Builds installation and executable usage commands from package metadata.',
  ' * Builds executable CLI commands from package metadata.',
);

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
packageJson.devDependencies['@types/node'] = '^25.6.0';
await writeFile('package.json', `${JSON.stringify(packageJson, null, 2)}\n`);

const fixturePath = 'tests/fixtures/multi-bin/src/cli/index.ts';
await mkdir(dirname(fixturePath), { recursive: true });
await writeFile(
  fixturePath,
  `/***\n * Runs the fixture command-line interface.\n *\n * @readme\n */\nexport {};\n`,
);

await replaceOnce(
  'tests/analyze.test.ts',
  "    expect(output.readme).toContain('## Configuration');\n",
  "    expect(output.readme).toContain('## Configuration');\n    expect(output.readme).not.toContain('## Installation');\n    expect(output.readme).not.toContain('## CLI');\n",
);
await replaceOnce(
  'tests/analyze.test.ts',
  "    expectGeneratedReadmeScaffold(output.readme, 'Multi Bin Fixture');\n    expect(output.readme).toContain('bunx fixture-multi-bin alpha');\n",
  "    expectGeneratedReadmeScaffold(output.readme, 'Multi Bin Fixture');\n    expect(output.readme).toContain('## CLI');\n    expect(output.readme).toContain('Runs the fixture command-line interface.');\n    expect(output.readme).not.toContain('## Installation');\n    expect(output.readme).toContain('bunx fixture-multi-bin alpha');\n",
);

await writeFile(
  'tests/readmeCli.test.ts',
  `import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';\nimport { tmpdir } from 'node:os';\nimport { join } from 'node:path';\n\nimport { describe, expect, test } from 'bun:test';\n\nimport { analyzeReadmeCli } from '../src/analyze/readmeCli.js';\n\ndescribe('README CLI analysis', () => {\n  test('returns null when the canonical CLI entrypoint does not exist', async () => {\n    const root = await mkdtemp(join(tmpdir(), 'paradox-readme-cli-'));\n    try {\n      expect(await analyzeReadmeCli(root)).toBeNull();\n    } finally {\n      await rm(root, { recursive: true, force: true });\n    }\n  });\n\n  test('requires @readme in the leading comment of src/cli/index.ts', async () => {\n    const root = await createCliFixture('/***\\n * CLI docs.\\n */\\nexport {};\\n');\n    try {\n      expect(await analyzeReadmeCli(root)).toBeNull();\n    } finally {\n      await rm(root, { recursive: true, force: true });\n    }\n  });\n\n  test('uses the leading @readme comment as CLI chapter metadata', async () => {\n    const root = await createCliFixture('/***\\n * CLI docs.\\n *\\n * @readme\\n */\\nexport {};\\n');\n    try {\n      expect(await analyzeReadmeCli(root)).toEqual({\n        description: 'CLI docs.',\n        sourcePath: 'src/cli/index.ts',\n      });\n    } finally {\n      await rm(root, { recursive: true, force: true });\n    }\n  });\n});\n\nasync function createCliFixture(source: string): Promise<string> {\n  const root = await mkdtemp(join(tmpdir(), 'paradox-readme-cli-'));\n  const cliRoot = join(root, 'src', 'cli');\n  await mkdir(cliRoot, { recursive: true });\n  await writeFile(join(cliRoot, 'index.ts'), source);\n  return root;\n}\n`,
);

await writeFile(
  '.changeset/source-driven-cli-readme.md',
  `---\n'@ankhorage/paradox': patch\n---\n\nGenerate the README CLI chapter from the canonical \`src/cli/index.ts\` \`@readme\` opt-in, keep executable commands under CLI instead of Installation, and declare the required Node.js types dependency.\n`,
);
