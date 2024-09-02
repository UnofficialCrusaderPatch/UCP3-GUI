import Markdown from 'react-markdown';
import { ResizeImage100PercentWidth } from '../ucp-tabs/common/markdown/images';

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
  const { children, ...other } = props;
  return (
    <Markdown
      components={{ a: LinkRenderer, img: ResizeImage100PercentWidth }}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...other}
    >
      {children}
    </Markdown>
  );
}
