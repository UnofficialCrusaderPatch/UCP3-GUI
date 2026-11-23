/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line max-classes-per-file
import { Dependency, Node, Package, Repository, Tree } from 'lean-resolution';
import { rcompare } from 'semver';

import { Extension } from '../../../config/ucp/common';
import { ConsoleLogger } from '../../../util/scripts/logging';

export function extensionToID(ext: Extension) {
  return `${ext.name}@${ext.version}`;
}

export class Solution {
  status: string;

  packages: Package[];

  messages: string[];

  constructor(status: 'OK' | 'ERROR', packages: Package[], messages: string[]) {
    this.status = status;
    this.packages = packages;
    this.messages = messages;
  }

  get message() {
    return this.messages.join('\n\n');
  }
}

export class ExtensionSolution {
  status: 'OK' | 'ERROR';

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

/**
 * lean-resolution's tree, with a dependency walk that records what it has
 * visited. The library's walk (Tree.allDependenciesForNode) never fills its
 * visited list, so it never ends on a dependency cycle and processes a node
 * once per path. Every solver step walks through this method: the first
 * solve, conflict retargeting and the brute-force search. The result is the
 * library's: free of duplicates, in the order nodes are first reached. A cycle
 * then reaches the library's topological sort, which reports it as an error.
 */
export class VisitingTree extends Tree {
  // Overrides the library's method, which its solvers call on the tree
  // eslint-disable-next-line class-methods-use-this
  allDependenciesForNode(
    initialNode: Node,
    options?: { allowUnresolvedEdges: boolean },
  ) {
    const allowUnresolvedEdges = options?.allowUnresolvedEdges ?? false;
    const dependencies: Node[] = [initialNode];
    const reached = new Set<Node>(dependencies);
    // Breadth first, as the library walks
    for (let i = 0; i < dependencies.length; i += 1) {
      dependencies[i].out.forEach((e) => {
        const target = e.to;
        if (target === undefined) {
          if (!allowUnresolvedEdges) {
            throw Error(`Encountered unresolved edge: ${e.id}`);
          }
          return;
        }
        if (!reached.has(target)) {
          reached.add(target);
          dependencies.push(target);
        }
      });
    }
    return dependencies;
  }
}

// eslint-disable-next-line import/prefer-default-export
export class DependencyTree {
  tree: Tree = new VisitingTree([]);

  frontendVersion: string;

  frameworkVersion: string;

  constructor(
    packages: Package[],
    frontendVersion?: string,
    frameworkVersion?: string,
  ) {
    this.frontendVersion = frontendVersion || '0.0.0';
    this.frameworkVersion = frameworkVersion || '3.0.0';

    this.tree = new VisitingTree([
      ...packages,
      new Package('frontend', this.frontendVersion),
      new Package('framework', this.frameworkVersion),
    ]);
  }

  copy() {
    const result = new DependencyTree(
      [...this.tree.packages],
      this.frontendVersion,
      this.frameworkVersion,
    );

    result.tree = new VisitingTree(this.tree.packages);

    return result;
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
    const repo: Repository = this.tree.packages.map(
      (e) =>
        new Package(
          e.name,
          e.version.raw,
          e.dependencies.map((d) => new Dependency(d.name, d.versionRange.raw)),
        ),
    );

    repo.push(new Package('frontend', this.frontendVersion));
    repo.push(new Package('framework', this.frameworkVersion));

    this.tree = new VisitingTree(repo);
  }

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

  dependenciesFor(id: string): Solution {
    const node = this.tree.nodeForID(id);

    this.tree.reset();
    this.tree.errors.splice(0, this.tree.errors.length);
    this.tree.setInitialTargetForAllEdges();

    try {
      const s = this.tree
        .solve([node.spec])
        .filter((e) => e.spec.name !== 'frontend')
        .filter((e) => e.spec.name !== 'framework')
        .map((n) => n.spec);

      return new Solution('OK', s, []);
    } catch (e) {
      return new Solution('ERROR', [], [`${e}`]);
    }
  }

