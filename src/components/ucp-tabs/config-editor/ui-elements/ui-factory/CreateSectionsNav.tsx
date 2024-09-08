import { SectionDescription } from '../../../../../config/ucp/common';
import NavSection from './navigation/NavSection';

import sanitizeID from '../sanitize-id';
import Text from '../../../../general/text';

function CreateSectionsNav(args: { spec: SectionDescription }) {
  const { spec } = args;

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
    <nav className="config-navbar ui-element">
      <a className="config-navbar__header" href="#config-general">
        <h6>
          <Text message="config.table.of.contents" />
        </h6>
      </a>
      <nav className="outline-border config-navbar__nav">
        {level1.length > 0 ? (
          <>
            <a className="config-navbar__link" href="#config-general">
              <Text message="config.general" />
            </a>
            {level1}
          </>
        ) : null}
      </nav>
    </nav>
  );
}

export default CreateSectionsNav;
