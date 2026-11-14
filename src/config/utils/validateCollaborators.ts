/***
 * Enables contributors by default and validates the explicit opt-out.
 */
export function validateCollaborators(value: unknown): true | null {
  if (value === undefined || value === true) return true;
  if (value === false) return null;

  throw new Error('Invalid collaborators config. Expected a boolean or omission.');
}
