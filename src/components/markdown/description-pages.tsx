import { useAtomValue } from 'jotai';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Extension } from '../../config/ucp/common';
import { extensionToID } from '../../function/extensions/dependency-management/dependency-resolution';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../function/extensions/state/state';
import { LANGUAGE_ATOM } from '../../function/gui-settings/settings';
import Message from '../general/message';
import { ResizeImage100PercentWidth } from '../ucp-tabs/common/markdown/images';
import { LinkRenderer, SaferMarkdown } from './safer-markdown';
import './description-pages.css';

const PAGE_LINK = '#page:';
const HINT_LINK = '#hint:';
const COLOR_LINK = '#color:';
const COLOR = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|[a-z]{3,20})$/i;
const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type Page = { text: string; extension: Extension };

// an opened page and its opener: the opener's name, and which of the `links`
// links to the page with that name it is
type Opened = { key: string; name: string; link: number; links: number };

type MarkdownNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { alt?: unknown; href?: unknown };
  children?: MarkdownNode[];
};

type Pages = {
  // the plugin that images of the shown page are read from
  source?: Extension;
  find: (key: string) => Page | undefined;
  open: (key: string, link: HTMLElement) => void;
};

const PagesContext = createContext<Pages>({
  find: () => undefined,
  open: () => {},
});

function ownString(record: Record<string, unknown> | undefined, key: string) {
  const value =
    record && Object.prototype.hasOwnProperty.call(record, key)
      ? record[key]
      : undefined;
  return typeof value === 'string' ? value : undefined;
}

// The decoded path and MIME type of a relative image inside the plugin
function pluginImage(src: string) {
  let path: string;
  try {
    path = decodeURIComponent(src);
  } catch {
    return undefined;
  }
  if (/[:\\]/.test(path) || path.startsWith('/')) return undefined;
  if (path.split('/').includes('..')) return undefined;
  const type = ownString(IMAGE_TYPES, path.split('.').pop()!.toLowerCase());
  return type === undefined ? undefined : { path, type };
}

// The image of a link that shows nothing but one image
function onlyImage(node: MarkdownNode | undefined) {
  const images: MarkdownNode[] = [];
  const empty = (child: MarkdownNode): boolean => {
    if (child.type === 'text') return !child.value?.trim();
    if (child.tagName === 'img') {
      images.push(child);
      return true;
    }
    return (child.children ?? []).every(empty);
  };
  return node !== undefined && empty(node) && images.length === 1
    ? images[0]
    : undefined;
}

