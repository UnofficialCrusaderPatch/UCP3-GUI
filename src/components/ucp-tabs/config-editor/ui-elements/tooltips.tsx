import { Tooltip } from 'react-bootstrap';

function formatToolTip(tooltip: string, url: string) {
  if (tooltip === undefined || tooltip === '') {
    return `key: ${url}`;
  }
  return `${tooltip}\n\nurl:${url}`;
}

const renderTooltip = (props: { [key: string]: unknown }) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <Tooltip {...(props as object)}>{props.tooltipText as string}</Tooltip>
);

export { formatToolTip, renderTooltip };
