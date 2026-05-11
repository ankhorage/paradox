import type { ReactNode } from '../react.js';

export interface HeadingProps {
  children: ReactNode;
}

export function Heading({ children }: HeadingProps) {
  return <h2>{children}</h2>;
}

export interface TextProps {
  compact?: boolean;
  children?: ReactNode;
}

export function Text({ compact = false, children }: TextProps) {
  return <p data-compact={compact}>{children}</p>;
}
