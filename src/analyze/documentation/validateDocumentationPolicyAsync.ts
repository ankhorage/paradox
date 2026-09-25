import { access } from 'node:fs/promises';
import { join } from 'node:path';

import { DOCUMENTATION_POLICY } from '@ankhorage/policy/documentation';
import { Node, type Project } from 'ts-morph';

import type {
  AnalysisDocumentationFinding,
  AnalysisExport,
  AnalysisUsageEntry,
} from '../types.js';
import { getParadoxComment } from '../utils/getParadoxComment.js';
import { parseParadoxComment } from '../utils/parseParadoxComment.js';
import type { CollectedDocumentationComment } from './collectDocumentationCommentsAsync.js';
import { createDocumentationFinding } from './findings.js';
import { validateReferencesAsync } from './validateReferencesAsync.js';

/***
 * Evaluates package documentation evidence against the canonical Ankhorage documentation policy.
 */
export async function validateDocumentationPolicyAsync(options: {
  root: string;
  project: Project;
  comments: readonly CollectedDocumentationComment[];
  usageEntries: readonly AnalysisUsageEntry[];
  exports: readonly AnalysisExport[];
}): Promise<AnalysisDocumentationFinding[]> {
  return [
    ...validateCommentRules(options.comments),
    ...validateUsageRules(options.comments),
    ...(await validateConfigRulesAsync(options.root, options.project)),
    ...validatePublicApiRules(options.exports),
    ...(await validateReferencesAsync(options.root, options.project, options.comments)),
  ];
}

/***
 * Validates generic comment syntax rules shared by all documentation contexts.
 */
function validateCommentRules(
  comments: readonly CollectedDocumentationComment[],
): AnalysisDocumentationFinding[] {
  return comments.flatMap((comment) => {
    const unsupported = comment.parsed.unsupportedTags.map((tag) =>
      finding(
        'documentation.comment.tag.unsupported',
        `Unsupported Paradox tag: @${tag}`,
        comment,
      ),
    );
    const code = comment.parsed.hasCodeBlock
      ? [
          finding(
            'documentation.comment.code-block',
            'Paradox comments must not contain code blocks.',
            comment,
          ),
        ]
      : [];
    return [...unsupported, ...code];
  });
}

/***
 * Validates canonical usage locations and the single README-promoted programmatic example.
 */
function validateUsageRules(
  comments: readonly CollectedDocumentationComment[],
): AnalysisDocumentationFinding[] {
  const usageComments = comments.filter((comment) => comment.parsed.isUsage);
  const findings = usageComments.flatMap((comment) => validateUsageComment(comment));
  const readmeExamples = usageComments.filter(
    (comment) =>
      isBelow(comment.sourcePath, DOCUMENTATION_POLICY.paths.examplesRoot) &&
      comment.parsed.isReadme,
  );

  if (readmeExamples.length !== DOCUMENTATION_POLICY.readmeUsage.exactCount) {
    findings.push(
      createDocumentationFinding(
        'documentation.usage.readme.unique',
        `Expected exactly one @usage + @readme example; found ${readmeExamples.length}.`,
      ),
    );
  }

  for (const comment of readmeExamples) {
    if (comment.parsed.title === null || comment.parsed.description === null) {
      findings.push(
        finding(
          'documentation.usage.readme.metadata',
          'README usage requires non-empty @title and prose.',
          comment,
        ),
      );
    }
  }

  return findings;
}

/***
 * Validates one usage comment location and forbidden CLI README promotion.
 */
function validateUsageComment(
  comment: CollectedDocumentationComment,
): AnalysisDocumentationFinding[] {
  const allowed = DOCUMENTATION_POLICY.paths.usageRoots.some((root) =>
    isBelow(comment.sourcePath, root),
  );
  const location = allowed
    ? []
    : [
        finding(
          'documentation.usage.location',
          '@usage is allowed only below examples/** or src/cli/**.',
          comment,
        ),
      ];
  const cliReadme =
    isBelow(comment.sourcePath, DOCUMENTATION_POLICY.paths.cliRoot) && comment.parsed.isReadme
      ? [
          finding(
            'documentation.usage.readme.cli',
            '@usage + @readme is not allowed below src/cli/**.',
            comment,
          ),
        ]
      : [];
  return [...location, ...cliReadme];
}

/***
 * Validates the canonical configuration file and its one README configuration root.
 */
async function validateConfigRulesAsync(
  root: string,
  project: Project,
): Promise<AnalysisDocumentationFinding[]> {
  const configPath = join(root, DOCUMENTATION_POLICY.config.path);
  if (!(await fileExistsAsync(configPath))) {
    return [
      createDocumentationFinding(
        'documentation.config.file',
        `Missing canonical config schema: ${DOCUMENTATION_POLICY.config.path}`,
      ),
    ];
  }

  const sourceFile = project.getSourceFile(configPath) ?? project.addSourceFileAtPath(configPath);
  const roots = sourceFile.getStatements().flatMap((statement) => {
    if (!Node.isInterfaceDeclaration(statement) && !Node.isTypeAliasDeclaration(statement)) {
      return [];
    }
    const raw = getParadoxComment(statement);
    if (raw === null) return [];
    const parsed = parseParadoxComment(raw);
    return parsed.isConfig && parsed.isReadme ? [{ statement, parsed }] : [];
  });
  const findings: AnalysisDocumentationFinding[] = [];

  if (roots.length !== DOCUMENTATION_POLICY.config.exactCount) {
    findings.push(
      createDocumentationFinding(
        'documentation.config.readme.unique',
        `Expected exactly one @config + @readme root in ${DOCUMENTATION_POLICY.config.path}; found ${roots.length}.`,
        DOCUMENTATION_POLICY.config.path,
      ),
    );
  }

  for (const rootEntry of roots) {
    if (rootEntry.parsed.title === null || rootEntry.parsed.description === null) {
      findings.push(
        createDocumentationFinding(
          'documentation.config.readme.metadata',
          'README configuration requires non-empty @title and prose.',
          DOCUMENTATION_POLICY.config.path,
          rootEntry.statement.getStartLineNumber(),
        ),
      );
    }
  }

  return findings;
}

/***
 * Warns when a public callable export has no Paradox description.
 */
function validatePublicApiRules(
  exports: readonly AnalysisExport[],
): AnalysisDocumentationFinding[] {
  return exports.flatMap((entry) =>
    entry.signatures.length > 0 && entry.description === null
      ? [
          createDocumentationFinding(
            'documentation.public-function.description',
            `Public function ${entry.name} has no Paradox description.`,
            entry.sourceLocation.filePath,
            entry.sourceLocation.line,
          ),
        ]
      : [],
  );
}

/***
 * Creates a finding at one collected comment location.
 */
function finding(
  ruleId: string,
  message: string,
  comment: CollectedDocumentationComment,
): AnalysisDocumentationFinding {
  return createDocumentationFinding(ruleId, message, comment.sourcePath, comment.line);
}

/***
 * Checks whether a source path is contained in one canonical root.
 */
function isBelow(sourcePath: string, root: string): boolean {
  return sourcePath === root || sourcePath.startsWith(`${root}/`);
}

/***
 * Checks whether a required canonical file exists.
 */
async function fileExistsAsync(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
