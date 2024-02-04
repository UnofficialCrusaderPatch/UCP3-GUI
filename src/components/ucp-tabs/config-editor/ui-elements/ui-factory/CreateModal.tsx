import '../../../../sandbox-menu/sandbox-menu.css';

import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  DisplayConfigElement,
  ModalDisplayConfigElement,
} from '../../../../../config/ucp/common';
import {
  OverlayContentProps,
  setOverlayContent,
} from '../../../../overlay/overlay';
// eslint-disable-next-line import/no-cycle
import CreateUIElement from './CreateUIElement';

interface ModalContentArgs {
  children: DisplayConfigElement[];
  title: string;
}

function ModalContent(props: OverlayContentProps<ModalContentArgs>) {
  const { args } = props;
  const { children, title } = args;
  return (
    <div className="sandbox-menu-container">
      {!title ? null : <h1 className="sandbox-menu-title">{title}</h1>}
      <div className="outline-border sandbox-container">
        {children.map((child) => (
          <CreateUIElement
            key={child.name}
            spec={child}
            className=""
            disabled={false}
          />
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line import/prefer-default-export
export function CreateModal(args: {
  spec: ModalDisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [t] = useTranslation(['gui-editor']);
  const [, setActivatingMenu] = useState(false);

  const { spec } = args;
  const { header, children, name } = spec;

  return (
    <button
      type="button"
      id={`${name}-sandbox`}
      className="ucp-button sandbox-menu-button"
      onClick={async () => {
        setActivatingMenu(true);
        setOverlayContent<ModalContentArgs>(ModalContent, true, true, {
          children,
          title: header,
        });
        setActivatingMenu(false);
      }}
    >
      {t('gui-editor:sandbox.open')}
    </button>
  );
}
