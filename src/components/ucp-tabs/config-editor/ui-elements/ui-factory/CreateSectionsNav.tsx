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
        {t('gui-editor:config.table.of.contents')}
      </a>
      <nav className="config-navbar__nav">
        <a className="config-navbar__link" href="#config-general">
          {t('gui-editor:config.general')}
        </a>
        {level1}
      </nav>
    </nav>
  );
}

export default CreateSectionsNav;
