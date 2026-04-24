import { Project } from 'ts-morph';

/***
 * Creates the ts-morph project used by the analyzer.
 */
export function createProject(root: string): Project {
  return new Project({
    tsConfigFilePath: `${root}/tsconfig.json`,
    skipAddingFilesFromTsConfig: false,
  });
}
