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
    <nav
      id="config-navbar"
      className="navbar navbar-dark bg-dark flex-column align-items-stretch justify-content-start p-3 h-100 flex-nowrap"
    >
      <a className="navbar-brand" href="#config-General">
        {t('gui-editor:config.table.of.contents')}
      </a>
      <nav className="nav nav-pills flex-column overflow-auto flex-nowrap">
        <a className="nav-link" href="#config-General">
          {t('gui-editor:config.general')}
        </a>
        {level1}
      </nav>
    </nav>
  );
}

export default CreateSectionsNav;
