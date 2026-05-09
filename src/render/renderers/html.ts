import type { DocumentationModel } from '../../model/types.js';
import type { DiagramArtifact, RenderContext } from '../types.js';

/***
 * Renders a deterministic static HTML documentation app.
 */
export function renderHtml({
  diagrams,
  model,
}: RenderContext): Pick<RenderContext['result'], 'indexHtml'> {
  const navigationItems = [
    ...model.exports.map((item) => ({
      href: `#symbol-${toAnchorId(item.name)}`,
      label: item.name,
      meta: `${item.kind} • ${item.modulePath}`,
    })),
    ...model.components.map((component) => ({
      href: `#component-${toAnchorId(component.name)}`,
      label: component.name,
      meta: `component • ${component.modulePath}`,
    })),
  ].sort((left, right) => left.label.localeCompare(right.label));

  const exportsByModule = groupBy(model.exports, (item) => item.modulePath);

  return {
    indexHtml: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(model.packageName)} • Paradox</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f5f7fb;
        color: #11203b;
      }
      * { box-sizing: border-box; }
      body { margin: 0; }
      a { color: #2459d3; text-decoration: none; }
      a:hover { text-decoration: underline; }
      code, pre { font-family: "SFMono-Regular", ui-monospace, SFMono-Regular, Menlo, monospace; }
      .layout {
        display: grid;
        grid-template-columns: minmax(16rem, 22rem) minmax(0, 1fr);
        min-height: 100vh;
      }
      .sidebar {
        padding: 1.5rem;
        border-right: 1px solid #d8dfec;
        background: #ffffff;
        position: sticky;
        top: 0;
        max-height: 100vh;
        overflow: auto;
      }
      .content {
        padding: 2rem;
      }
      .panel, .item {
        background: #ffffff;
        border: 1px solid #d8dfec;
        border-radius: 0.9rem;
        padding: 1rem 1.2rem;
        margin-bottom: 1rem;
        box-shadow: 0 8px 24px rgba(17, 32, 59, 0.06);
      }
      .summary {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      }
      .summary strong {
        display: block;
        font-size: 1.5rem;
      }
      .search {
        width: 100%;
        padding: 0.75rem 0.9rem;
        border-radius: 0.75rem;
        border: 1px solid #c7d2e5;
        margin: 1rem 0 1.5rem;
      }
      .nav-list, .meta-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .nav-list li + li { margin-top: 0.8rem; }
      .muted { color: #5e6d8c; }
      .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0; list-style: none; }
      .chip {
        border-radius: 999px;
        background: #e8eefb;
        color: #24427a;
        padding: 0.25rem 0.65rem;
        font-size: 0.85rem;
      }
      table { width: 100%; border-collapse: collapse; margin-top: 0.8rem; }
      th, td { padding: 0.6rem; border-bottom: 1px solid #e2e7f2; text-align: left; vertical-align: top; }
      pre {
        overflow: auto;
        border-radius: 0.75rem;
        background: #0f1729;
        color: #e7edf7;
        padding: 1rem;
      }
      .empty { font-style: italic; color: #6f7f9c; }
      @media (max-width: 900px) {
        .layout { grid-template-columns: 1fr; }
        .sidebar { position: static; max-height: none; border-right: 0; border-bottom: 1px solid #d8dfec; }
        .content { padding: 1rem; }
      }
    </style>
  </head>
  <body>
    <div class="layout">
      <aside class="sidebar">
        <p class="muted">Generated with Paradox</p>
        <h1>${escapeHtml(model.packageName)}</h1>
        <p>${escapeHtml(model.description ?? 'Deterministic package documentation.')}</p>
        <input id="search" class="search" type="search" placeholder="Search symbols, files, and metadata" />
        <ul class="nav-list">
          ${navigationItems
            .map(
              (item) =>
                `<li><a href="${escapeAttribute(item.href)}">${escapeHtml(item.label)}</a><div class="muted">${escapeHtml(item.meta)}</div></li>`,
            )
            .join('')}
        </ul>
      </aside>
      <main class="content">
        <section class="panel">
          <h2>Package overview</h2>
          <div class="summary">
            <div><strong>${model.exports.length}</strong><span class="muted">public exports</span></div>
            <div><strong>${model.components.length}</strong><span class="muted">components</span></div>
            <div><strong>${model.modules.length}</strong><span class="muted">modules</span></div>
            <div><strong>${model.entrypoints.length}</strong><span class="muted">entrypoints</span></div>
          </div>
          <h3>Entrypoints</h3>
          <ul class="meta-list">
            ${model.entrypoints.map((entrypoint) => `<li><code>${escapeHtml(entrypoint)}</code></li>`).join('')}
          </ul>
        </section>
        <section class="panel">
          <h2>Modules</h2>
          ${model.modules.map(renderModuleCard).join('')}
        </section>
        <section class="panel">
          <h2>Exports by module</h2>
          ${[...exportsByModule.entries()]
            .map(
              ([modulePath, exports]) => `
                <section>
                  <h3>${escapeHtml(modulePath)}</h3>
                  ${exports.map((item) => renderExportCard(item)).join('')}
                </section>`,
            )
            .join('')}
        </section>
        <section class="panel">
          <h2>Component registry</h2>
          ${model.components.length === 0 ? '<p class="empty">No components were detected.</p>' : model.components.map(renderComponentCard).join('')}
        </section>
        <section class="panel">
          <h2>Diagrams</h2>
          ${diagrams.map(renderDiagramCard).join('')}
        </section>
      </main>
    </div>
    <script>
      const search = document.getElementById('search');
      const items = Array.from(document.querySelectorAll('[data-search]'));
      search?.addEventListener('input', () => {
        const value = search.value.trim().toLowerCase();
        for (const item of items) {
          const haystack = (item.getAttribute('data-search') || '').toLowerCase();
          item.style.display = value === '' || haystack.includes(value) ? '' : 'none';
        }
      });
    </script>
  </body>
</html>
`,
  };
}

function renderModuleCard(module: DocumentationModel['modules'][number]): string {
  return `<article class="item" data-search="${escapeAttribute(
    [module.path, ...module.dependencies, ...module.exports].join(' '),
  )}">
    <h3>${escapeHtml(module.path)}</h3>
    <p class="muted">${module.isEntrypoint ? 'Configured entrypoint' : 'Referenced module'}</p>
    <p><strong>Dependencies:</strong> ${renderInlineCodeList(module.dependencies)}</p>
    <p><strong>Exports:</strong> ${renderInlineCodeList(module.exports)}</p>
  </article>`;
}

function renderExportCard(item: DocumentationModel['exports'][number]): string {
  return `<article class="item" id="symbol-${toAnchorId(item.name)}" data-search="${escapeAttribute(
    [
      item.name,
      item.kind,
      item.modulePath,
      item.description ?? '',
      ...item.relatedSymbols,
      ...item.signatures.map((signature) => signature.label),
    ].join(' '),
  )}">
    <h4>${escapeHtml(item.name)}</h4>
    <p class="muted">${escapeHtml(item.kind)} • <code>${escapeHtml(item.sourceLocation.filePath)}:${item.sourceLocation.line}:${item.sourceLocation.column}</code></p>
    ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
    <p><strong>Export paths:</strong> ${renderInlineCodeList(item.exportPaths)}</p>
    <p><strong>Related symbols:</strong> ${item.relatedSymbols.length > 0 ? renderChipList(item.relatedSymbols) : '<span class="empty">None</span>'}</p>
    ${item.signatures.length > 0 ? renderSignatureBlock(item) : ''}
    ${item.members.length > 0 ? renderMemberTable(item) : ''}
  </article>`;
}

function renderSignatureBlock(item: DocumentationModel['exports'][number]): string {
  return item.signatures
    .map(
      (signature) => `<div>
        <h5>Signature</h5>
        <pre>${escapeHtml(signature.label)}</pre>
        ${
          signature.parameters.length > 0
            ? `<table>
                <thead><tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                <tbody>
                  ${signature.parameters
                    .map(
                      (parameter) => `<tr>
                        <td><code>${escapeHtml(parameter.name)}</code></td>
                        <td><code>${escapeHtml(parameter.type)}</code></td>
                        <td>${parameter.required ? 'yes' : 'no'}</td>
                        <td>${escapeHtml(parameter.description ?? '')}</td>
                      </tr>`,
                    )
                    .join('')}
                </tbody>
              </table>`
            : ''
        }
        <p><strong>Returns:</strong> <code>${escapeHtml(signature.returnType ?? 'void')}</code>${
          signature.returnDescription ? ` — ${escapeHtml(signature.returnDescription)}` : ''
        }</p>
      </div>`,
    )
    .join('');
}

function renderMemberTable(item: DocumentationModel['exports'][number]): string {
  return `<table>
    <thead><tr><th>Member</th><th>Kind</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
    <tbody>
      ${item.members
        .map(
          (member) => `<tr>
            <td><code>${escapeHtml(member.name)}</code></td>
            <td>${escapeHtml(member.kind)}</td>
            <td><code>${escapeHtml(member.type)}</code></td>
            <td>${member.required ? 'yes' : 'no'}</td>
            <td>${escapeHtml(member.description ?? '')}</td>
          </tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
}

function renderComponentCard(component: DocumentationModel['components'][number]): string {
  return `<article class="item" id="component-${toAnchorId(component.name)}" data-search="${escapeAttribute(
    [
      component.name,
      component.modulePath,
      component.description ?? '',
      ...component.props.map((prop) => `${prop.name} ${prop.type}`),
    ].join(' '),
  )}">
    <h3>${escapeHtml(component.name)}</h3>
    <p class="muted"><code>${escapeHtml(component.sourceLocation.filePath)}:${component.sourceLocation.line}:${component.sourceLocation.column}</code></p>
    ${component.description ? `<p>${escapeHtml(component.description)}</p>` : ''}
    <p><strong>Export paths:</strong> ${renderInlineCodeList(component.exportPaths)}</p>
    <table>
      <thead><tr><th>Prop</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
      <tbody>
        ${component.props
          .map(
            (prop) => `<tr>
              <td><code>${escapeHtml(prop.name)}</code></td>
              <td><code>${escapeHtml(prop.type)}</code></td>
              <td>${prop.required ? 'yes' : 'no'}</td>
              <td>${escapeHtml(prop.description ?? '')}</td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </article>`;
}

function renderDiagramCard(diagram: DiagramArtifact): string {
  return `<article class="item" data-search="${escapeAttribute(`${diagram.title} ${diagram.path}`)}">
    <h3>${escapeHtml(diagram.title)}</h3>
    <p class="muted"><code>${escapeHtml(diagram.path)}</code></p>
    <pre>${escapeHtml(diagram.content)}</pre>
  </article>`;
}

function renderInlineCodeList(values: readonly string[]): string {
  if (values.length === 0) {
    return '<span class="empty">None</span>';
  }

  return values.map((value) => `<code>${escapeHtml(value)}</code>`).join(', ');
}

function renderChipList(values: readonly string[]): string {
  return `<ul class="chips">${values
    .map((value) => `<li class="chip">${escapeHtml(value)}</li>`)
    .join('')}</ul>`;
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const groupKey = key(item);
    const group = groups.get(groupKey);
    if (group) {
      group.push(item);
    } else {
      groups.set(groupKey, [item]);
    }
  }

  return new Map([...groups.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function toAnchorId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('\n', '&#10;');
}
