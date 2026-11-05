import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useLocaleText } from '../../contexts/Locale';
import { useDatabase } from '../../contexts/DatabaseContext';
import { ICustomer } from '../../models/Customer';
import TransactionsView from '../Transactions/TransactionsView';
import PageHeader from '../Layout/PageHeader';
import './TransactionPage.css';

export default function CustomerTransactionsPage() {
  const t = useLocaleText();
  const { customerOS } = useDatabase();
  const [params] = useSearchParams();
  const id = params.get('id');
  const location = useLocation();
  const [result, setResult] = useState<{ id: string | null; customer: ICustomer | null } | null>(null);
  const requestedReturn: unknown = location.state?.returnTo;
  const returnTo = typeof requestedReturn === 'string' && /^\/customers-transactions(\?|$)/.test(requestedReturn) ? requestedReturn : '/customers-transactions';
  useEffect(() => {
    let cancelled = false;
    if (!id) { setResult({ id, customer: null }); return; }
    customerOS.getOne(id).then(customer => { if (!cancelled) setResult({ id, customer }); })
      .catch(() => { if (!cancelled) setResult({ id, customer: null }); });
    return () => { cancelled = true; };
  }, [id, customerOS]);
  const current = result?.id === id ? result : null;
  return <main className="transaction-page">
    <Link className="transaction-back-link" to={returnTo}>{t('UI_BACK_TO_CUSTOMER_TRANSACTIONS')}</Link>
    <PageHeader title={current?.customer ? t('CUSTOMER_TRANSACTIONS_TITLE', { CUSTOMER_NAME: current.customer.getName() }) : t('CUSTOMERS_TRANSACTIONS_TITLE')} />
    {!current ? <p role="status">{t('UI_LOADING_CUSTOMER_TRANSACTIONS')}</p> : current.customer && id
      ? <TransactionsView customerId={id} /> : <p role="alert">{t('PAGINATION_CUSTOMER_MISSING')}</p>}
  </main>;
}
