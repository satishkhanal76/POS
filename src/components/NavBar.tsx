import { useLocaleText } from '../contexts/Locale';
import { NavLink } from 'react-router-dom';
import { navigationGroups } from '../data/navigation';
import NavigationDropdown from './Navigation/NavigationDropdown';
import './NavBar.css';

export default function NavBar() {
  const t = useLocaleText();

  return (
    <nav className="top-nav" aria-label={t('UI_MAIN_NAVIGATION')}>
      <NavLink className="nav-brand" to="/" end aria-label={t('UI_POS_HOME')}>
        <span className="nav-brand-mark" aria-hidden="true">{t('UI_P')}</span>
        {t('WEB_NAME')}
      </NavLink>
      <div className="nav-links">
        <NavLink className="nav-control" to="/" end>{t('NAVBAR_ITEM_HOME')}</NavLink>
        {navigationGroups.map(group => <NavigationDropdown key={group.id} group={group} translate={t} />)}
        <NavLink className="nav-control nav-settings" to="/settings">
          {t('NAVBAR_SETTINGS')}
        </NavLink>
      </div>
    </nav>
  );
}
