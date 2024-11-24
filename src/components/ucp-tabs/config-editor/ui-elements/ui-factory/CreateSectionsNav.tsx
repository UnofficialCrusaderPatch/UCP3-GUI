import { Search } from 'react-bootstrap-icons';
import { useState } from 'react';

import { useAtomValue } from 'jotai';
import NavSection from './navigation/NavSection';

import sanitizeID from '../sanitize-id';
import Message from '../../../../general/message';
import { SearchBox } from './sections/SearchBox';
import { LOCALIZED_UI_HIERARCHICAL_ATOM } from './sections/filter';

function CreateSectionsNav() {
  const spec = useAtomValue(LOCALIZED_UI_HIERARCHICAL_ATOM);

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

  const [searchToggle, setSearchToggle] = useState(true);

  return (
    <div className="config-navbar ui-element">
      <div className="config-navbar__header d-flex justify-content-start w-100">
        <div className="flex-grow-1">
          <h6>
            <Message message="config.table.of.contents" />
          </h6>
        </div>
        <div>
          <Search onClick={() => setSearchToggle(!searchToggle)} />
        </div>
      </div>
      {searchToggle ? <SearchBox /> : null}
      <nav className="outline-border config-navbar__nav">
        {level1.length > 0 ? (
          <>
            <a className="config-navbar__link" href="#config-general">
              <Message message="config.general" />
            </a>
            {level1}
          </>
        ) : null}
      </nav>
    </div>
  );
}

export default CreateSectionsNav;
