import { ReactElement } from 'react';
import { useAtomValue } from 'jotai';
import {
  DisplayConfigElement,
  UrlableDisplayConfigElement,
} from '../../../../../config/ucp/common';
import CreateUIElement from './CreateUIElement';
import CreateSection from './CreateSection';
import sanitizeID from '../sanitize-id';
import Message from '../../../../general/message';
import CreateSectionsNav from './CreateSectionsNav';
import { LOCALIZED_UI_HIERARCHICAL_ATOM } from './sections/filter';
import { LOCALIZED_UI_OPTION_ENTRIES_ATOM } from './sections/localized-options';

function CreateSections(args: { readonly: boolean }): {
  nav: ReactElement | null;
  content: ReactElement | null;
} {
  const optionEntries = useAtomValue(LOCALIZED_UI_OPTION_ENTRIES_ATOM);
  const definition = useAtomValue(LOCALIZED_UI_HIERARCHICAL_ATOM);
  const { readonly } = args;

  if (optionEntries.length === 0) {
    return { nav: <CreateSectionsNav spec={definition} />, content: null };
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
        key={(el as UrlableDisplayConfigElement).url || el.name}
        spec={el as DisplayConfigElement}
        disabled={readonly}
        className=""
      />
    ),
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
        <div id="config-general">
          <h1>
            <Message message="config.general" />
          </h1>
          {elements}
        </div>
        <div>{children}</div>
      </div>
    ),
  };
}

export default CreateSections;
