import type { Type } from 'ts-morph';

import type { AnalysisComponent } from '../types.js';
import { getParadoxComment } from './getParadoxComment.js';
import { parseParadoxComment } from './parseParadoxComment.js';

/***
 * Extracts prop names, types, required flags, and descriptions from a type.
 */
export function getPropsFromType(type: Type): AnalysisComponent['props'] {
  return type.getProperties().map((property) => {
    const [declaration] = property.getDeclarations();
    const propertyType = property.getTypeAtLocation(declaration);
    const rawComment = getParadoxComment(declaration);
    const parsed = rawComment ? parseParadoxComment(rawComment) : { description: null };

    return {
      name: property.getName(),
      type: propertyType.getText(declaration),
      required: !property.isOptional(),
      description: parsed.description,
    };
  });
}
