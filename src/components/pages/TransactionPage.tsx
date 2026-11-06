import UnlinkCustomerButton from '../Transaction/UnlinkCustomerButton';
import BackLink from '../Layout/BackLink';
import { useNavigate } from 'react-router-dom';
import DeletedVisibility from '../utils/DeletedVisibility';
import DeleteRecordButton from '../utils/DeleteRecordButton';
import useDeletedVisibility from '../../hooks/useDeletedVisibility';
import useDeletionRevision from '../../hooks/useDeletionRevision';
import { useNotifications } from "../../contexts/Notifications";
import { ICustomer } from "../../models/Customer";
import CustomersTransactionsController from "../../controllers/CustomersTransactionsController";
import CustomerSelectionModal from "../Modals/CustomerSelectionModal";
import { useLocaleText } from '../../contexts/Locale';
import PageHeader from "../Layout/PageHeader";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useDatabase } from '../../contexts/DatabaseContext';
import { ITransaction } from '../../models/Transaction';
import { IProductTransactionItem } from '../../models/ProductTransactionItem';
import { IDiscountTransactionItem } from '../../models/DiscountTransactionItem';
import TransactionView from '../Transaction/TransactionView';
import './TransactionPage.css';

type SelectedItem = IProductTransactionItem | IDiscountTransactionItem | null;

/** Saved amounts stay read-only; unassigned sales may be linked to one customer. */
export default function TransactionPage() {
  const t = useLocaleText();
  const navigate = useNavigate();
  const { includeDeleted } = useDeletedVisibility();
  const revision = useDeletionRevision();
  const { transactionsOS, cutomersTransactionsOS } = useDatabase();
  const { notify } = useNotifications();
  const links = useMemo(() => new CustomersTransactionsController(cutomersTransactionsOS), [cutomersTransactionsOS]);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const linkingRef = useRef(false);
  const [params] = useSearchParams();
  const location = useLocation();
  const id = params.get('id');
  const [result, setResult] = useState<{ id: string | null; transaction: ITransaction | null; customer: ICustomer | null; error: string } | null>(null);
  const [selected, setSelected] = useState<SelectedItem>(null);
  const requestedReturn: unknown = location.state?.returnTo;
  const returnTo = typeof requestedReturn === 'string' && /^\/(transactions|customer-transactions|dashboard|overview)(\?|$)/.test(requestedReturn)
    ? requestedReturn : '/transactions';
  const customerHistory = returnTo.startsWith('/customer-transactions');
  const reportHistory = returnTo.startsWith('/dashboard') || returnTo.startsWith('/overview');

  useEffect(() => {
    let cancelled = false;
    setSelected(null);
    setCustomerModalOpen(false);
    if (!id) {
      setResult({ id, transaction: null, customer: null, error: t('UI_NO_TRANSACTION_WAS_SELECTED') });
      return;
    }
    Promise.all([transactionsOS.getOne(id, includeDeleted), links.getLinkedCustomer(id)]).then(([transaction, customer]) => {
      if (cancelled) return;
      setResult({ id, transaction, customer, error: transaction ? '' : t('UI_THIS_TRANSACTION_COULD_NOT_BE_FOUND') });
      setSelected(transaction?.getLast() || null);
    }).catch(() => {
      if (!cancelled) setResult({ id, transaction: null, customer: null, error: t('UI_THIS_TRANSACTION_COULD_NOT_BE_LOADED_RETURN_TO_HISTORY') });
    });
    return () => { cancelled = true; };
  }, [id, transactionsOS, links, t, includeDeleted, revision]);

  const current = result?.id === id ? result : null;
  const linkToCustomer = async (customer: ICustomer | null) => {
    const sale = current?.transaction;
    if (!customer || !sale || current?.customer || linkingRef.current) return;
    linkingRef.current = true; setLinking(true); setCustomerModalOpen(false);
    try {
      await links.linkTransaction(sale, customer);
      setResult(previous => previous?.id === sale.getId() ? { ...previous, customer } : previous);
      notify(t('TRANSACTION_LINKED_TO_CUSTOMER_SUCCESS', { CUSTOMER_NAME: customer.getName() }));
    } catch (error) {
      notify(error instanceof Error ? error.message : t('TRANSACTION_LINK_FAILED'), 'error');
      // Another tab may have assigned the sale after this page initially loaded.
      try {
        const assigned = await links.getLinkedCustomer(sale.getId());
        setResult(previous => previous?.id === sale.getId() ? { ...previous, customer: assigned } : previous);
      } catch { /* Keep the saved transaction visible; the action can be retried. */ }
    } finally { linkingRef.current = false; setLinking(false); }
  };

  return (
    <main className="transaction-page">
      <div className="transaction-toolbar">
        <BackLink to={returnTo} state={location.state?.returnState}>{reportHistory ? t('REPORT_BACK') : customerHistory ? t('UI_BACK_TO_CUSTOMER_TRANSACTIONS_2') : t('UI_BACK_TO_TRANSACTIONS')}</BackLink>
        {current?.transaction && <div className="transaction-toolbar-actions">
          {current.transaction.deletedAt && <span className="deleted-badge">{t('DELETED_BADGE')}</span>}
          <DeleteRecordButton variant="standalone" table="TRANSACTIONS" id={current.transaction.getId()} name={current.transaction.getId()} deleted={!!current.transaction.deletedAt} onDeleted={() => navigate(returnTo, { state: location.state?.returnState })} />
        </div>}
      </div>
      <PageHeader title={t('UI_TRANSACTION_DETAILS_2')} description={t('UI_A_SAVED_SALE_FROM_YOUR_TRANSACTION_HISTORY')} />
      <DeletedVisibility />

      {!current && <p role="status">{t('UI_LOADING_TRANSACTION')}</p>}
      {current?.error && <p role="alert">{current.error}</p>}
      {current?.transaction && <section className="transaction-customer" aria-label={t('CUSTOMER_NAME')}>
        <div><span className="transaction-customer-label">{t('CUSTOMER_NAME')}</span><p>
          {current.customer
            ? <><Link to={`/customer-transactions?id=${encodeURIComponent(current.customer.getId())}${current.customer.deletedAt ? '&deleted=1' : ''}`}>{current.customer.getName()}</Link>{current.customer.deletedAt && <span className="deleted-badge">{t('DELETED_BADGE')}</span>}</>
            : t('TRANSACTION_NO_CUSTOMER')}
        </p></div>
        {current.customer && <UnlinkCustomerButton transactionId={current.transaction.getId()} customer={current.customer} onUnlinked={() => {
          const transactionId = current.transaction?.getId();
          setResult(previous => previous && previous.id === transactionId ? { ...previous, customer: null } : previous);
        }} />}
        {!current.customer && !current.transaction.deletedAt && <button type="button" disabled={linking} onClick={() => setCustomerModalOpen(true)}>
          {t(linking ? 'TRANSACTION_LINKING' : 'TRANSACTION_LINK_ACTION')}
        </button>}
      </section>}
      {customerModalOpen && current?.transaction && !current.customer && <CustomerSelectionModal isModalOpen
        onClose={() => setCustomerModalOpen(false)} handleAddItem={linkToCustomer} />}
      {current?.transaction && <TransactionView transaction={current.transaction} activeItem={selected} onClick={setSelected} onDoubleClick={() => {}} />}
    </main>
  );
}
