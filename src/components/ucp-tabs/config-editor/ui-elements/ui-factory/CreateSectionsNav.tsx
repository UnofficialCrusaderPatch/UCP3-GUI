import { SectionDescription } from 'config/ucp/common';
import { useTranslation } from 'react-i18next';
import NavSection from './navigation/NavSection';

import sanitizeID from '../sanitizeID';

function CreateSectionsNav(args: { spec: SectionDescription }) {
  const { spec } = args;

  const [t] = useTranslation(['gui-editor']);
  const level1 = Object.keys(spec.sections).map((key) => {
    const id = sanitizeID(`#config-${key}`);
    return (
      <NavSection
        key={id}
        subspec={spec.sections[key]}
        header={key}
        href={id}
        depth={1}
      />
    );
  });

  return (
    <nav className="config-navbar">
      <a className="config-navbar__header" href="#config-general">
        <h6>{t('gui-editor:config.table.of.contents')}</h6>
      </a>
      <nav className="outline-border config-navbar__nav">
        {level1.length > 0 ? (
          <>
            <a className="config-navbar__link" href="#config-general">
              {t('gui-editor:config.general')}
            </a>
            {level1}
          </>
        ) : null}
      </nav>
    </nav>
  );
}

export default CreateSectionsNav;
