/***
 * @title Configuration
 *
 * Configures Paradox documentation generation for a package.
 *
 * @config
 * @readme
 */
export interface ParadoxConfig {
  mode?: 'safe' | 'write';

  /** Enables the Contributors README and workflow integration (enabled by default). */
  collaborators?: boolean;

  /** Enables GitHub Sponsors integration (defaults to @ankhorage, false disables it). */
  donation?: false | {
    /** GitHub Sponsors account login used for the Sponsor button and Donation chapter. */
    account: string;
  };

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
