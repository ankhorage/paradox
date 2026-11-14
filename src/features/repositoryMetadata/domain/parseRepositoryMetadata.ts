import type {
  RepositoryImplementationRef,
  RepositoryMetadata,
  RepositoryMetadataArchitecture,
  RepositoryMetadataConstraints,
  RepositoryMetadataKind,
} from '@ankhorage/contracts/metadata';
import { isRecord } from '@ankhorage/utility/object';

const METADATA_KINDS: readonly RepositoryMetadataKind[] = [
  'adapter',
  'application',
  'configuration',
  'contract',
  'infrastructure',
  'library',
  'tooling',
  'website',
];

/***
 * Decodes one JSON value into the published repository-metadata contract.
 */
export function parseRepositoryMetadata(value: unknown): RepositoryMetadata {
  if (!isRecord(value)) throw invalidMetadata('the document must be a JSON object');
  if (value.schemaVersion !== 1) throw invalidMetadata('schemaVersion must be 1');
  if (!isMetadataKind(value.kind)) throw invalidMetadata('kind is not supported');

  return {
    schemaVersion: 1,
    kind: value.kind,
    title: requiredString(value.title, '#/title'),
    summary: requiredString(value.summary, '#/summary'),
    purpose: requiredString(value.purpose, '#/purpose'),
    ...optionalString(value.domain, 'domain'),
    ...optionalStringArray(value.responsibilities, 'responsibilities'),
    ...optionalStringArray(value.boundaries, 'boundaries'),
    ...optionalStringArray(value.audience, 'audience'),
    ...optionalStringArray(value.useCases, 'useCases'),
    ...optionalArchitecture(value.architecture),
    ...optionalImplementations(value.implements),
    ...optionalConstraints(value.constraints),
  };
}

/*** Recognizes the closed metadata-kind vocabulary from the published contract. */
function isMetadataKind(value: unknown): value is RepositoryMetadataKind {
  return typeof value === 'string' && METADATA_KINDS.includes(value as RepositoryMetadataKind);
}

/*** Reads one required string field without accepting coercion. */
function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string') throw invalidMetadata(`${path} must be a string`);
  return value;
}

/*** Preserves one optional string field when it is contract-shaped. */
function optionalString(value: unknown, field: 'domain'): { readonly domain?: string } {
  if (value === undefined) return {};
  if (typeof value !== 'string') throw invalidMetadata(`#/${field} must be a string`);
  return { [field]: value };
}

/*** Preserves one optional string-array field when every entry is contract-shaped. */
function optionalStringArray<
  TField extends 'audience' | 'boundaries' | 'responsibilities' | 'useCases',
>(value: unknown, field: TField): Partial<Readonly<Record<TField, readonly string[]>>> {
  if (value === undefined) return {};
  if (!isStringArray(value)) throw invalidMetadata(`#/${field} must be an array of strings`);
  return { [field]: value } as Partial<Readonly<Record<TField, readonly string[]>>>;
}

/*** Decodes optional architecture facts without evaluating project code. */
function optionalArchitecture(value: unknown): {
  readonly architecture?: RepositoryMetadataArchitecture;
} {
  if (value === undefined) return {};
  if (!isRecord(value)) throw invalidMetadata('#/architecture must be an object');
  const { invariants, role } = value;
  if (role !== undefined && typeof role !== 'string') {
    throw invalidMetadata('#/architecture/role must be a string');
  }
  if (invariants !== undefined && !isStringArray(invariants)) {
    throw invalidMetadata('#/architecture/invariants must be an array of strings');
  }
  return {
    architecture: {
      ...(role === undefined ? {} : { role }),
      ...(invariants === undefined ? {} : { invariants }),
    },
  };
}

/*** Decodes optional explicit implementation relationships from authored JSON. */
function optionalImplementations(value: unknown): {
  readonly implements?: readonly RepositoryImplementationRef[];
} {
  if (value === undefined) return {};
  if (!Array.isArray(value)) throw invalidMetadata('#/implements must be an array');
  return { implements: value.map(parseImplementationReference) };
}

/*** Decodes one explicit implementation relationship. */
function parseImplementationReference(value: unknown, index: number): RepositoryImplementationRef {
  const path = `#/implements/${index}`;
  if (!isRecord(value)) throw invalidMetadata(`${path} must be an object`);
  const packageName = requiredString(value.packageName, `${path}/packageName`);
  const { interfaceId, subpath } = value;
  if (subpath !== undefined && typeof subpath !== 'string') {
    throw invalidMetadata(`${path}/subpath must be a string`);
  }
  if (interfaceId !== undefined && typeof interfaceId !== 'string') {
    throw invalidMetadata(`${path}/interfaceId must be a string`);
  }
  return {
    packageName,
    ...(subpath === undefined ? {} : { subpath }),
    ...(interfaceId === undefined ? {} : { interfaceId }),
  };
}

/*** Decodes optional operational constraints from authored JSON. */
function optionalConstraints(value: unknown): {
  readonly constraints?: RepositoryMetadataConstraints;
} {
  if (value === undefined) return {};
  if (!isRecord(value)) throw invalidMetadata('#/constraints must be an object');
  return {
    constraints: {
      ...constraintArray(value.platforms, 'platforms'),
      ...constraintArray(value.configuration, 'configuration'),
      ...constraintArray(value.security, 'security'),
      ...constraintArray(value.limitations, 'limitations'),
    },
  };
}

/*** Preserves one optional constraint list after structural validation. */
function constraintArray<TField extends keyof RepositoryMetadataConstraints>(
  value: unknown,
  field: TField,
): Partial<Readonly<Record<TField, readonly string[]>>> {
  if (value === undefined) return {};
  if (!isStringArray(value)) {
    throw invalidMetadata(`#/constraints/${field} must be an array of strings`);
  }
  return { [field]: value } as Partial<Readonly<Record<TField, readonly string[]>>>;
}

/*** Recognizes a JSON-compatible array containing only strings. */
function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/*** Creates one stable structural metadata error. */
function invalidMetadata(message: string): Error {
  return new Error(`Invalid repository metadata: ${message}.`);
}
