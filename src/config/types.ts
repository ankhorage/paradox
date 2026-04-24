/***
 * Configuration for running Paradox.
 *
 * @config
 */
export interface ParadoxConfig {
  mode?: 'safe' | 'write';

  docs?: {
    title?: string;
    description?: string;
  };

  package?: {
    root?: string;
    entrypoints?: string[];
  };

  output?: {
    dir?: string;
  };
}
