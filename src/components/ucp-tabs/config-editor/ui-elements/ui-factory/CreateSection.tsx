import React, { ReactElement, useEffect, useState } from 'react';

import type {
  DisplayConfigElement,
  SectionDescription,
} from 'config/ucp/common';

import CreateUIElement from './CreateUIElement';

import sanitizeID from '../sanitizeID';

function CreateSection(args: {
  level: number;
  header: string;
  contents: SectionDescription;
  identifier: string;
  readonly: boolean;
}) {
  const { level, identifier, header, contents, readonly } = args;
  const elements = (contents.elements as DisplayConfigElement[]).map(
    (el: DisplayConfigElement) => {
      const key = el.url || `${identifier}-${el.name}`;
      return (
        <CreateUIElement
          key={key}
          spec={el as DisplayConfigElement}
          disabled={readonly}
          className="pt-1"
        />
      );
    },
  );

  const htmlHeader = React.createElement(`h${level + 1}`, {}, header);

  const childKeys = Object.keys(contents.sections);
  const children = childKeys.map((key) => {
    const id = sanitizeID(`${identifier}-${key}`);
    return (
      <CreateSection
        key={id}
        level={level + 1}
        header={key}
        contents={contents.sections[key]}
        identifier={id}
        readonly={readonly}
      />
    );
  });

  return (
    // ${level / 4}rem
    <div
      key={identifier}
      id={identifier}
      style={{ marginLeft: `0rem`, paddingTop: `${(10 - level) * 0.1}rem` }}
    >
      {htmlHeader}
      <div style={{ marginLeft: '0rem', marginBottom: '0.0rem' }}>
        {elements}
      </div>
      {children}
    </div>
  );
}

export default CreateSection;
