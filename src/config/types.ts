/***
 * Configuration for running Paradox.
 *
 * @config
 * @readme
 */
export interface ParadoxConfig {
  mode?: 'safe' | 'write';

  docs?: {
    title?: string;
    description?: string;
    usage?: {
      entrypoints?: string[];
    };
  };

  package?: {
    root?: string;
    entrypoints?: string[];
  };

  output?: {
    dir?: string;
  };
}
