import { useEffect, useRef, useState } from 'react';
import { MdMenu, MdClose } from 'react-icons/md';
import { useLocaleText } from '../contexts/Locale';
import { NavLink, useLocation } from 'react-router-dom';
import { navigationGroups } from '../data/navigation';
import NavigationDropdown from './Navigation/NavigationDropdown';
import './NavBar.css';

export default function NavBar() {
  const t = useLocaleText();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => { setMobileOpen(false); }, [location]);

  return (
    <nav className="top-nav" aria-label={t('UI_MAIN_NAVIGATION')} data-mobile-open={mobileOpen}
      onKeyDown={event => {
        if (event.key === 'Escape' && mobileOpen && !event.defaultPrevented) {
          setMobileOpen(false); menuButton.current?.focus();
        }
      }}>
      <NavLink className="nav-brand" to="/" end aria-label={t('UI_POS_HOME')}>
        <img className="nav-brand-mark" src={`${import.meta.env.BASE_URL}icons/app-icon.svg`} width="32" height="32" alt="" />
        {t('WEB_NAME')}
      </NavLink>
      <button ref={menuButton} type="button" className="nav-mobile-toggle" aria-expanded={mobileOpen}
        aria-controls="main-navigation-links" aria-label={t(mobileOpen ? 'NAVBAR_CLOSE_MENU' : 'NAVBAR_OPEN_MENU')}
        onClick={() => setMobileOpen(open => !open)}>
        {mobileOpen ? <MdClose aria-hidden="true" /> : <MdMenu aria-hidden="true" />}
        <span>{t('NAVBAR_MENU')}</span>
      </button>
      <div className="nav-links" id="main-navigation-links">
        <NavLink className="nav-control" to="/" end>{t('NAVBAR_ITEM_HOME')}</NavLink>
        {navigationGroups.map(group => <NavigationDropdown key={group.id} group={group} translate={t} />)}
        <NavLink className="nav-control nav-settings" to="/settings">
          {t('NAVBAR_SETTINGS')}
        </NavLink>
      </div>
    </nav>
  );
}
