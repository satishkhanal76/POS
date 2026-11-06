import { useEffect, useState } from 'react';
import { useLocaleText, LocaleKey } from '../../contexts/Locale';
import { workspaceController } from '../../controllers/WorkspaceController';
import { databaseProgress, MAINTENANCE_EVENT } from '../../database/listing/maintenance';
import './DatabaseMaintenanceStatus.css';
const labels: Record<string, LocaleKey> = { PRODUCTS: 'TABLE_PRODUCTS', CUSTOMER: 'TABLE_CUSTOMER', TRANSACTIONS: 'TABLE_TRANSACTIONS', CUSTOMERS_TRANSACTIONS: 'TABLE_CUSTOMERS_TRANSACTIONS', CUSTOMER_TRANSACTION_SUMMARIES: 'TABLE_CUSTOMER_TRANSACTION_SUMMARIES', ITEM_PRICE_CHANGES: 'TABLE_ITEM_PRICE_CHANGES', PURCHASES: 'BUY_PURCHASE', SUPPLIER_PAYMENTS: 'BUY_PAYMENTS' };

/** Preparation never locks the whole workspace; surface the actual operation instead of a generic spinner. */
export default function DatabaseMaintenanceStatus() {
    const t = useLocaleText(), name = workspaceController.isDemo() ? 'POS_DEMO' : 'POS';
    const [state, setState] = useState(() => databaseProgress(name));
    useEffect(() => {
        const update = () => setState(databaseProgress(name));
        window.addEventListener(MAINTENANCE_EVENT, update); update();
        return () => window.removeEventListener(MAINTENANCE_EVENT, update);
    }, [name]);
    if (!state) return null;
    return <aside className="database-maintenance" aria-live="polite">
        {state.blocked ? <p>{t('DATABASE_UPDATE_BLOCKED')}</p> : state.failed ? <p role="alert">{t('DATABASE_INDEX_FAILED')}</p> : <>
            <p>{t('DATABASE_INDEX_PROGRESS', { table: t(labels[state.table] ?? 'UI_RECORDS_2'), completed: state.completed.toLocaleString(), total: state.total.toLocaleString() })}</p>
            <progress max={Math.max(1, state.total)} value={state.completed} aria-label={t('DATABASE_INDEX_TITLE')}/>
            <small>{t('DATABASE_INDEX_HELP')}</small>
        </>}
    </aside>;
}
