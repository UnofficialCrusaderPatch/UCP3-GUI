import React, { ReactElement, useEffect, useState } from 'react';
import {
  useConfigurationDefaults,
  useConfigurationReducer,
  useConfigurationWarnings,
  useExtensionState,
  useSetConfigurationTouched,
} from 'hooks/jotai/globals-wrapper';
import { useTranslation } from 'react-i18next';
import * as bootstrap from 'bootstrap';
import {
  extensionsToOptionEntries,
  optionEntriesToHierarchical,
} from 'config/ucp/extension-util';
import { DisplayConfigElement, OptionEntry } from 'config/ucp/common';
import CreateUIElement from './CreateUIElement';
import CreateSection from './CreateSection';
import sanitizeID from '../sanitizeID';
import CreateSectionsNav from './CreateSectionsNav';

function CreateSections(args: { readonly: boolean }): {
  nav: ReactElement | null;
  content: ReactElement | null;
} {
  const extensionsState = useExtensionState();
  const { activeExtensions } = extensionsState;

  const optionEntries = extensionsToOptionEntries(activeExtensions).filter(
    (o: OptionEntry) => o.hidden === undefined || o.hidden === false
  );
  const definition = optionEntriesToHierarchical(optionEntries);
  const { readonly } = args;

  const [t] = useTranslation(['gui-editor']);

  useEffect(() => {
    // eslint-disable-next-line no-new
    new bootstrap.ScrollSpy(
      document.querySelector('#dynamicConfigPanel') as Element,
      {
        target: '#config-navbar',
        offset: 10,
        method: 'offset',
      }
    );
  });

  if (optionEntries.length === 0) {
    return { nav: null, content: null };
    // // Display message that no config options can be displayed
    // return (
    //   // <h3
    //   //   style={{
    //   //     display: 'flex',
    //   //     justifyContent: 'center',
    //   //     alignItems: 'center',
    //   //     textAlign: 'center',
    //   //     minHeight: '85vh',
    //   //   }}
    //   // >
    //   //   No extensions are active, so there are no options to display! Go to
    //   //   the Extensions tab to activate an Extension.
    //   // </h3>
    //   // eslint-disable-next-line react/jsx-no-useless-fragment
    //   <></>
    // );
  }

  const elements = (definition.elements as DisplayConfigElement[]).map(
    (el: DisplayConfigElement) => (
      <CreateUIElement
        key={el.url}
        spec={el as DisplayConfigElement}
        disabled={readonly}
        className=""
      />
    )
  );

  const children = Object.keys(definition.sections).map((key) => {
    const id = sanitizeID(`config-${key}`);
    return (
      <CreateSection
        key={id}
        level={1}
        header={key}
        contents={definition.sections[key]}
        identifier={id}
        readonly={readonly}
      />
    );
  });

  // https://getbootstrap.com/docs/5.0/components/scrollspy/#list-item-4
  return {
    nav: <CreateSectionsNav spec={definition} />,
    content: (
      <div
        // data-bs-spy="scroll"
        // data-bs-target="#config-navbar"
        // data-bs-offset="0"
        // // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        // tabIndex={0}
        id="config-sections"
      >
        <div id="config-General">
          <h1 id="config-General">{t('gui-editor:config.general')}</h1>
          {elements}
        </div>
        <div>{children}</div>
      </div>
    ),
  };
}

export default CreateSections;
