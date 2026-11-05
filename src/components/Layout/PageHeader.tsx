import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

/** One heading scale and spacing rule for every page. */
export default function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return <header className="page-header">
    <div className="page-header-copy">
      {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
      <h1 className="page-headline">{title}</h1>
      {description && <p className="page-description">{description}</p>}
    </div>
    {actions && <div className="page-header-actions">{actions}</div>}
  </header>;
}
