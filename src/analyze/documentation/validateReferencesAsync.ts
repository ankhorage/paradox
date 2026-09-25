import { access } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { validatePublicHttpsUrlAsync } from '@ankhorage/utility/node/http';
import { Node, type Project } from 'ts-morph';

import type { AnalysisDocumentationFinding } from '../types.js';
import type { CollectedDocumentationComment } from './collectDocumentationCommentsAsync.js';
import { createDocumentationFinding } from './findings.js';

/***
 * Validates external and executable references carried by documentation comments.
 */
export async function validateReferencesAsync(
  root: string,
  project: Project,
  comments: readonly CollectedDocumentationComment[],
): Promise<AnalysisDocumentationFinding[]> {
  const findings = await Promise.all(
    comments.map(async (comment) => [
      ...(await validateSeeReferencesAsync(comment)),
      ...(await validateSecurityReferencesAsync(root, project, comment)),
    ]),
  );
  return findings.flat();
}

/***
 * Validates every @see value through the canonical hardened public HTTPS utility.
 */
async function validateSeeReferencesAsync(
  comment: CollectedDocumentationComment,
): Promise<AnalysisDocumentationFinding[]> {
  const seeTags = comment.parsed.tags.filter((tag) => tag.name === 'see');
  const findings = await Promise.all(
    seeTags.map(async (tag): Promise<AnalysisDocumentationFinding[]> => {
      if (tag.value === null) {
        return [referenceFinding('documentation.see.value', '@see requires a URL.', comment)];
      }

      try {
        await validatePublicHttpsUrlAsync(tag.value);
        return [];
      } catch (error) {
        return [
          referenceFinding(
            'documentation.see.reachable',
            `@see target is not safely reachable: ${readErrorMessage(error)}`,
            comment,
          ),
        ];
      }
    }),
  );
  return findings.flat();
}

/***
 * Validates every @security reference against one exact colocated executable test.
 */
async function validateSecurityReferencesAsync(
  root: string,
  project: Project,
  comment: CollectedDocumentationComment,
): Promise<AnalysisDocumentationFinding[]> {
  const securityTags = comment.parsed.tags.filter((tag) => tag.name === 'security');
  return (
    await Promise.all(
      securityTags.map((tag) => validateSecurityReferenceAsync(root, project, comment, tag.value)),
    )
  ).flat();
}

/***
 * Resolves one colocated security test reference and requires exactly one matching test declaration.
 */
async function validateSecurityReferenceAsync(
  root: string,
  project: Project,
  comment: CollectedDocumentationComment,
  value: string | null,
): Promise<AnalysisDocumentationFinding[]> {
  const reference = parseSecurityReference(value);
  if (reference === null) {
    return [securityFinding('Invalid @security test reference.', comment)];
  }

  const testPath = join(root, dirname(comment.sourcePath), reference.fileName);
  if (!(await fileExistsAsync(testPath))) {
    return [securityFinding(`Missing colocated security test: ${reference.fileName}`, comment)];
  }

  const sourceFile = project.getSourceFile(testPath) ?? project.addSourceFileAtPath(testPath);
  const matches = sourceFile.getDescendants().filter((node) => isNamedTestCall(node, reference.testName));
  return matches.length === 1
    ? []
    : [
        securityFinding(
          `Expected exactly one test named "${reference.testName}" in ${reference.fileName}; found ${matches.length}.`,
          comment,
        ),
      ];
}

/***
 * Parses a same-directory test filename and exact test name from an @security value.
 */
function parseSecurityReference(
  value: string | null,
): { fileName: string; testName: string } | null {
  if (value === null) return null;
  const separator = value.indexOf('#');
  if (separator <= 0 || separator === value.length - 1) return null;

  const fileName = value.slice(0, separator).trim();
  const testName = value.slice(separator + 1).trim();
  if (basename(fileName) !== fileName || !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(fileName)) {
    return null;
  }
  return testName.length > 0 ? { fileName, testName } : null;
}

/***
 * Checks whether a ts-morph node is test()/it() with the exact static string name.
 */
function isNamedTestCall(node: Node, expectedName: string): boolean {
  if (!Node.isCallExpression(node)) return false;
  const callee = node.getExpression().getText();
  if (callee !== 'test' && callee !== 'it') return false;
  const [name] = node.getArguments();
  if (name === undefined) return false;
  if (!Node.isStringLiteral(name) && !Node.isNoSubstitutionTemplateLiteral(name)) return false;
  return name.getLiteralText() === expectedName;
}

/***
 * Creates the canonical security-reference finding at a comment location.
 */
function securityFinding(
  message: string,
  comment: CollectedDocumentationComment,
): AnalysisDocumentationFinding {
  return referenceFinding('documentation.security.reference', message, comment);
}

/***
 * Creates a reference finding at the owning comment location.
 */
function referenceFinding(
  ruleId: string,
  message: string,
  comment: CollectedDocumentationComment,
): AnalysisDocumentationFinding {
  return createDocumentationFinding(ruleId, message, comment.sourcePath, comment.line);
}

/***
 * Checks whether a referenced test file exists.
 */
async function fileExistsAsync(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/***
 * Converts an unknown thrown value into a stable diagnostic string.
 */
function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
