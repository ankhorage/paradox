# @ankhorage/paradox

Deterministic documentation generator for TypeScript packages.

## Package Exports

### analyze

Runs the source analysis pipeline for a configured package.

### AnalysisComponent

Describes one React component and its extracted props.

### AnalysisExport

Describes one exported declaration discovered in a package.

### AnalysisResult

Complete analysis output used to build the documentation model.

### defineParadoxConfig

Defines a Paradox configuration object without changing its shape.

### ParadoxConfig

Configuration for running Paradox against a TypeScript package.

### buildModel

Converts analysis output into a serializable documentation model.

### DocumentationModel

Serializable model consumed by renderers and writers.

### render

Renders the documentation model into README and artifact files.

### RenderResult

Rendered documentation files ready to be written to disk.

### write

Writes generated documentation artifacts to the configured output paths.
