import { describe, expect, it } from 'vitest';
import { Dependency, Package, Tree } from 'lean-resolution';
import { DependencyTree, VisitingTree } from './dependency-resolution';

const pkg = (id: string, dependencies: Record<string, string> = {}) => {
  const [name, version] = id.split('@');
  return new Package(
    name,
    version,
    Object.entries(dependencies).map(([n, range]) => new Dependency(n, range)),
  );
};
const tree = (...packages: Package[]) =>
  new DependencyTree(packages, '1.0.17', '3.0.7');

// lean-resolution's own walk would follow each of these without end
describe('dependency tree on a cycle', () => {
  const cyclic = () =>
    tree(
      pkg('a@1.0.0', { b: '*' }),
      pkg('b@1.0.0', { a: '>=1.0.0' }),
      pkg('c@1.0.0'),
    );

  it('reports a cycle in the first targets for one package', () => {
    expect(cyclic().dependenciesFor('a@1.0.0').status).toBe('ERROR');
  });
  it('reports a cycle in the first targets for several packages', () => {
    const solution = cyclic().dependenciesForMultiple(['c@1.0.0', 'b@1.0.0']);
    expect(solution.status).toBe('ERROR');
  });
  it('still solves what does not reach the cycle', () => {
    const solution = cyclic().dependenciesForMultiple(['c@1.0.0']);
    expect(solution.status).toBe('OK');
    expect(solution.packages.map((p) => p.id)).toEqual(['c@1.0.0']);
  });
  it('reports a cycle that only the conflict solver reaches', () => {
    // First targets b@2.0.0 and b@1.8.0; the only common b needs a
    const solution = tree(
      pkg('a@1.0.0', { b: '<=1.5.0 || >=2.0.0', c: '*' }),
      pkg('c@1.0.0', { b: '<=1.8.0' }),
      pkg('b@2.0.0'),
      pkg('b@1.8.0'),
      pkg('b@1.5.0', { a: '*' }),
    ).dependenciesFor('a@1.0.0');
    expect(solution.status).toBe('ERROR');
  });
  it('reports a cycle that only the brute-force search reaches', () => {
    // First target b@1.2.0 conflicts on shared; the older b needs a
    const solution = tree(
      pkg('a@1.0.0', { b: '^1.0.0', c: '^1.0.0' }),
      pkg('c@1.0.0', { shared: '^1.0.0' }),
      pkg('b@1.2.0', { shared: '^2.0.0' }),
      pkg('b@1.1.0', { shared: '^1.0.0', a: '^1.0.0' }),
      pkg('shared@1.0.0'),
      pkg('shared@2.0.0'),
    ).dependenciesFor('a@1.0.0');
    expect(solution.status).toBe('ERROR');
  });
});

describe('dependency tree walk', () => {
  it('walks a deep shared graph once per package', () => {
    // 2^30 paths from the top: each layer's pair needs the next layer's pair
    const depth = 30;
    const layer = (i: number) =>
      i === depth ? {} : { [`x${i + 1}`]: '*', [`y${i + 1}`]: '*' };
    const packages = Array.from({ length: depth + 1 }, (_, i) => [
      pkg(`x${i}@1.0.0`, layer(i)),
      pkg(`y${i}@1.0.0`, layer(i)),
    ]).flat();
    const solution = tree(...packages).dependenciesFor('x0@1.0.0');
    expect(solution.status).toBe('OK');
    expect(solution.packages).toHaveLength(2 * depth + 1);
  });

  it('returns what the library walk returns, in the same order', () => {
    const repository = () => [
      pkg('top@1.0.0', { left: '*', right: '*', leaf: '*' }),
      pkg('left@1.0.0', { shared: '*', framework: '*' }),
      pkg('right@1.0.0', { shared: '*', other: '*' }),
      pkg('shared@1.0.0', { leaf: '*' }),
      pkg('other@1.0.0', { leaf: '*' }),
      pkg('leaf@1.0.0'),
      pkg('framework@3.0.7'),
    ];
    const walk = (t: Tree) => {
      t.setInitialTargetForAllEdges();
      return t
        .allDependenciesForNode(t.nodeForID('top@1.0.0'))
        .map((n) => n.id);
    };
    const visiting = walk(new VisitingTree(repository()));
    expect(visiting).toEqual(walk(new Tree(repository())));
    expect(visiting).toHaveLength(7);
  });

  it('still rejects an unresolved edge unless allowed', () => {
    const t = new VisitingTree([pkg('a@1.0.0', { missing: '*' })]);
    t.setInitialTargetForAllEdges();
    const a = t.nodeForID('a@1.0.0');
    expect(() => t.allDependenciesForNode(a)).toThrow('unresolved edge');
    expect(t.allDependenciesForNode(a, { allowUnresolvedEdges: true })).toEqual(
      [a],
    );
  });

  it('reports an unknown package as an error', () => {
    const t = tree(pkg('a@1.0.0'));
    expect(t.dependenciesForMultiple(['missing@1.0.0']).status).toBe('ERROR');
  });
});
