import { MdOutlineInventory2, MdOutlinePeople, MdOutlineReceiptLong, MdCheck, MdOutlinePriceChange } from 'react-icons/md';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NavigationGroup } from '../../data/navigation';

interface NavigationDropdownProps {
  group: NavigationGroup;
  translate: (key: string, fallback: string) => string;
}

/** A disclosure containing ordinary links, so Tab and Enter work natively. */
export default function NavigationDropdown({ group, translate }: NavigationDropdownProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const active = group.links.some(link => link.path === location.pathname)
    || group.relatedPaths?.includes(location.pathname);

  useEffect(() => { setOpen(false); }, [location]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  return (
    <div className="nav-dropdown" ref={root}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}>
      <button ref={trigger} type="button" className={`nav-control${active ? ' is-active' : ''}`}
        aria-expanded={open} aria-controls={`nav-${group.id}`} onClick={() => setOpen(value => !value)}>
        {translate(group.localeKey, group.label)}
        <svg className="nav-chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <ul className="nav-dropdown-links" id={`nav-${group.id}`} hidden={!open}>
        {group.links.map(link => {
          const Icon = link.path === "/price-history" ? MdOutlinePriceChange : link.path === "/items" ? MdOutlineInventory2 : link.path === "/customers" || link.path === "/customers-transactions" ? MdOutlinePeople : MdOutlineReceiptLong;
          return (
          <li key={link.path}><NavLink to={link.path} onClick={() => setOpen(false)}>
            <Icon className="nav-menu-icon" aria-hidden="true" />
            <span className="nav-menu-label">{translate(link.localeKey, link.label)}</span>
            <MdCheck className="nav-menu-check" aria-hidden="true" />
          </NavLink></li>
          );
        })}
      </ul>
    </div>
  );
}
