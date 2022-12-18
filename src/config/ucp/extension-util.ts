import { Discovery } from 'function/extensions/discovery';
import {
  DisplayConfigElement,
  Extension,
  OptionEntry,
  SectionDescription,
} from './common';

const extensionsCache: { [key: string]: Extension[] } = {};
export async function getExtensions(gameFolder: string, locale?: string) {
  return Discovery.discoverExtensions(gameFolder, locale);
  // Premature optimization is the root of all evil.
  if (extensionsCache[gameFolder] === undefined) {
    extensionsCache[gameFolder] = await Discovery.discoverExtensions(
      gameFolder
    );
  }
  return extensionsCache[gameFolder];
}

export function optionEntriesToHierarchical(
  uiCollection: OptionEntry[]
): SectionDescription {
  const result: {
    elements: DisplayConfigElement[];
    sections: { [key: string]: SectionDescription };
  } = { elements: [], sections: {} };

  uiCollection.forEach((ui) => {
    if (ui.category !== undefined) {
      let e: {
        elements: DisplayConfigElement[];
        sections: { [key: string]: SectionDescription };
      } = result;
      ui.category.forEach((cat: string) => {
        if (e.sections[cat] === undefined) {
          e.sections[cat] = { elements: [], sections: {} };
        }
        e = e.sections[cat] as {
          elements: DisplayConfigElement[];
          sections: { [key: string]: SectionDescription };
        };
      });
      const f = e;
      f.elements.push(ui as unknown as DisplayConfigElement);
    } else {
      result.elements.push(ui as unknown as DisplayConfigElement);
    }
  });

  return result;
}

export function extensionsToOptionEntries(exts: Extension[]) {
  const uiCollection: any[] = [];
  exts.forEach((ext) => {
    uiCollection.push(...ext.ui);
  });
  uiCollection.sort((a, b) => {
    if (a.category === undefined || b.category === undefined) return 0;
    for (
      let i = 0;
      i < Math.min(a.category.length, b.category.length);
      i += 1
    ) {
      const comp = a.category[i].localeCompare(b.category[i]);
      if (comp !== 0) {
        if (a.category[i] === 'Advanced') return 1;
        if (b.category[i] === 'Advanced') return -1;
        return comp;
      }
    }
    return 0;
  });
  return uiCollection;
}
