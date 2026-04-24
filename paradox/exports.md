# Package Exports

## analyze

Kind: `function`

Runs the source analysis pipeline for a configured package.

## AnalysisComponent

Kind: `type`

Describes one React component and its extracted props.

## AnalysisExport

Kind: `type`

Describes one exported declaration discovered in a package.

## AnalysisResult

Kind: `type`

Complete analysis output used to build the documentation model.

## defineParadoxConfig

Kind: `function`

Defines a Paradox configuration object without changing its shape.

## ParadoxConfig

Kind: `type`

Configuration for running Paradox against a TypeScript package.

## buildModel

Kind: `function`

Converts analysis output into a serializable documentation model.

## DocumentationModel

Kind: `type`

Serializable model consumed by renderers and writers.

## render

Kind: `function`

Renders the documentation model into README and artifact files.

## RenderResult

Kind: `type`

Rendered documentation files ready to be written to disk.

## write

Kind: `function`

Writes generated documentation artifacts to the configured output paths.
