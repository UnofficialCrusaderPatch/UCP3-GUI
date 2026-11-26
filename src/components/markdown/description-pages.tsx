import { useAtomValue } from 'jotai';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
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

// an opened page and which of the links to it opened it
type Opened = { key: string; link: number };

type MarkdownNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { alt?: unknown };
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

// The page links to `key`, in document order
function pageLinks(root: HTMLElement | null, key: string) {
  return Array.from(
    root?.querySelectorAll<HTMLElement>('[data-page]') ?? [],
  ).filter((link) => link.dataset.page === key);
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

function PageLink(props: {
  href: string | undefined;
  children: ReactNode;
  node: MarkdownNode | undefined;
}) {
  const { href = '', children, node } = props;
  const { find, open } = useContext(PagesContext);
  if (href.startsWith(PAGE_LINK)) {
    const key = href.slice(PAGE_LINK.length).toLowerCase();
    if (find(key) === undefined) return <span>{children}</span>;
    const image = onlyImage(node);
    const alt = image?.properties?.alt;
    return (
      <button
        type="button"
        className={
          image
            ? 'description-page-link description-page-picture'
            : 'description-page-link'
        }
        // the picture's name, also while it loads
        aria-label={typeof alt === 'string' && alt ? alt : undefined}
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

const COMPONENTS = { a: PageLink, img: PageImage };

// A plugin description with pages (#page:<key>), coloured text
// (#color:<colour>) and images from the plugin folder; a page link showing
// only an image is a picture button. A page is a locale value of the plugin
// or, if it has none, of its direct dependencies.
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
      // the link that opened the closed page, or this page when it is gone
      const target =
        pageLinks(top.current, returned.key)[returned.link] ?? top.current;
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
        const position = pageLinks(top.current, key).indexOf(link);
        setStack((opened) => [...opened, { key, link: position }]);
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
        <SaferMarkdown components={COMPONENTS}>
          {page ? page.text : children}
        </SaferMarkdown>
      </div>
    </PagesContext.Provider>
  );
}
