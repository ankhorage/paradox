import type { ReactNode } from '../react.js';
import { Heading, Text } from './Typography.js';

/***
 * Card props for the fixture.
 */
export interface CardProps {
  /*** Optional card title. */
  title?: ReactNode;

  /*** Uses denser spacing. */
  compact?: boolean;
}

/***
 * Product-facing card container.
 *
 * @readme
 */
export function Card({ title, compact = false }: CardProps) {
  return (
    <section>
      <Heading>{title}</Heading>
      <Text compact={compact} />
    </section>
  );
}
