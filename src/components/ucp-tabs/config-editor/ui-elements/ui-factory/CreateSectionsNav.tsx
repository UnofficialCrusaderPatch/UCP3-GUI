import { Search } from 'react-bootstrap-icons';
import { useState } from 'react';
import { useAtom } from 'jotai';

import { SectionDescription } from '../../../../../config/ucp/common';
import NavSection from './navigation/NavSection';

import sanitizeID from '../sanitize-id';
import Message, { useMessage } from '../../../../general/message';
import { SEARCH_QUERY_ATOM } from './sections/atoms';

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

  const [searchToggle, setSearchToggle] = useState(true);

  const localize = useMessage();
  const searchWord = localize('search');

  const [searchQuery, setSearchQuery] = useAtom(SEARCH_QUERY_ATOM);

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
      {searchToggle ? (
        <div className="d-flex justify-content-start w-100 py-1">
          <input
            className="flex-grow-1"
            type="text"
            placeholder={searchWord}
            defaultValue={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      ) : null}
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
