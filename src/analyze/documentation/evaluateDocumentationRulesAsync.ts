import { access } from 'node:fs/promises';
import { join } from 'node:path';

import { resolveRulesStatus, type RulesStatusDescriptor } from '@ankhorage/rules';
import {
  DOCUMENTATION_RULE_METADATA,
  evaluateDocumentation,
  type DocumentationCommentFact,
  type DocumentationPublicFunctionFact,
  type DocumentationRuleContext,
  type DocumentationTagFact,
  type DocumentationTagTarget,
} from '@ankhorage/rules-documentation';
import { Node, type Project } from 'ts-morph';

import type { AnalysisDocumentationFinding, AnalysisExport } from '../../types/analysis.js';
import { getParadoxComment } from '../utils/getParadoxComment.js';
import { collectDocumentationReferenceFactsAsync } from './collectDocumentationReferenceFactsAsync.js';
import type { CollectedDocumentationComment } from './collectDocumentationCommentsAsync.js';

export interface DocumentationRulesAnalysis {
  readonly findings: readonly AnalysisDocumentationFinding[];
  readonly status: RulesStatusDescriptor['status'];
}

/***
 * Collects Paradox-owned documentation facts and evaluates them through rules-documentation.
 */
export async function evaluateDocumentationRulesAsync(options: {
  root: string;
  project: Project;
  comments: readonly CollectedDocumentationComment[];
  exports: readonly AnalysisExport[];
  validateSeeUrlAsync?: (url: string) => Promise<unknown>;
}): Promise<DocumentationRulesAnalysis> {
  const context = await collectDocumentationRuleContextAsync(options);
  const result = evaluateDocumentation(context);

  return {
    findings: result.findings.map(toAnalysisFinding),
    status: resolveRulesStatus(result).status,
  };
}

/***
 * Builds the portable documentation context while keeping AST, filesystem, and network I/O local.
 */
async function collectDocumentationRuleContextAsync(options: {
  root: string;
  project: Project;
  comments: readonly CollectedDocumentationComment[];
  exports: readonly AnalysisExport[];
  validateSeeUrlAsync?: (url: string) => Promise<unknown>;
}): Promise<DocumentationRuleContext> {
  const references = await collectDocumentationReferenceFactsAsync(
    options.root,
    options.project,
    options.comments,
    { validateSeeUrlAsync: options.validateSeeUrlAsync },
  );
  const configExists = await fileExistsAsync(
    join(options.root, DOCUMENTATION_RULE_METADATA.paths.configSchema),
  );

  return {
    comments: options.comments.map((comment) =>
      toCommentFact(options.root, options.project, comment),
    ),
    files: configExists ? [DOCUMENTATION_RULE_METADATA.paths.configSchema] : [],
    publicFunctions: toPublicFunctionFacts(options.exports),
    securityReferences: references.securityReferences,
    seeReferences: references.seeReferences,
  };
}

/***
 * Converts one parsed Paradox comment into the provider's parser-neutral fact shape.
 */
function toCommentFact(
  root: string,
  project: Project,
  comment: CollectedDocumentationComment,
): DocumentationCommentFact {
  const target = resolveCommentTarget(root, project, comment);
  const supportedTags: DocumentationTagFact[] = comment.parsed.tags.map((tag) => ({
    name: tag.name,
    target,
    ...(tag.value === null ? {} : { value: tag.value }),
  }));
  const unsupportedTags: DocumentationTagFact[] = comment.parsed.unsupportedTags.map((name) => ({
    name,
    target,
  }));

  return {
    description: comment.parsed.description ?? '',
    hasCodeBlock: comment.parsed.hasCodeBlock,
    line: comment.line,
    path: comment.sourcePath,
    tags: [...supportedTags, ...unsupportedTags],
  };
}

/***
 * Resolves the declaration kind that owns one raw Paradox comment.
 */
function resolveCommentTarget(
  root: string,
  project: Project,
  comment: CollectedDocumentationComment,
): DocumentationTagTarget {
  const sourcePath = join(root, comment.sourcePath);
  const sourceFile = project.getSourceFile(sourcePath) ?? project.addSourceFileAtPath(sourcePath);
  const statement = sourceFile
    .getStatements()
    .find((candidate) => getParadoxComment(candidate) === comment.raw);

  if (Node.isInterfaceDeclaration(statement)) return 'interface';
  if (Node.isTypeAliasDeclaration(statement)) return 'type';
  return statement === undefined ? 'block' : 'symbol';
}

/***
 * Projects analyzed callable exports into provider facts without re-reading source files.
 */
function toPublicFunctionFacts(
  exports: readonly AnalysisExport[],
): readonly DocumentationPublicFunctionFact[] {
  return exports.flatMap((entry) =>
    entry.signatures.length === 0
      ? []
      : [
          {
            description: entry.description ?? '',
            line: entry.sourceLocation.line,
            name: entry.name,
            path: entry.sourceLocation.filePath,
          },
        ],
  );
}

/***
 * Maps generic Rule findings back to Paradox's serializable analysis model.
 */
function toAnalysisFinding(
  finding: ReturnType<typeof evaluateDocumentation>['findings'][number],
): AnalysisDocumentationFinding {
  return {
    ruleId: finding.ruleId,
    severity: finding.severity,
    message: finding.message,
    sourcePath: finding.sourceLocation?.path ?? null,
    line: finding.sourceLocation?.line ?? null,
  };
}

/***
 * Checks whether one canonical documentation path exists.
 */
async function fileExistsAsync(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
