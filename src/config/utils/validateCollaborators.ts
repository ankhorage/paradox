export function validateCollaborators(value: unknown): true | null {
  if (value === undefined) return null;
  if (value === true) return true;

  throw new Error('Invalid collaborators config. Expected literal true or omission.');
}
