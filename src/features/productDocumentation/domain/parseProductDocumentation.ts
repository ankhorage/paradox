import { isRecord } from '@ankhorage/utility/object';

export interface ProductDocumentation {
  kind: 'application' | 'website';
  overview: string;
  sections: ProductDocumentationSection[];
}

interface ProductDocumentationSection {
  title: string;
  description: string | null;
  entries: ProductDocumentationEntry[];
}

interface ProductDocumentationEntry {
  title: string;
  description: string;
}

/***
 * Decodes the source-owned application or website documentation document.
 */
export function parseProductDocumentation(value: unknown): ProductDocumentation {
  if (!isRecord(value)) throw invalidProductDocumentation('the document must be a JSON object');
  if (value.schemaVersion !== 1) throw invalidProductDocumentation('schemaVersion must be 1');
  if (value.kind !== 'application' && value.kind !== 'website') {
    throw invalidProductDocumentation('kind must be "application" or "website"');
  }

  return {
    kind: value.kind,
    overview: requiredString(value.overview, '#/overview'),
    sections: requiredSections(value.sections),
  };
}

/*** Decodes non-empty product sections and their authored entries. */
function requiredSections(value: unknown): ProductDocumentationSection[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidProductDocumentation('#/sections must be a non-empty array');
  }
  return value.map((section, index) => parseSection(section, index));
}

/*** Decodes one product documentation section. */
function parseSection(value: unknown, index: number): ProductDocumentationSection {
  const path = `#/sections/${index}`;
  if (!isRecord(value)) throw invalidProductDocumentation(`${path} must be an object`);
  const { entries } = value;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw invalidProductDocumentation(`${path}/entries must be a non-empty array`);
  }
  return {
    title: requiredString(value.title, `${path}/title`),
    description: optionalString(value.description, `${path}/description`),
    entries: entries.map((entry, entryIndex) => parseEntry(entry, `${path}/entries/${entryIndex}`)),
  };
}

/*** Decodes one generic product documentation entry. */
function parseEntry(value: unknown, path: string): ProductDocumentationEntry {
  if (!isRecord(value)) throw invalidProductDocumentation(`${path} must be an object`);
  return {
    title: requiredString(value.title, `${path}/title`),
    description: requiredString(value.description, `${path}/description`),
  };
}

/*** Reads one non-empty authored text value. */
function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalidProductDocumentation(`${path} must be a non-empty string`);
  }
  return value;
}

/*** Reads an optional non-empty authored text value. */
function optionalString(value: unknown, path: string): string | null {
  if (value === undefined) return null;
  return requiredString(value, path);
}

/*** Creates one stable product-documentation error. */
function invalidProductDocumentation(message: string): Error {
  return new Error(`Invalid product documentation: ${message}.`);
}
