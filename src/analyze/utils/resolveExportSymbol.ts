import type { Symbol } from 'ts-morph';

/***
 * Resolves aliased export symbols to their underlying declarations.
 */
export function resolveExportSymbol(symbol: Symbol): Symbol {
  return symbol.getAliasedSymbol() ?? symbol;
}
