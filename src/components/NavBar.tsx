import { NavLink } from 'react-router-dom';
import { useLocale } from '../contexts/Locale';
import { navigationGroups } from '../data/navigation';
import NavigationDropdown from './Navigation/NavigationDropdown';
import './NavBar.css';

export default function NavBar() {
  const text = useLocale();
  const translate = (key: string, fallback: string): string => text[key] || fallback;

  return (
    <nav className="top-nav" aria-label="Main navigation">
      <NavLink className="nav-brand" to="/" end aria-label="POS home">
        <span className="nav-brand-mark" aria-hidden="true">P</span>
        {text.WEB_NAME || 'POS'}
      </NavLink>
      <div className="nav-links">
        <NavLink className="nav-control" to="/" end>{translate('NAVBAR_ITEM_HOME', 'POS')}</NavLink>
        {navigationGroups.map(group => <NavigationDropdown key={group.id} group={group} translate={translate} />)}
        <NavLink className="nav-control nav-settings" to="/settings">
          {translate('NAVBAR_SETTINGS', 'Settings')}
        </NavLink>
      </div>
    </nav>
  );
}