  dependenciesForMultiple(ids: string[]): Solution {
    this.tree.reset();
    this.tree.errors.splice(0, this.tree.errors.length);

    const nodes = ids.map((id) => this.tree.nodeForID(id));

    try {
      const s = this.tree
        .solve(nodes.map((n) => n.spec))
        .filter((e) => e.spec.name !== 'frontend')
        .filter((e) => e.spec.name !== 'framework')
        .map((n) => n.spec);

      return new Solution('OK', s, []);
    } catch (e) {
      return new Solution('ERROR', [], [`${e}`]);
    }
  }

  directDependenciesFor(id: string) {
    const node = this.tree.nodeForID(id);

    const und = node.edgesOut.filter((e) => e.to === undefined);
    if (und.length > 0) {
      ConsoleLogger.error(
        `directDependenciesFor(${id}): undefined edges for: `,
        id,
        node,
        und,
      );
    }

    return node.edgesOut
      .filter((e) => e.to !== undefined) // TODO: fixme: Should we report an error here?
      .map((e) => e.to!)
      .filter((e) => e.spec.name !== 'frontend')
      .filter((e) => e.spec.name !== 'framework')
      .map((n) => n.spec);
  }

  reverseDependenciesFor(id: string) {
    const node = this.tree.nodeForID(id);

    return node.edgesIn
      .filter((e) => !e.from.id.startsWith('__user__'))
      .filter((e) => e.from.spec.name !== 'frontend')
      .filter((e) => e.from.spec.name !== 'framework')
      .map((e) => e.from.spec);
  }
}

export class ExtensionDependencyTree extends DependencyTree {
  extensions: Extension[];

  extensionsById: { [k: string]: Extension };

  constructor(
    extensions: Extension[],
    frontendVersion?: string,
    frameworkVersion?: string,
  ) {
    super(
      extensions.map(
        (e) =>
          new Package(
            e.name,
            e.version,
            Object.entries(e.definition.dependencies).map(
              ([ext, range]) => new Dependency(ext, range.raw),
            ),
          ),
      ),
      frontendVersion,
      frameworkVersion,
    );
    this.extensions = extensions;
    this.extensionsById = Object.fromEntries(
      extensions.map((e) => [extensionToID(e), e]),
    );
  }

  copy() {
    return new ExtensionDependencyTree(
      this.extensions,
      this.frontendVersion,
      this.frameworkVersion,
    );
  }

  reset() {
    const packages = this.extensions.map(
      (e) =>
        new Package(
          e.name,
          e.version,
          Object.entries(e.definition.dependencies).map(
            ([ext, range]) => new Dependency(ext, range.raw),
          ),
        ),
    );
    this.tree = new VisitingTree([
      ...packages,
      new Package('frontend', this.frontendVersion),
      new Package('framework', this.frameworkVersion),
    ]);
  }

  nodeForExtension(ext: Extension) {
    return this.tree.nodeForID(extensionToID(ext));
  }

  reverseExtensionDependenciesFor(ext: Extension) {
    if (ext === null || ext === undefined) {
      throw Error(`extension is null`);
    }
    return this.reverseDependenciesFor(`${ext.name}@${ext.version}`).map(
      (p) => this.extensionsById[p.id],
    );
  }

  directExtensionDependenciesFor(ext: Extension) {
    return this.directDependenciesFor(`${ext.name}@${ext.version}`).map(
      (p) => this.extensionsById[p.id],
    );
  }

  #convertSolution(s: Solution) {
    if (s.status === 'OK') {
      return new ExtensionSolution(
        s.status,
        s.packages.map((p) => this.extensionsById[p.id]),
        s.messages,
      );
    }
    return new ExtensionSolution('ERROR', undefined, s.messages);
  }

  extensionDependenciesFor(ext: Extension): ExtensionSolution {
    return this.#convertSolution(
      this.dependenciesFor(`${ext.name}@${ext.version}`),
    );
  }

  extensionDependenciesForExtensions(
    extensions: Extension[],
  ): ExtensionSolution {
    return this.#convertSolution(
      this.dependenciesForMultiple(
        extensions.map((ext) => `${ext.name}@${ext.version}`),
      ),
    );
  }

  allExtensionVersionsForName(name: string) {
    return this.extensions
      .filter((e) => e.name === name)
      .map((e) => e.version)
      .sort(rcompare);
  }
}
