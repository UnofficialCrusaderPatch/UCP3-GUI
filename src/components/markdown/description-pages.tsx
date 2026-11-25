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

type Page = { text: string; extension: Extension };

type Pages = {
  // the plugin that images of the shown page are read from
  source?: Extension;
  find: (key: string) => Page | undefined;
  open: (key: string) => void;
};

const PagesContext = createContext<Pages>({
  find: () => undefined,
  open: () => {},
});

// The MIME type of a relative image path inside the plugin, or undefined
function pluginImageType(src: string) {
  if (/[:\\]/.test(src) || src.startsWith('/')) return undefined;
  if (src.split('/').includes('..')) return undefined;
  return IMAGE_TYPES[src.split('.').pop()!.toLowerCase()];
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
  src: string;
  alt: string;
}) {
  const { extension, src, alt } = props;
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let current = true;
    setUrl(undefined);
    (async () => {
      try {
        const bytes = await extension.io.handle((eh) =>
          eh.getBinaryContents(src),
        );
        if (current)
          setUrl(`data:${pluginImageType(src)};base64,${toBase64(bytes)}`);
      } catch {
        // a missing picture leaves the page without it
      }
    })();
    return () => {
      current = false;
    };
  }, [extension, src]);
  return url ? <ResizeImage100PercentWidth src={url} alt={alt} /> : null;
}

function PageImage(props: {
  src: string | undefined;
  alt: string | undefined;
}) {
  const { src = '', alt = '' } = props;
  const { source } = useContext(PagesContext);
  if (source && pluginImageType(src))
    return <PluginImage extension={source} src={src} alt={alt} />;
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <ResizeImage100PercentWidth {...props} />;
}

function PageLink(props: { href: string | undefined; children: ReactNode }) {
  const { href = '', children } = props;
  const { find, open } = useContext(PagesContext);
  if (href.startsWith(PAGE_LINK)) {
    const key = href.slice(PAGE_LINK.length).toLowerCase();
    if (find(key) === undefined) return null;
    return (
      <button
        type="button"
        className="description-page-link"
        onClick={() => open(key)}
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
// (#color:<colour>) and images from the plugin folder. A page is a locale
// value of the plugin or, if it has none, of its direct dependencies.
// eslint-disable-next-line import/prefer-default-export
export function DescriptionPages(props: {
  extension: Extension | undefined;
  children: string;
}) {
  const { extension, children } = props;
  const language = useAtomValue(LANGUAGE_ATOM);
  const { extensions, activeExtensions } = useAtomValue(
    EXTENSION_STATE_REDUCER_ATOM,
  );
  const [stack, setStack] = useState<string[]>([]);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => setStack([]), [extension, children]);
  useEffect(() => top.current?.scrollIntoView({ block: 'nearest' }), [stack]);

  const find = useMemo(() => {
    const chain = extension
      ? [
          extension,
          ...Object.keys(extension.definition.dependencies ?? {})
            .map(
              (name) =>
                activeExtensions.find((e) => e.name === name) ??
                extensions.find((e) => e.name === name),
            )
            .filter((e): e is Extension => e !== undefined),
        ]
      : [];
    return (key: string) =>
      [language, 'en']
        .flatMap((lang) =>
          chain.map((e) => ({ text: e.locales[lang]?.[key], extension: e })),
        )
        .find((page): page is Page => page.text !== undefined);
  }, [extension, extensions, activeExtensions, language]);
  const current = stack.at(-1);
  const page = useMemo(
    () => (current === undefined ? undefined : find(current)),
    [find, current],
  );

  const pages = useMemo<Pages>(
    () => ({
      source: page ? page.extension : extension,
      find,
      open: (key) => setStack((opened) => [...opened, key]),
    }),
    [page, extension, find],
  );

  return (
    <PagesContext.Provider value={pages}>
      <div ref={top}>
        {current !== undefined && (
          <button
            type="button"
            className="description-page-back"
            onClick={() => setStack((opened) => opened.slice(0, -1))}
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
