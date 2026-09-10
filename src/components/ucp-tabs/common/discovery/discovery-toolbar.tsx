import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { LANGUAGE_ATOM } from '../../../../function/gui-settings/settings';
import { DiscoveryFilter } from '../../../../function/content/discovery/search';
import { useMessage } from '../../../general/message';
import './discovery.css';

// eslint-disable-next-line import/prefer-default-export
export function DiscoveryToolbar(props: {
  filter: DiscoveryFilter;
  onChange: (filter: DiscoveryFilter) => void;
  tags: { value: string; label: string }[];
  pending: number;
  incomplete: number;
}) {
  const { filter, onChange, tags, pending, incomplete } = props;
  const localize = useMessage();
  const language = useAtomValue(LANGUAGE_ATOM);
  const queryClient = useQueryClient();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 300 });
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const height = Math.min(380, Math.max(below, above));
      setPosition({
        left: Math.max(8, Math.min(rect.right - 260, window.innerWidth - 268)),
        top:
          below >= Math.min(380, above)
            ? rect.bottom + 4
            : Math.max(8, rect.top - height - 4),
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
    popup.current?.querySelector<HTMLInputElement>('input')?.focus();
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  const selected = [...tags];
  filter.tags.forEach((tag) => {
    if (!selected.some((item) => item.value === tag))
      selected.push({ value: tag, label: tag });
  });
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
      <button
        ref={trigger}
        type="button"
        className="minimal-button discovery-tags-trigger"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
      >
        {localize('discovery.tags')}
        {filter.tags.length ? ` · ${filter.tags.length}` : ''} ▾
      </button>
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
      {open &&
        createPortal(
          <div
            id={id}
            ref={popup}
            role="dialog"
            dir={language === 'fa' ? 'rtl' : undefined}
            aria-label={localize('discovery.tags')}
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
            <label className="discovery-tag-mode" htmlFor={`${id}-mode`}>
              {localize('discovery.match')}
              <select
                id={`${id}-mode`}
                value={filter.match}
                onChange={(event) =>
                  onChange({
                    ...filter,
                    match: event.target.value as 'any' | 'all',
                  })
                }
              >
                <option value="any">{localize('discovery.any')}</option>
                <option value="all">{localize('discovery.all')}</option>
              </select>
            </label>
            {selected.map((tag) => (
              <label
                className="discovery-sword"
                key={tag.value}
                htmlFor={`${id}-${encodeURIComponent(tag.value)}`}
              >
                <input
                  type="checkbox"
                  id={`${id}-${encodeURIComponent(tag.value)}`}
                  checked={filter.tags.includes(tag.value)}
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
              disabled={!filter.tags.length}
              onClick={() => onChange({ ...filter, tags: [] })}
            >
              {localize('discovery.clearTags')}
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
