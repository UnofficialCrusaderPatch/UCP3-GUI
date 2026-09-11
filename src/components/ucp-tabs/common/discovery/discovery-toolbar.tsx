import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { Funnel, FunnelFill } from 'react-bootstrap-icons';
import { LANGUAGE_ATOM } from '../../../../function/gui-settings/settings';
import { DiscoveryFilter } from '../../../../function/content/discovery/search';
import { useMessage } from '../../../general/message';
import './discovery.css';

type FilterProps = {
  filter: DiscoveryFilter;
  onChange: (filter: DiscoveryFilter) => void;
};

export function DiscoverySearch({
  filter,
  onChange,
  pending,
  incomplete,
}: FilterProps & {
  pending: number;
  incomplete: number;
}) {
  const localize = useMessage();
  const language = useAtomValue(LANGUAGE_ATOM);
  const queryClient = useQueryClient();
  const id = useId();
  return (
    <div
      className="discovery-toolbar"
      dir={language === 'fa' ? 'rtl' : undefined}
    >
      <label className="discovery-search" htmlFor={`${id}-search`}>
        <span className="visually-hidden">{localize('discovery.search')}</span>
        <input
          type="search"
          dir="auto"
          id={`${id}-search`}
          value={filter.search}
          placeholder={localize('discovery.search')}
          onChange={(event) =>
            onChange({ ...filter, search: event.target.value })
          }
        />
      </label>
      <label
        className="discovery-sword discovery-whole-words"
        title={localize('discovery.wholeWords.help')}
        htmlFor={`${id}-words`}
      >
        <input
          type="checkbox"
          checked={!!filter.wholeWords}
          id={`${id}-words`}
          onChange={(event) =>
            onChange({ ...filter, wholeWords: event.target.checked })
          }
        />
        <span>{localize('discovery.wholeWords')}</span>
      </label>
      {(pending > 0 || incomplete > 0) && (
        <span className="discovery-index-status" role="status">
          {localize(pending ? 'discovery.indexing' : 'discovery.incomplete')}
          {!pending && (
            <button
              type="button"
              className="minimal-button"
              onClick={() => {
                queryClient.invalidateQueries({
                  queryKey: ['extension-description'],
                });
              }}
            >
              {localize('discovery.retry')}
            </button>
          )}
        </span>
      )}
    </div>
  );
}

export function DiscoveryFilterButton({
  filter,
  onChange,
  tags,
  excludeModules,
  onExcludeModules,
}: FilterProps & {
  tags: { value: string; label: string }[];
  excludeModules: boolean;
  onExcludeModules: (exclude: boolean) => void;
}) {
  const localize = useMessage();
  const language = useAtomValue(LANGUAGE_ATOM);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 300 });
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect();
      // The application zooms the root. DOM rectangles use physical CSS pixels,
      // while fixed-position offsets inside that root are scaled again.
      const scale =
        Number(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--gui-scale',
          ),
        ) || 1;
      const viewportWidth = window.innerWidth / scale;
      const viewportHeight = window.innerHeight / scale;
      const bottom = rect.bottom / scale;
      const top = rect.top / scale;
      const below = viewportHeight - bottom - 12;
      const above = top - 12;
      const height = Math.min(380, Math.max(below, above));
      setPosition({
        left: Math.max(
          8,
          Math.min(rect.right / scale - 260, viewportWidth - 268),
        ),
        top:
          below >= Math.min(380, above)
            ? bottom + 4
            : Math.max(8, top - height - 4),
        maxHeight: Math.max(80, height),
      });
    };
    const dismiss = (event: PointerEvent) => {
      if (
        !popup.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    place();
    const scaling = new MutationObserver(place);
    scaling.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });
    popup.current?.querySelector<HTMLInputElement>('input')?.focus();
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', place, true);
      scaling.disconnect();
    };
  }, [open]);

  // Package type is a category, not an authored topic tag.
  const selected = tags.filter(
    (tag) => !['module', 'plugin'].includes(tag.value),
  );
  filter.tags.forEach((tag) => {
    if (!selected.some((item) => item.value === tag))
      selected.push({ value: tag, label: tag });
  });
  const active = excludeModules || filter.tags.length > 0;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="ucp-button ucp-button--square text-light"
        title={localize('discovery.filters')}
        aria-label={localize('discovery.filters')}
        aria-pressed={active}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
      >
        {active ? <FunnelFill /> : <Funnel />}
      </button>
      {open &&
        createPortal(
          <div
            id={id}
            ref={popup}
            role="dialog"
            dir={language === 'fa' ? 'rtl' : undefined}
            aria-label={localize('discovery.filters')}
            className="parchment-box discovery-tag-popup"
            style={position}
            onBlur={(event) => {
              if (
                event.relatedTarget &&
                !event.currentTarget.contains(event.relatedTarget as Node) &&
                event.relatedTarget !== trigger.current
              )
                setOpen(false);
            }}
          >
            <div
              className="discovery-tag-mode"
              role="radiogroup"
              aria-label={localize('discovery.tagFilter')}
            >
              <span>{localize('discovery.tagFilter')}</span>
              {(['any', 'all'] as const).map((match) => (
                <label
                  className="discovery-sword"
                  key={match}
                  title={localize(`discovery.${match}.help`)}
                  htmlFor={`${id}-${match}`}
                >
                  <input
                    type="radio"
                    id={`${id}-${match}`}
                    name={`${id}-mode`}
                    value={match}
                    checked={filter.match === match}
                    onChange={() => onChange({ ...filter, match })}
                  />
                  <span>{localize(`discovery.${match}`)}</span>
                </label>
              ))}
            </div>
            <div className="discovery-filter-categories">
              <label className="discovery-sword" htmlFor={`${id}-modules`}>
                <input
                  type="checkbox"
                  checked={excludeModules}
                  id={`${id}-modules`}
                  onChange={(event) => onExcludeModules(event.target.checked)}
                />
                <span>{localize('discovery.excludeModules')}</span>
              </label>
            </div>
            {selected.map((tag) => (
              <label
                className="discovery-sword"
                key={tag.value}
                htmlFor={`${id}-tag-${encodeURIComponent(tag.value)}`}
              >
                <input
                  type="checkbox"
                  checked={filter.tags.includes(tag.value)}
                  id={`${id}-tag-${encodeURIComponent(tag.value)}`}
                  onChange={(event) =>
                    onChange({
                      ...filter,
                      tags: event.target.checked
                        ? [...filter.tags, tag.value]
                        : filter.tags.filter((value) => value !== tag.value),
                    })
                  }
                />
                <span>{tag.label}</span>
              </label>
            ))}
            <button
              type="button"
              className="minimal-button"
              disabled={!active}
              onClick={() => {
                onChange({ ...filter, tags: [] });
                onExcludeModules(false);
              }}
            >
              {localize('discovery.clearFilters')}
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
