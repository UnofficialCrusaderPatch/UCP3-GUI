import { DisplayConfigElement, Extension } from '../../../../config/ucp/common';

// eslint-disable-next-line import/prefer-default-export
export const attachExtensionInformationToDisplayConfigElement = (
  extension: Extension,
  obj: unknown,
) => {
  // This code makes the extension read only to some extent, but more importantly, by excluding .ui, it avoids recursive errors
  const { ui, ...rest } = { ...extension };
  const ext: Extension = { ...rest, ui: [] };

  const todo: unknown[] = [];
  const done: unknown[] = [];

  todo.push(obj);

  while (todo.length > 0) {
    const current = todo.pop();

    if (done.indexOf(current) !== -1) {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (current instanceof Array) {
      current.forEach((v) => todo.push(v));
    } else if (current instanceof Object) {
      // Assume something is a display config element
      if ((current as DisplayConfigElement).display !== undefined) {
        const dce = current as DisplayConfigElement;

        dce.extension = ext;

        if (dce.display === 'Group' || dce.display === 'GroupBox') {
          if (dce.children !== undefined && dce.children instanceof Array) {
            // Assume it is a DisplayConfigElement
            dce.children.forEach((v) => todo.push(v));
          }
        }
      }
    } else {
      // throw Error((obj as any).toString());
    }

    done.push(current);
  }
};
