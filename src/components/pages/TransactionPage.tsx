import PageHeader from "../Layout/PageHeader";
import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useDatabase } from '../../contexts/DatabaseContext';
import TransactionController from '../../controllers/TransactionController';
import { ITransaction } from '../../models/Transaction';
import { IProductTransactionItem } from '../../models/ProductTransactionItem';
import { IDiscountTransactionItem } from '../../models/DiscountTransactionItem';
import TransactionView from '../Transaction/TransactionView';
import './TransactionPage.css';

type SelectedItem = IProductTransactionItem | IDiscountTransactionItem | null;

/** History detail is read-only; list pages own browsing and customer filtering. */
export default function TransactionPage() {
  const { transactionsOS } = useDatabase();
  const [params] = useSearchParams();
  const location = useLocation();
  const id = params.get('id');
  const [result, setResult] = useState<{ id: string | null; transaction: ITransaction | null; error: string } | null>(null);
  const [selected, setSelected] = useState<SelectedItem>(null);
  const requestedReturn: unknown = location.state?.returnTo;
  const returnTo = typeof requestedReturn === 'string' && /^\/(transactions|customer-transactions)(\?|$)/.test(requestedReturn)
    ? requestedReturn : '/transactions';
  const customerHistory = returnTo.startsWith('/customer-transactions');

  useEffect(() => {
    let cancelled = false;
    setSelected(null);
    if (!id) {
      setResult({ id, transaction: null, error: 'No transaction was selected.' });
      return;
    }
    const controller = new TransactionController(transactionsOS);
    controller.getTransactionById(id).then(transaction => {
      if (cancelled) return;
      setResult({ id, transaction, error: transaction ? '' : 'This transaction could not be found.' });
      setSelected(transaction?.getLast() || null);
    }).catch(() => {
      if (!cancelled) setResult({ id, transaction: null, error: 'This transaction could not be loaded. Return to history and try again.' });
    });
    return () => { cancelled = true; };
  }, [id, transactionsOS]);

  const current = result?.id === id ? result : null;
  return (
    <main className="transaction-page">
      <Link className="transaction-back-link" to={returnTo}>← {customerHistory ? 'Back to customer transactions' : 'Back to transactions'}</Link>
      <PageHeader title="Transaction Details" description="A saved sale from your transaction history." />
      {!current && <p role="status">Loading transaction…</p>}
      {current?.error && <p role="alert">{current.error}</p>}
      {current?.transaction && <TransactionView transaction={current.transaction} activeItem={selected} onClick={setSelected} onDoubleClick={() => {}} />}
    </main>
  );
}
