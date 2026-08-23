import type { RenderContext } from '../types.js';

export function renderDonation(
  context: RenderContext,
): Pick<RenderContext['result'], 'indexHtml' | 'readme'> {
  const { donation } = context.model;
  if (donation === null) {
    return { indexHtml: context.result.indexHtml, readme: context.result.readme };
  }

  const { account } = donation;
  return {
    readme: renderDonationReadme(context.result.readme, account),
    indexHtml: renderDonationHtml(context.result.indexHtml, account),
  };
}

function renderDonationHtml(indexHtml: string, account: string): string {
  const mainEnd = indexHtml.indexOf('\n      </main>');
  const homeStart = indexHtml.indexOf('<section id="view-home"');
  const homeEnd = indexHtml.lastIndexOf('\n        </section>', mainEnd);
  if (mainEnd < 0 || homeStart < 0 || homeEnd < homeStart) {
    throw new Error('Unable to locate Paradox HTML home view for Donation rendering.');
  }

  const panel = [
    '          <section class="panel" data-search="donation sponsor support">',
    '            <h2>Donation</h2>',
    '            <p>If this project is useful to you, you can support its continued development.</p>',
    `            <p><a href="https://github.com/sponsors/${account}">Support @${account}</a></p>`,
    '          </section>',
  ].join('\n');

  return `${indexHtml.slice(0, homeEnd)}\n${panel}${indexHtml.slice(homeEnd)}`;
}

function renderDonationReadme(readme: string, account: string): string {
  return `${readme.trimEnd()}\n\n## Donation\n\nIf this project is useful to you, you can support its continued development.\n\n[Support @${account}](https://github.com/sponsors/${account})\n`;
}
