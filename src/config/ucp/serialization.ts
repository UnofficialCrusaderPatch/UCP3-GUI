import { Definition } from './common';
import { UCP3SerializedDefinition } from './config-files/config-files';

// eslint-disable-next-line import/prefer-default-export
export function serializeDefinition(definition: Definition) {
  return {
    ...definition,
    dependencies: Object.fromEntries(
      Object.entries(definition.dependencies).map(([name, r]) => [name, r.raw]),
    ),
  } as UCP3SerializedDefinition;
}

// Handled in Discovery.ts
// export const deserializeDefinition = (text: string) => {
//   const parsed = yaml.parseDocument(
//     text,
//   ) as unknown as UCP3SerializedDefinition;
//   if (
//     parsed.dependencies !== undefined &&
//     parsed.dependencies instanceof Array
//   ) {
//     return {
//       ...parsed,
//       dependencies: Object.fromEntries(
//         parsed.dependencies.map((s) => {
//           const ds = DependencyStatement.fromString(s);
//           return [
//             ds.extension,
//             new semver.Range(`${ds.operator} ${ds.version}`, { loose: true }),
//           ];
//         }),
//       ),
//     } as Definition;
//   }
//   if (
//     parsed.dependencies !== undefined &&
//     parsed.dependencies instanceof Object
//   ) {
//     return {
//       ...parsed,
//       dependencies: Object.fromEntries(
//         Object.entries(parsed.dependencies).map(([k, v]) => [
//           k,
//           new semver.Range(`${v}`),
//         ]),
//       ),
//     } as Definition;
//   }

//   throw Error(`Cannot deserialize definition`);
// };
