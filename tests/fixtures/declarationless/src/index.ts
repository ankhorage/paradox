export type HexColor = string & { readonly __hexColorBrand: unique symbol };

export interface DeclaredOptions {
  enabled: boolean;
}

/***
 * Parses a hex color value.
 */
export function parseHexColor(value: string): HexColor | null {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? (value as HexColor) : null;
}
