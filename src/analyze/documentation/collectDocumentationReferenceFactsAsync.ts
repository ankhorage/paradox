import { access } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import {
  DOCUMENTATION_RULE_METADATA,
  type DocumentationSecurityReferenceFact,
  type DocumentationSeeReferenceFact,
} from '@ankhorage/rules-documentation';
import { validatePublicHttpsUrlAsync } from '@ankhorage/utility/node/http';
import { Node, type Project } from 'ts-morph';

import type { CollectedDocumentationComment } from './collectDocumentationCommentsAsync.js';

type SeeUrlValidator = (url: string) => Promise<unknown>;

export interface DocumentationReferenceFacts {
  readonly securityReferences: readonly DocumentationSecurityReferenceFact[];
  readonly seeReferences: readonly DocumentationSeeReferenceFact[];
}

/***
 * Collects external-reference and executable-test facts without deciding rule outcomes.
 */
export async function collectDocumentationReferenceFactsAsync(
  root: string,
  project: Project,
  comments: readonly CollectedDocumentationComment[],
  options: { validateSeeUrlAsync?: SeeUrlValidator } = {},
): Promise<DocumentationReferenceFacts> {
  const validateSeeUrlAsync = options.validateSeeUrlAsync ?? validatePublicHttpsUrlAsync;
  const facts = await Promise.all(
    comments.map(async (comment) => ({
      seeReferences: await collectSeeFactsAsync(comment, validateSeeUrlAsync),
      securityReferences: await collectSecurityFactsAsync(root, project, comment),
    })),
  );

  return {
    seeReferences: facts.flatMap(({ seeReferences }) => seeReferences),
    securityReferences: facts.flatMap(({ securityReferences }) => securityReferences),
  };
}

/***
 * Collects reachability evidence only for syntactically safe public-HTTPS candidates.
 */
async function collectSeeFactsAsync(
  comment: CollectedDocumentationComment,
  validateSeeUrlAsync: SeeUrlValidator,
): Promise<readonly DocumentationSeeReferenceFact[]> {
  const values = comment.parsed.tags
    .filter((tag) => tag.name === 'see')
    .flatMap((tag) => normalizeSeeUrl(tag.value));

  return Promise.all(
    values.map(async (url): Promise<DocumentationSeeReferenceFact> => {
      try {
        await validateSeeUrlAsync(url);
        return {
          path: comment.sourcePath,
          publicNetworkTarget: true,
          reachable: true,
          url,
        };
      } catch {
        return {
          path: comment.sourcePath,
          publicNetworkTarget: false,
          reachable: false,
          url,
        };
      }
    }),
  );
}

/***
 * Normalizes a syntactically safe @see value without performing network I/O.
 */
function normalizeSeeUrl(value: string | null): readonly string[] {
  if (value === null) return [];

  try {
    const url = new URL(value);
    if (url.protocol !== DOCUMENTATION_RULE_METADATA.see.protocol) return [];
    if (url.hostname.length === 0 || url.username.length > 0 || url.password.length > 0) return [];
    return [url.toString()];
  } catch {
    return [];
  }
}

/***
 * Collects colocated executable-test facts for every @security reference.
 */
async function collectSecurityFactsAsync(
  root: string,
  project: Project,
  comment: CollectedDocumentationComment,
): Promise<readonly DocumentationSecurityReferenceFact[]> {
  return Promise.all(
    comment.parsed.tags
      .filter((tag) => tag.name === 'security')
      .map((tag) => collectSecurityFactAsync(root, project, comment, tag.value)),
  );
}

/***
 * Resolves one @security value to colocated file and exact test-name evidence.
 */
async function collectSecurityFactAsync(
  root: string,
  project: Project,
  comment: CollectedDocumentationComment,
  value: string | null,
): Promise<DocumentationSecurityReferenceFact> {
  const reference = value?.trim() ?? '';
  const parsed = parseSecurityReference(reference);
  if (parsed === null) return securityFact(comment.sourcePath, reference, false, false);

  const testPath = join(root, dirname(comment.sourcePath), parsed.fileName);
  const colocatedTestExists = await fileExistsAsync(testPath);
  if (!colocatedTestExists) return securityFact(comment.sourcePath, reference, false, false);

  const sourceFile = project.getSourceFile(testPath) ?? project.addSourceFileAtPath(testPath);
  const matches = sourceFile
    .getDescendants()
    .filter((node) => isNamedTestCall(node, parsed.testName)).length;

  return securityFact(comment.sourcePath, reference, true, matches === 1);
}

/***
 * Builds one portable security-reference fact.
 */
function securityFact(
  path: string,
  reference: string,
  colocatedTestExists: boolean,
  exactTestNameMatches: boolean,
): DocumentationSecurityReferenceFact {
  return { path, reference, colocatedTestExists, exactTestNameMatches };
}

/***
 * Parses one same-directory test filename and exact test name from an @security value.
 */
function parseSecurityReference(
  value: string,
): { readonly fileName: string; readonly testName: string } | null {
  const separator = value.indexOf('#');
  if (separator <= 0 || separator === value.length - 1) return null;

  const fileName = value.slice(0, separator).trim();
  const testName = value.slice(separator + 1).trim();
  if (basename(fileName) !== fileName || !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(fileName)) {
    return null;
  }
  return testName.length === 0 ? null : { fileName, testName };
}

/***
 * Checks whether a ts-morph node is test()/it() with the exact static string name.
 */
function isNamedTestCall(node: Node, expectedName: string): boolean {
  if (!Node.isCallExpression(node)) return false;
  const callee = node.getExpression().getText();
  if (callee !== 'test' && callee !== 'it') return false;
  const [name] = node.getArguments();
  if (!Node.isStringLiteral(name) && !Node.isNoSubstitutionTemplateLiteral(name)) return false;
  return name.getLiteralText() === expectedName;
}

/***
 * Checks whether one referenced colocated test path exists.
 */
async function fileExistsAsync(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
