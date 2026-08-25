/***
 * Configuration for running Paradox.
 *
 * @config
 * @readme
 */
export interface ParadoxConfig {
  mode?: 'safe' | 'write';

  /** Enables canonical direct-collaborator documentation and workflow integration. */
  collaborators?: true;

  /** Enables canonical GitHub Sponsors integration for generated repository documentation. */
  donation?: {
    /** GitHub Sponsors account login used for the Sponsor button and Donation chapter. */
    account: string;
  };

  docs?: {
    title?: string;
    description?: string;
    usage?: {
      description?: string;
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
