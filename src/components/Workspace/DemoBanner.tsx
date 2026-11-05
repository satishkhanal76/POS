import { Link } from 'react-router-dom';
import { workspaceController } from '../../controllers/WorkspaceController';
import './Workspace.css';

export default function DemoBanner() {
  if (!workspaceController.isDemo()) return null;
  return <aside className="demo-banner" aria-label="Demo workspace"><span><b>Demo workspace</b> · Sample data for practice</span><Link to="/settings">Manage demo</Link></aside>;
}
