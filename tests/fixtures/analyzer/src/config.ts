/***
 * Configuration for the analyzer fixture.
 *
 * @config
 */
export interface ToolConfig {
  /*** Enables the main feature. */
  enabled: boolean;

  /*** Logging configuration. */
  logging: {
    /*** Enables debug output. */
    debug?: boolean;
  };
}
