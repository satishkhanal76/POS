import { Children, isValidElement, ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import './Select.css';

interface Props {
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
  id?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}
interface Option { value: string; label: ReactNode; text: string; disabled: boolean }
function optionList(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) return [];
    if (child.type !== 'option') return optionList(child.props.children);
    const text = Children.toArray(child.props.children).join('');
    return [{ value: String(child.props.value ?? text), label: child.props.children, text, disabled: !!child.props.disabled }];
  });
}

/** Shared single-select: themed listbox, keyboard navigation, type-ahead and top-layer positioning. */
export default function Select({ value, onChange, children, id, className = '', disabled, name, ...aria }: Props) {
  const options = optionList(children);
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listId = `${controlId}-options`;
  const selected = options.findIndex(option => option.value === String(value));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selected);
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', time: 0 });
  const choose = (index: number) => {
    if (!options[index] || options[index].disabled) return;
    onChange(options[index].value); setOpen(false); trigger.current?.focus();
  };
  const show = () => { if (disabled) return; setActive(selected >= 0 ? selected : options.findIndex(option => !option.disabled)); setOpen(true); };
  useLayoutEffect(() => {
    if (!open || !trigger.current || !list.current) return;
    const menu = list.current;
    const rect = trigger.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const above = spaceBelow < Math.min(240, options.length * 44) && rect.top > spaceBelow;
    menu.style.width = `${Math.min(Math.max(rect.width, 160), window.innerWidth - 24)}px`;
    menu.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 160) - 12))}px`;
    menu.style.maxHeight = `${Math.max(80, Math.min(300, above ? rect.top - 12 : spaceBelow))}px`;
    menu.style.top = above ? 'auto' : `${rect.bottom + 6}px`;
    menu.style.bottom = above ? `${window.innerHeight - rect.top + 6}px` : 'auto';
    menu.setAttribute('popover', 'manual');
    menu.showPopover?.();
    return () => { menu.hidePopover?.(); };
  }, [open, options.length]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const closeOnMove = (event: Event) => { if (!list.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside, true);
    window.addEventListener('resize', closeOnMove);
    document.addEventListener('scroll', closeOnMove, true);
    return () => { document.removeEventListener('pointerdown', closeOutside, true); window.removeEventListener('resize', closeOnMove); document.removeEventListener('scroll', closeOnMove, true); };
  }, [open]);
  useEffect(() => { if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active, open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  return <span className={`app-select ${className}`} ref={root}>
    {name && <input type="hidden" name={name} value={value} />}
    <button {...aria} id={controlId} ref={trigger} type="button" className="app-select-trigger" role="combobox" aria-haspopup="listbox"
      aria-controls={listId} aria-expanded={open} aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined} disabled={disabled}
      onClick={() => open ? setOpen(false) : show()} onBlur={event => { if (!root.current?.contains(event.relatedTarget as Node)) setOpen(false); }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
        if (event.key === 'Tab') { setOpen(false); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const enabled = options.map((option, index) => !option.disabled ? index : -1).filter(index => index >= 0);
          if (!enabled.length) return;
          if (!open) { show(); return; }
          const at = enabled.indexOf(active);
          setActive(event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled[enabled.length - 1] : enabled[(at + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]);
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); if (open) choose(active); else show();
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const now = Date.now();
          typed.current = { text: (now - typed.current.time < 700 ? typed.current.text : '') + event.key.toLocaleLowerCase(), time: now };
          const found = options.findIndex(option => !option.disabled && option.text.toLocaleLowerCase().startsWith(typed.current.text));
          if (found >= 0) { if (!open) show(); setActive(found); }
        }
      }}>
      <span>{options[selected]?.label ?? ''}</span><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="m5 7 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {open && <div ref={list} id={listId} className="app-select-list" role="listbox" aria-labelledby={controlId}
      onMouseDown={event => event.preventDefault()}>
      {options.map((option, index) => <div id={`${listId}-${index}`} key={option.value} data-index={index} role="option" aria-selected={index === selected} aria-disabled={option.disabled || undefined}
        className={`app-select-option${index === active ? ' is-active' : ''}`} onPointerMove={() => { if (!option.disabled) setActive(index); }}
        onClick={event => { event.preventDefault(); event.stopPropagation(); choose(index); }}><span>{option.label}</span>{index === selected && <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="m4 10 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}</div>)}
    </div>}
  </span>;
}
