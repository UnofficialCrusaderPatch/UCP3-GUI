import { Extension } from './common';
import { DependencyStatement } from './DependencyStatement';

function SetSubtract<Type>(s1: Set<Type>, s2: Set<Type>): Set<Type> {
  return new Set([...s1].filter((x) => !s2.has(x)));
}

function SetAdd<Type>(s1: Set<Type>, s2: Set<Type>): Set<Type> {
  return new Set([...s1, ...s2]);
}

// Class to solve dependencies
class ExtensionDependencySolver {
  extensions: Extension[];

  extensionDependencies: { [extension: string]: string[] };

  constructor(extensions: Extension[]) {
    this.extensions = extensions;
    this.extensionDependencies = {};
    this.extensions.forEach((e: Extension) => {
      this.extensionDependencies[e.name] = [
        ...e.definition.dependencies.map(
          (dep) => DependencyStatement.fromString(dep).extension
        ),
      ];
    });
  }

  reverseDependenciesFor(extName: string) {
    return Object.entries(this.extensionDependencies)
      .map(([n, deps]) => {
        if (deps.indexOf(extName) !== -1) {
          return n;
        }
        return undefined;
      })
      .filter((v) => v !== undefined) as string[];
  }

  dependenciesFor(extName: string) {
    const result: string[] = [extName];

    const ed2 = JSON.parse(JSON.stringify(this.extensionDependencies));

    const todo: string[] = ed2[extName];
    const done: string[] = [];
    while (todo.length > 0) {
      const item = todo[0];

      if (done.indexOf(item) !== -1) {
        todo.splice(0, 1);
        // eslint-disable-next-line no-continue
        continue;
      }

      result.push(item);
      done.push(item);

      todo.splice(0, 1);
      ed2[item].forEach((dep: string) => todo.push(dep));
    }

    return new ExtensionDependencySolver(
      this.extensions.filter(
        (ext: Extension) => result.indexOf(ext.name) !== -1
      )
    ).solve();
  }

  solve() {
    // --[[ Python pseudocode:
    //     '''
    //     Dependency resolver

    // "arg" is a dependency dictionary in which
    // the values are the dependencies of their respective keys.
    // '''
    // d=dict((k, set(arg[k])) for k in arg)
    // r=[]
    // while d:
    //     # values not in keys (items without dep)
    //     t=set(i for v in d.values() for i in v)-set(d.keys())
    //     # and keys without value (items without dep)
    //     t.update(k for k, v in d.items() if not v)
    //     # can be done right away
    //     r.append(t)
    //     # and cleaned up
    //     d=dict(((k, v-t) for k, v in d.items() if v))
    // return r
    // --]]

    let d: { [key: string]: string[] } = JSON.parse(
      JSON.stringify(this.extensionDependencies)
    );

    const r = [];

    while (Object.keys(d).length > 0) {
      const t1 = new Set<string>();
      const t2 = new Set<string>();
      const t3 = new Set<string>();

      // eslint-disable-next-line no-restricted-syntax
      for (const extName of Object.keys(d)) {
        const deps = d[extName];

        t2.add(extName);

        if (deps.length === 0) {
          t3.add(extName);
        }

        deps.forEach((dep) => {
          t1.add(dep);
        });
      }

      const t: Set<string> = SetAdd<string>(SetSubtract(t1, t2), t3);

      // Returning arrays instead of set objects is nicer.
      r.push([...t].sort((a, b) => a.localeCompare(b)));

      const d2: { [key: string]: string[] } = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const extName of Object.keys(d)) {
        const deps = d[extName];
        if (deps.length > 0) {
          d2[extName] = [...SetSubtract(new Set(deps), t)];
        }
      }

      d = d2;
    }

    return r;
  }
}

export default ExtensionDependencySolver;
