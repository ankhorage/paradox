import type { RenderContext } from '../../types/render.js';

/*** Renders linked avatars directly into the README when eligible contributors exist. */
export function renderCollaborators(
  context: RenderContext,
): Pick<RenderContext['result'], 'readme'> {
  if (context.model.collaborators === null || context.contributors.length === 0) {
    return { readme: context.result.readme };
  }

  const avatars = context.contributors.map(({ login, id }) => {
    const profile = encodeURIComponent(login);
    return `<a href="https://github.com/${profile}"><img src="https://avatars.githubusercontent.com/u/${id}?s=64" width="40" height="40" alt="${profile}" /></a>`;
  });
  return {
    readme: `${context.result.readme.trimEnd()}\n\n## Contributors\n\n${avatars.join('\n')}\n`,
  };
}
