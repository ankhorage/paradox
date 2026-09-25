import { DOCUMENTATION_POLICY } from '@ankhorage/policy/documentation';

import type { AnalysisDocumentationFinding } from '../types.js';

/***
 * Creates a finding from one canonical documentation policy rule.
 */
export function createDocumentationFinding(
  ruleId: string,
  message: string,
  sourcePath: string | null = null,
  line: number | null = null,
): AnalysisDocumentationFinding {
  const rule = DOCUMENTATION_POLICY.rules.find((candidate) => candidate.id === ruleId);
  if (rule === undefined) {
    throw new Error(`Unknown documentation policy rule: ${ruleId}`);
  }

  return {
    ruleId,
    severity: rule.severity,
    message,
    sourcePath,
    line,
  };
}
