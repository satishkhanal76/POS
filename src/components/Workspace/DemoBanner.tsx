import { useLocaleText } from '../../contexts/Locale';
import { Link } from 'react-router-dom';
import { workspaceController } from '../../controllers/WorkspaceController';
import './Workspace.css';

export default function DemoBanner() {
  const t = useLocaleText();
  if (!workspaceController.isDemo()) return null;
  return <aside className="demo-banner" aria-label={t('UI_DEMO_WORKSPACE')}><span><b>{t('UI_DEMO_WORKSPACE')}</b>{' '}{t('UI_SAMPLE_DATA_FOR_PRACTICE')}</span><Link to="/settings">{t('UI_MANAGE_DEMO')}</Link></aside>;
}
