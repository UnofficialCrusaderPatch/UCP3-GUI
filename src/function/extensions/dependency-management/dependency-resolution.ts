/* eslint-disable import/no-extraneous-dependencies */
import { Extension } from 'config/ucp/common';
import { DependencyStatement } from 'config/ucp/dependency-statement';
import { Dependency } from 'lean-resolution/src/Dependency';
import { Package } from 'lean-resolution/src/Package';
import { Repository } from 'lean-resolution/src/Repository';
import { Tree } from 'lean-resolution/src/core/Tree';
import { rcompare } from 'semver';

function extensionToID(ext: Extension) {
  return `${ext.name}@${ext.version}`;
}

// eslint-disable-next-line import/prefer-default-export
export class ExtensionTree {
  extensions: Extension[];

  tree: Tree;

  extensionsById: { [extensionID: string]: Extension };

  constructor(extensions: Extension[]) {
    this.extensions = extensions;
    this.extensionsById = Object.fromEntries(
      extensions.map((e) => [extensionToID(e), e])
    );
    const repo: Repository = extensions.map(
      (e) =>
        new Package(
          e.name,
          e.version,
          e.definition.dependencies.map((d) => {
            const s = DependencyStatement.fromString(d);

            if (s.operator === '==') s.operator = '=';

            return new Dependency(s.extension, `${s.operator}${s.version}`);
          })
        )
    );

    this.tree = new Tree(repo);
  }

  tryResolveDependencies() {
    this.tree.reset();

    this.tree.setInitialTargetForAllEdges();

    if (this.tree.state === 'OK') {
      return '';
    }

    return this.tree.errors.join('\n');
  }

  nodeForExtension(ext: Extension) {
    return this.tree.nodeForID(extensionToID(ext));
  }

  reverseDependenciesFor(ext: Extension) {
    const node = this.nodeForExtension(ext);

    return node.edgesIn
      .filter((e) => !e.from.id.startsWith('__user__'))
      .map((e) => this.extensionsById[e.from.id]);
  }

  directDependenciesFor(ext: Extension) {
    const node = this.nodeForExtension(ext);

    return node.edgesOut
      .map((e) => e.to!)
      .map((n) => this.extensionsById[n.id]);
  }

  dependenciesFor(ext: Extension) {
    const node = this.nodeForExtension(ext);

    this.tree.reset();
    this.tree.setInitialTargetForAllEdges();

    return this.tree.solve([node.spec]).map((n) => this.extensionsById[n.id]);
  }

  dependenciesForExtensions(extensions: Extension[]) {
    const nodes = extensions.map((e) => this.nodeForExtension(e));

    this.tree.reset();
    this.tree.setInitialTargetForAllEdges();

    return this.tree
      .solve(nodes.map((n) => n.spec))
      .map((n) => this.extensionsById[n.id]);
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