// The first heading of a page
function pageTitle(text: string) {
  return text.match(/^#{1,6}[ \t]+(.+?)[ \t#]*$/m)?.[1];
}

function linkName(link: HTMLElement) {
  return link.getAttribute('aria-label') ?? link.textContent ?? '';
}

// The page links to `key` named `name`, in document order
function pageLinks(root: HTMLElement | null, key: string, name: string) {
  return Array.from(
    root?.querySelectorAll<HTMLElement>('[data-page]') ?? [],
  ).filter((link) => link.dataset.page === key && linkName(link) === name);
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function PluginImage(props: {
  extension: Extension;
  path: string;
  type: string;
  alt: string;
}) {
  const { extension, path, type, alt } = props;
  // null: the picture can't be read
  const [url, setUrl] = useState<string | null>();
  useEffect(() => {
    let current = true;
    setUrl(undefined);
    (async () => {
      try {
        const bytes = await extension.io.handle((eh) =>
          eh.getBinaryContents(path, MAX_IMAGE_BYTES),
        );
        if (current) setUrl(`data:${type};base64,${toBase64(bytes)}`);
      } catch {
        if (current) setUrl(null);
      }
    })();
    return () => {
      current = false;
    };
  }, [extension, path, type]);
  if (url === null) return <span>{alt}</span>;
  return url ? <ResizeImage100PercentWidth src={url} alt={alt} /> : null;
}

function PageImage(props: {
  src: string | undefined;
  alt: string | undefined;
}) {
  const { src = '', alt = '' } = props;
  const { source } = useContext(PagesContext);
  const image = pluginImage(src);
  if (source && image)
    return (
      <PluginImage
        extension={source}
        path={image.path}
        type={image.type}
        alt={alt}
      />
    );
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <ResizeImage100PercentWidth {...props} />;
}

// A rolled scroll tied around an arrow
function HintIcon() {
  return (
    <svg className="description-hint-icon" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 20 19 5M5 19l-2-4m2 4 4 2" />
      <path className="description-hint-head" d="M20 4l-6.5 1.5 5 5z" />
      <g transform="translate(11.5 12.5) rotate(-45)">
        <rect
          className="description-hint-scroll"
          x="-4"
          y="-2.25"
          width="8"
          height="4.5"
        />
        <ellipse className="description-hint-scroll" cx="-4" rx="1" ry="2.25" />
        <ellipse className="description-hint-scroll" cx="4" rx="1" ry="2.25" />
        <path className="description-hint-cord" d="M0-2.25v4.5" />
      </g>
    </svg>
  );
}

function hasHintLink(node: MarkdownNode | undefined): boolean {
  if (!node) return false;
  const href = node.properties?.href;
  if (
    node.tagName === 'a' &&
    typeof href === 'string' &&
    href.startsWith(HINT_LINK)
  ) {
    return true;
  }
  return (node.children ?? []).some(hasHintLink);
}

// A paragraph with a hint link is a div, so the hint's own blocks can open
// inside it.
function Paragraph(props: {
  node: MarkdownNode | undefined;
  children: ReactNode;
}) {
  const { node, children } = props;
  if (hasHintLink(node)) {
    return <div className="description-hint-host">{children}</div>;
  }
  return <p>{children}</p>;
}

function HintLink(props: { hint: Page; children: ReactNode }) {
  const { hint, children } = props;
  const pages = useContext(PagesContext);
  const hintPages = useMemo(
    () => ({ ...pages, source: hint.extension }),
    [pages, hint.extension],
  );
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="description-page-link description-hint"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <HintIcon />
        {children}
      </button>
      <div id={id} className="description-hint-text" hidden={!open}>
        {open && (
          <PagesContext.Provider value={hintPages}>
            {/* a hint's own links render through PageLink again */}
            {/* eslint-disable-next-line @typescript-eslint/no-use-before-define */}
            <SaferMarkdown components={COMPONENTS}>{hint.text}</SaferMarkdown>
          </PagesContext.Provider>
        )}
      </div>
    </>
  );
}

function PageLink(props: {
  href: string | undefined;
  children: ReactNode;
  node: MarkdownNode | undefined;
}) {
  const { href = '', children, node } = props;
  const { find, open } = useContext(PagesContext);
  if (href.startsWith(HINT_LINK)) {
    const hint = find(href.slice(HINT_LINK.length).toLowerCase());
    if (hint === undefined) return <span>{children}</span>;
    return <HintLink hint={hint}>{children}</HintLink>;
  }
  if (href.startsWith(PAGE_LINK)) {
    const key = href.slice(PAGE_LINK.length).toLowerCase();
    const target = find(key);
    if (target === undefined) return <span>{children}</span>;
    const image = onlyImage(node);
    const alt = image?.properties?.alt;
    const name =
      typeof alt === 'string' && alt.trim()
        ? alt.trim()
        : (pageTitle(target.text) ?? key);
    return (
      <button
        type="button"
        className={
          image
            ? 'description-page-link description-page-picture'
            : 'description-page-link'
        }
        // a picture's name, also while it loads: its alt text, else the page's title
        aria-label={image ? name : undefined}
        data-page={key}
        onClick={(event) => open(key, event.currentTarget)}
      >
        {children}
      </button>
    );
  }
  if (href.startsWith(COLOR_LINK)) {
    const color = href.slice(COLOR_LINK.length);
    return <span style={COLOR.test(color) ? { color } : {}}>{children}</span>;
  }
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <LinkRenderer {...props} />;
}

const COMPONENTS = { a: PageLink, img: PageImage, p: Paragraph };

// A plugin description with pages (#page:<key>), hints shown in place
// (#hint:<key>), coloured text (#color:<colour>) and images from the plugin
// folder; a page link showing only an image is a picture button. A page or
// hint is a locale value of the plugin or, if it has none, of its direct
// dependencies.
// eslint-disable-next-line import/prefer-default-export
export function DescriptionPages(props: {
  extension: Extension | undefined;
  children: string;
}) {
  const { extension, children } = props;
  const language = useAtomValue(LANGUAGE_ATOM);
  const { tree } = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);
  const [stack, setStack] = useState<Opened[]>([]);
  const top = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);

  // the page Back just closed
  const closed = useRef<Opened>();

  useEffect(() => setStack([]), [extension, children, language]);
  useEffect(() => {
    const returned = closed.current;
    closed.current = undefined;
    if (returned) {
      // the link that opened the closed page; this page when that link can't
      // be told apart any more
      const links = pageLinks(top.current, returned.key, returned.name);
      const target =
        (links.length === returned.links && links[returned.link]) ||
        top.current;
      target?.scrollIntoView({ block: 'nearest' });
      target?.focus({ preventScroll: true });
    } else if (stack.length > 0) {
      // a newly opened page starts at its top
      top.current?.scrollIntoView({ block: 'start' });
      back.current?.focus({ preventScroll: true });
    } else {
      top.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [stack]);

  const find = useMemo(() => {
    const dependencies =
      extension && tree.extensionsById[extensionToID(extension)]
        ? tree
            .nodeForExtension(extension)
            .edgesOut.map((edge) => edge.to && tree.extensionsById[edge.to.id])
            .filter((e): e is Extension => e !== undefined)
        : [];
    const chain = extension ? [extension, ...dependencies] : [];
    return (key: string) =>
      chain
        .flatMap((e) =>
          [language, 'en'].map((lang) => ({
            text: ownString(e.locales[lang], key),
            extension: e,
          })),
        )
        .find((page): page is Page => page.text !== undefined);
  }, [extension, tree, language]);
  const current = stack.at(-1)?.key;
  const page = useMemo(
    () => (current === undefined ? undefined : find(current)),
    [find, current],
  );

  const pages = useMemo<Pages>(
    () => ({
      source: page ? page.extension : extension,
      find,
      open: (key, link) => {
        const name = linkName(link);
        const links = pageLinks(top.current, key, name);
        setStack((opened) => [
          ...opened,
          { key, name, link: links.indexOf(link), links: links.length },
        ]);
      },
    }),
    [page, extension, find],
  );

  return (
    <PagesContext.Provider value={pages}>
      <div ref={top} tabIndex={-1}>
        {current !== undefined && (
          <button
            ref={back}
            type="button"
            className="description-page-back"
            onClick={() => {
              closed.current = stack.at(-1);
              setStack((opened) => opened.slice(0, -1));
            }}
          >
            <Message message="back" />
          </button>
        )}
        {/* another plugin, language or page starts with its hints closed */}
        <SaferMarkdown
          key={`${extension ? extensionToID(extension) : ''}:${language}:${stack.length}:${current ?? ''}`}
          components={COMPONENTS}
        >
          {page ? page.text : children}
        </SaferMarkdown>
      </div>
    </PagesContext.Provider>
  );
}
