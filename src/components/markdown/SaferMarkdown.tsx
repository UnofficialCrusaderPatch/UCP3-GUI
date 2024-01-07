import Markdown from 'react-markdown';

function LinkRenderer(props: any) {
  const { href, children } = props;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

// eslint-disable-next-line import/prefer-default-export
export function SaferMarkdown(props: any) {
  const { children } = props;
  return <Markdown components={{ a: LinkRenderer }}>{children}</Markdown>;
}
