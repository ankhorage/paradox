# Registry Pattern

The registry pattern centralizes a known set of named definitions behind a stable lookup
point. Other parts of the system can ask the registry for metadata by name instead of
hardcoding the same list in multiple renderers, parsers, or validators.

Martin Fowler catalogs **Registry** in *Patterns of Enterprise Application Architecture* as
a well-known object used to find common objects and services. In Paradox, the same idea
applies to documentation-tag metadata: the renderer should not own the canonical list of
supported tags. A documentation-tag registry should own that list, and consumers such as
parsers, validators, diagnostics, and renderers should read from that registry.

## Book reference

- **Title:** *Patterns of Enterprise Application Architecture*
- **Author:** Martin Fowler, with Dave Rice, Matthew Foemmel, Edward Hieatt, Robert Mee,
  and Randy Stafford
- **Publisher:** Addison-Wesley Professional
- **Year:** 2002
- **Print ISBN-13:** `978-0-321-12742-6`
- **Print ISBN-10:** `0-321-12742-0`
- **eText ISBN-13:** `978-0-13-306521-3`
- **Pattern reference:** <https://www.martinfowler.com/eaaCatalog/registry.html>
- **Book page:** <https://www.martinfowler.com/books/eaa.html>

This wiki entry does not claim Fowler invented the registry pattern. It credits Fowler as
the author who cataloged and popularized this pattern in the enterprise application
architecture pattern catalog.

## Paradox usage

For Paradox, the documentation-tag registry should live in:

```txt
src/docTags/registry.ts
```

That file should become the source of truth for supported documentation tags, for example:

```ts
/***
 * Supported Paradox documentation tags.
 *
 * Paradox supports doc tags inside triple-star documentation comments.
 *
 * @readme
 */
export const PARADOX_DOC_TAGS = [
  {
    name: 'readme',
    syntax: '@readme',
    description: 'Includes a documentation block or exported symbol in README output.',
    appliesTo: ['block', 'symbol'],
    repeatable: false,
    handler: 'markReadme',
  },
  {
    name: 'config',
    syntax: '@config',
    description: 'Marks a type or interface as part of the Paradox configuration model.',
    appliesTo: ['interface', 'type'],
    repeatable: false,
    handler: 'markConfig',
  },
  {
    name: 'example',
    syntax: '@example',
    description: 'Adds a titled fenced code example to generated documentation.',
    appliesTo: ['symbol'],
    repeatable: true,
    handler: 'parseExample',
  },
] as const;
```

The registry owns metadata. It should not directly own rendering output and should not
force a Documentation Tags section into every consumer README.

## Registry versus handler dispatch

A registry should answer questions such as:

- Which tags are allowed?
- What is the canonical syntax?
- What does each tag mean?
- Where may each tag be used?
- Is each tag repeatable?
- Which handler id is associated with a tag?

A handler dispatcher should answer a different question:

- What code should run when a parsed tag is encountered?

Keep those responsibilities separate. The registry can store a handler id such as
`'parseExample'`, while a separate file can bind that id to executable code later:

```txt
src/docTags/handlers.ts
```

Example:

```ts
const DOC_TAG_HANDLERS = {
  markReadme,
  markConfig,
  parseExample,
} satisfies Record<DocTagHandlerId, DocTagHandler>;
```

This avoids circular dependencies between metadata, parser code, and renderers.

## Why this matters

Without a registry, the same tag definitions drift across files. For example, if
`markdown.ts` owns `DOCUMENTATION_TAGS`, the renderer becomes the accidental source of
truth for parser-domain concepts. That makes it easy to accidentally render Paradox-owned
tag reference docs in every consumer README.

With a registry:

- tag metadata lives in one domain-owned place;
- renderers consume already-analyzed documentation content;
- consumer repositories do not receive Paradox tag docs by default;
- Paradox can dogfood its own registry by marking `PARADOX_DOC_TAGS` with `@readme`;
- structured exported constants can later be rendered as generic tables.

## Design rule

A registry is a source of truth and lookup mechanism. It is not automatically a renderer,
not automatically a plugin host, and not automatically global output.

For issue #35, the registry should make documentation tags explicit and typed, while the
README/docs output remains opt-in through normal Paradox documentation comments.
