import { rcompare } from 'semver';
import { Extension } from './common';
import { DependencyStatement } from './dependency-statement';

const LEGAL_OPERATORS = ['==', '>=', ''];

function checkForIllegalDependencyStatements(ext: Extension) {
  const illegalOperators = ext.definition.dependencies.filter(
    (dep) =>
      LEGAL_OPERATORS.indexOf(DependencyStatement.fromString(dep).operator) ===
      -1
  );

  if (illegalOperators.length > 0) {
    throw Error(
      `${
        ext.name
      } contains dependency statements with illegal operators: ${JSON.stringify(
        illegalOperators
      )}`
    );
  }
}

export default class ExtensionDependencySolver {
  allExtensions: Extension[];

  availableVersions: { [extensionName: string]: string[] };

  extensionsByString: { [extensionNameAndVersion: string]: Extension };

  constructor(allExtensions: Extension[]) {
    this.allExtensions = allExtensions;
    this.availableVersions = {};
    allExtensions.forEach((ext: Extension) => {
      if (this.availableVersions[ext.name] === undefined) {
        this.availableVersions[ext.name] = [];
      }
      this.availableVersions[ext.name].push(ext.version);

      // Descending order
      this.availableVersions[ext.name].sort(rcompare);
    });

    this.extensionsByString = Object.fromEntries(
      allExtensions.map((ext) => [`${ext.name}-${ext.version}`, ext])
    );
  }

  // eslint-disable-next-line class-methods-use-this
  solveFor(ext: Extension) {
    const preferredVersion: {
      [extensionName: string]: string;
    } = {};

    const satisfactoryVersions: { [dependencyName: string]: string[] } = {};

    checkForIllegalDependencyStatements(ext);
  }
}
