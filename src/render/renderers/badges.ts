import type { DocumentationModel, GeneratedBadge } from '../../model/types.js';
import type { BadgeArtifact } from '../types.js';

/***
 * Renders deterministic local SVG badges for repository metadata.
 */
export function renderBadgeArtifacts(model: DocumentationModel): BadgeArtifact[] {
  return model.badges.map((badge) => ({
    path: `badges/${badge.id}.svg`,
    content: renderBadgeSvg(badge),
  }));
}

function renderBadgeSvg(badge: GeneratedBadge): string {
  const labelWidth = getTextWidth(badge.label);
  const valueWidth = getTextWidth(badge.value);
  const totalWidth = labelWidth + valueWidth;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${escapeXml(
      `${badge.label}: ${badge.value}`,
    )}">`,
    `<title>${escapeXml(`${badge.label}: ${badge.value}`)}</title>`,
    `<rect width="${labelWidth}" height="20" fill="#374151"/>`,
    `<rect x="${labelWidth}" width="${valueWidth}" height="20" fill="#${badge.color}"/>`,
    `<text x="${labelWidth / 2}" y="14" fill="#ffffff" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">${escapeXml(
      badge.label,
    )}</text>`,
    `<text x="${labelWidth + valueWidth / 2}" y="14" fill="#ffffff" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">${escapeXml(
      badge.value,
    )}</text>`,
    '</svg>',
    '',
  ].join('');
}

function getTextWidth(value: string): number {
  return Math.max(38, value.length * 7 + 10);
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
