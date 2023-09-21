import { warn } from 'util/scripts/logging';
import { Range, SemVer, satisfies } from 'semver';
import { Extension } from './common';
import { DependencyStatement } from './dependency-statement';

const MATCHER_SIMPLE_START = /^([a-zA-Z0-9-_]+)/;
const LEGAL_OPERATORS = ['>=', '=='];

function checkForIllegalDependencyStatements(ext: Extension) {
  const illegalOperators = ext.definition.dependencies.filter(
    (dep) =>
      LEGAL_OPERATORS.indexOf(DependencyStatement.fromString(dep).operator) ===
      -1
  );

  if (illegalOperators.length > 0) {
    warn(
      `${
        ext.name
      } contains dependency statements with illegal operators: ${JSON.stringify(
        illegalOperators
      )}`
    );
  }
}

function SetSubtract<Type>(s1: Set<Type>, s2: Set<Type>): Set<Type> {
  return new Set([...s1].filter((x) => !s2.has(x)));
}

function SetAdd<Type>(s1: Set<Type>, s2: Set<Type>): Set<Type> {
  return new Set([...s1, ...s2]);
}

type NameRangePair = { extensionName: string; range: Range };

// Class to solve dependencies
class ExtensionVersionedDependencySolver {
  extensions: Extension[];

  extensionDependencies: { [extension: string]: NameRangePair[] };

  constructor(extensions: Extension[]) {
    this.extensions = extensions;
    this.extensionDependencies = {};
    this.extensions.forEach((e: Extension) => {
      this.extensionDependencies[`${e.name}-${e.version}`] =
        e.definition.dependencies.map((dep) => {
          const matches = MATCHER_SIMPLE_START.exec(dep);
          if (matches === null) {
            throw Error(`Invalid dependency statement: ${dep}`);
          }

          const extensionName = matches[1];

          const cleanedDep = dep
            .replaceAll('==', ' == ')
            .replaceAll('>=', ' >= ');

          return {
            extensionName,
            range: new Range(cleanedDep, { loose: true }),
          };
        });
    });

    this.extensions.forEach((e) => checkForIllegalDependencyStatements(e));

    // Not possible because a subset might be desired outcome. This just checks alll...
    // const missing = this.getMissingDependencies();
    // if (missing.length > 0) {
    //   throw Error(`Missing the following dependencies: ${missing.join(', ')}`);
    // }
  }

  getMissingDependencies() {
    return Object.entries(this.extensionDependencies)
      .map(([extensionName, dependencies]) => dependencies)
      .flat()
      .filter(
        (spec) =>
          this.extensions
            .filter((e) => e.name === spec.extensionName)
            .filter((e) => satisfies(e.version, spec.range) === true).length ===
          0
      );
  }

  reverseDependenciesFor(extSpec: string) {
    return Object.entries(this.extensionDependencies)
      .map(([n, deps]) => {
        if (deps.indexOf(extSpec) !== -1) {
          return n;
        }
        return undefined;
      })
      .filter((v) => v !== undefined) as string[];
  }

  tryDependenciesFor(extSpec: string) {
    const messages: string[] = [];
    const result: string[] = [extSpec];

    const ed2 = JSON.parse(JSON.stringify(this.extensionDependencies));

    const todo: string[] = ed2[extSpec];
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
      if (ed2[item] === undefined) {
        messages.push(`Missing extension dependency: ${item}`);
      }
      (ed2[item] || []).forEach((dep: string) => todo.push(dep));
    }

    return messages;
  }

  dependenciesFor(extSpec: string) {
    const result: string[] = [extSpec];

    const ed2 = JSON.parse(JSON.stringify(this.extensionDependencies));

    const todo: string[] = ed2[extSpec];
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
      if (ed2[item] === undefined) {
        warn(`Missing extension dependency: ${item}`);
      }
      (ed2[item] || []).forEach((dep: string) => todo.push(dep));
    }

    return new ExtensionVersionedDependencySolver(
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

export default ExtensionVersionedDependencySolver;
