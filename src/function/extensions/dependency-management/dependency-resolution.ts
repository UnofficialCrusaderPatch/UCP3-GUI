/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line max-classes-per-file
import { Dependency, Package, Repository, Tree } from 'lean-resolution';
import { rcompare } from 'semver';

import { Extension } from '../../../config/ucp/common';
import { ConsoleLogger } from '../../../util/scripts/logging';

function extensionToID(ext: Extension) {
  return `${ext.name}@${ext.version}`;
}

export class ExtensionSolution {
  status: string;

  extensions: Extension[] | undefined;

  messages: string[];

  constructor(
    status: 'OK' | 'ERROR',
    extensions: Extension[] | undefined,
    messages: string[],
  ) {
    this.status = status;
    this.extensions = extensions;
    this.messages = messages;
  }

  get message() {
    return this.messages.join('\n\n');
  }
}

type FailedInitialSolution = {
  status: 'error';
  messages: string[];
};

type SuccesfullInitialSolution = {
  status: 'ok';
};

export type InitialSolution = SuccesfullInitialSolution | FailedInitialSolution;

// eslint-disable-next-line import/prefer-default-export
export class ExtensionTree {
  extensions: Extension[];

  tree: Tree;

  extensionsById: { [extensionID: string]: Extension };

  frontendVersion: string;

  frameworkVersion: string;

  constructor(
    extensions: Extension[],
    frontendVersion?: string,
    frameworkVersion?: string,
  ) {
    this.frontendVersion = frontendVersion || '0.0.0';
    this.frameworkVersion = frameworkVersion || '3.0.0';
    this.extensions = extensions;
    this.extensionsById = Object.fromEntries(
      extensions.map((e) => [extensionToID(e), e]),
    );
    const repo: Repository = this.extensions.map(
      (e) =>
        new Package(
          e.name,
          e.version,
          Object.entries(e.definition.dependencies).map(
            ([ext, range]) => new Dependency(ext, range.raw),
          ),
        ),
    );

    repo.push(new Package('frontend', this.frontendVersion));
    repo.push(new Package('framework', this.frameworkVersion));

    this.tree = new Tree(repo);
  }

  copy() {
    return new ExtensionTree(
      this.extensions,
      this.frontendVersion,
      this.frameworkVersion,
    );
  }

  get initialSolution() {
    if (this.tree.state === 'OK') {
      return {
        status: 'ok',
      } as InitialSolution;
    }

    return {
      status: 'error',
      messages: [...this.tree.errors],
    } as InitialSolution;
  }

  reset() {
    const repo: Repository = this.extensions.map(
      (e) =>
        new Package(
          e.name,
          e.version,
          Object.entries(e.definition.dependencies).map(
            ([ext, range]) => new Dependency(ext, range.raw),
          ),
        ),
    );

    repo.push(new Package('frontend', this.frontendVersion));
    repo.push(new Package('framework', this.frameworkVersion));

    this.tree = new Tree(repo);
  }

  // setExtensions(extensions: Extension[]) {
  //   this.extensions = extensions;
  //   this.extensionsById = Object.fromEntries(
  //     extensions.map((e) => [extensionToID(e), e]),
  //   );
  //   const repo: Repository = this.extensions.map(
  //     (e) =>
  //       new Package(
  //         e.name,
  //         e.version,
  //         Object.entries(e.definition.dependencies).map(
  //           ([ext, range]) => new Dependency(ext, range.raw),
  //         ),
  //       ),
  //   );

  //   this.tree = new Tree(repo);
  // }

  tryResolveAllDependencies() {
    try {
      this.tree.reset();
      this.tree.errors.splice(0, this.tree.errors.length);

      this.tree.setInitialTargetForAllEdges();

      if (this.tree.state === 'OK') {
        return {
          status: 'ok',
        } as InitialSolution;
      }

      return {
        status: 'error',
        messages: [...this.tree.errors],
      } as InitialSolution;
    } catch (err: any) {
      return {
        status: 'error',
        messages: [err.toString(), ...this.tree.errors],
      } as InitialSolution;
    }
  }

  nodeForExtension(ext: Extension) {
    return this.tree.nodeForID(extensionToID(ext));
  }

  reverseDependenciesFor(ext: Extension) {
    const node = this.nodeForExtension(ext);

    return node.edgesIn
      .filter((e) => !e.from.id.startsWith('__user__'))
      .filter((e) => e.from.spec.name !== 'frontend')
      .filter((e) => e.from.spec.name !== 'framework')
      .map((e) => this.extensionsById[e.from.id]);
  }

  directDependenciesFor(ext: Extension) {
    const node = this.nodeForExtension(ext);

    const und = node.edgesOut.filter((e) => e.to === undefined);
    if (und.length > 0) {
      ConsoleLogger.error('undefined edges for: ', ext, node, und);
    }

    return node.edgesOut
      .map((e) => e.to!)
      .filter((e) => e.spec.name !== 'frontend')
      .filter((e) => e.spec.name !== 'framework')
      .map((n) => this.extensionsById[n.id]);
  }

  dependenciesFor(ext: Extension): ExtensionSolution {
    const node = this.nodeForExtension(ext);

    this.tree.reset();
    this.tree.errors.splice(0, this.tree.errors.length);
    this.tree.setInitialTargetForAllEdges();

    try {
      const s = this.tree
        .solve([node.spec])
        .filter((e) => e.spec.name !== 'frontend')
        .filter((e) => e.spec.name !== 'framework')
        .map((n) => this.extensionsById[n.id]);

      return new ExtensionSolution('OK', s, []);
    } catch (e) {
      return new ExtensionSolution('ERROR', undefined, [`${e}`]);
    }
  }

  dependenciesForExtensions(extensions: Extension[]): ExtensionSolution {
    this.tree.reset();
    this.tree.errors.splice(0, this.tree.errors.length);

    const nodes = extensions.map((e) => this.nodeForExtension(e));

    try {
      const s = this.tree
        .solve(nodes.map((n) => n.spec))
        .filter((e) => e.spec.name !== 'frontend')
        .filter((e) => e.spec.name !== 'framework')
        .map((n) => this.extensionsById[n.id]);

      return new ExtensionSolution('OK', s, []);
    } catch (e) {
      return new ExtensionSolution('ERROR', undefined, [`${e}`]);
    }
  }

  allExtensionsForName(name: string) {
    return this.extensions.filter((e) => e.name === name);
  }

  allVersionsForName(name: string) {
    return this.allExtensionsForName(name)
      .map((e) => e.version)
      .sort(rcompare);
  }
}
