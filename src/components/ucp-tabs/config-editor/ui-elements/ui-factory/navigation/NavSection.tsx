import { SectionDescription } from 'config/ucp/common';
import sanitizeID from '../../sanitizeID';

function NavSection(navArgs: {
  subspec: SectionDescription;
  header: string;
  href: string;
  depth: number;
}) {
  const { subspec, header, href, depth } = navArgs;
  const iClassName = `nav nav-pills flex-column`;
  const style = { marginLeft: `${depth / 2}rem` };
  return (
    <>
      <a className="nav-link" href={href}>
        {header}
      </a>
      <nav className={iClassName} style={style}>
        {Object.keys(subspec.sections).map((key) => {
          const id = sanitizeID(`${href}-${key}`);
          return (
            <NavSection
              key={id}
              subspec={subspec.sections[key]}
              header={key}
              href={id}
              depth={depth + 1}
            />
          );
        })}
      </nav>
    </>
  );
}

export default NavSection;
