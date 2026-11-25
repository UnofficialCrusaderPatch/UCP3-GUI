/* eslint-disable import/no-extraneous-dependencies */
import { useState } from 'react';
import type { Node as DependencyNode } from 'lean-resolution';
import { Extension } from '../../../../config/ucp/common';
import {
  ExtensionDependencyTree,
  extensionToID,
} from '../../../../function/extensions/dependency-management/dependency-resolution';
import Message from '../../../general/message';
import './extension-relations.css';

type Direction = 'dependencies' | 'dependents';
type Context = {
  tree: ExtensionDependencyTree;
  activeIDs: Set<string>;
  direction: Direction;
};
type Relation = { id: string; label: string; node?: DependencyNode };

function labelFor(node: DependencyNode, tree: ExtensionDependencyTree) {
  const extension = tree.extensionsById[node.id];
  return `${extension?.definition['display-name'] || node.spec.name} (${node.spec.version.raw})`;
}

function relationsFor(node: DependencyNode, context: Context): Relation[] {
  const { tree, activeIDs, direction } = context;
  if (direction === 'dependencies') {
    return node.edgesOut.map((edge) => ({
      id: edge.id,
      label: edge.to
        ? labelFor(edge.to, tree)
        : `${edge.spec.name} (${edge.spec.versionRange.raw})`,
      node: edge.to,
    }));
  }
  return node.edgesIn
    .filter((edge) => activeIDs.has(edge.from.id))
    .map((edge) => ({
      id: edge.id,
      label: labelFor(edge.from, tree),
      node: edge.from,
    }));
}

function RelationBranch({
  relation,
  context,
  ancestors,
}: {
  relation: Relation;
  context: Context;
  ancestors: string[];
}) {
  const [open, setOpen] = useState(false);
  const { node, label } = relation;
  if (!node) {
    return (
      <li>
        {label} — <Message message="extensions.viewer.relations.unresolved" />
      </li>
    );
  }
  if (ancestors.includes(node.id)) {
    return (
      <li>
        {label} — <Message message="extensions.viewer.relations.cycle" />
      </li>
    );
  }
  const children = relationsFor(node, context);
  return (
    <li>
      {children.length === 0 ? (
        label
      ) : (
        <details onToggle={(event) => setOpen(event.currentTarget.open)}>
          <summary>{label}</summary>
          {open && (
            <ul>
              {children.map((child) => (
                <RelationBranch
                  key={child.id}
                  relation={child}
                  context={context}
                  ancestors={[...ancestors, node.id]}
                />
              ))}
            </ul>
          )}
        </details>
      )}
    </li>
  );
}

export default function ExtensionRelations({
  extension,
  tree,
  activeExtensions,
}: {
  extension: Extension;
  tree: ExtensionDependencyTree;
  activeExtensions: Extension[];
}) {
  const [open, setOpen] = useState(false);
  if (!tree.extensionsById[extensionToID(extension)]) return null;
  const node = tree.nodeForExtension(extension);
  const activeIDs = new Set(activeExtensions.map(extensionToID));
  const directions: Direction[] = ['dependencies', 'dependents'];
  const columns = directions.map((direction) => {
    const context = { tree, activeIDs, direction };
    return { context, relations: relationsFor(node, context) };
  });
  if (columns.every(({ relations }) => relations.length === 0)) return null;

  return (
    <details
      className="extension-relations"
      onToggle={(event) => {
        if (event.target === event.currentTarget) {
          setOpen(event.currentTarget.open);
        }
      }}
    >
      <summary>
        <Message message="extensions.viewer.relations" />
      </summary>
      {open && (
        <div className="extension-relations-columns">
          {columns.map(({ context, relations }) => (
            <section key={context.direction}>
              <h2>
                <Message
                  message={`extensions.viewer.relations.${context.direction}`}
                />
              </h2>
              {relations.length === 0 ? (
                <p>
                  <Message message="extensions.viewer.relations.none" />
                </p>
              ) : (
                <ul>
                  {relations.map((relation) => (
                    <RelationBranch
                      key={relation.id}
                      relation={relation}
                      context={context}
                      ancestors={[node.id]}
                    />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </details>
  );
}
