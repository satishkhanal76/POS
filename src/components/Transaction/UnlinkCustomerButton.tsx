import { useMemo, useRef, useState } from 'react';
import { MdLinkOff } from 'react-icons/md';
import { ICustomer } from '../../models/Customer';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useLocaleText } from '../../contexts/Locale';
import { useNotifications } from '../../contexts/Notifications';
import CustomersTransactionsController from '../../controllers/CustomersTransactionsController';
import FullScreenModal from '../Modals/FullScreenModal';
import '../Workspace/Workspace.css';

export default function UnlinkCustomerButton({ transactionId, customer, onUnlinked }: {
  transactionId: string; customer: ICustomer; onUnlinked: () => void;
}) {
  const t = useLocaleText();
  const { notify } = useNotifications();
  const { cutomersTransactionsOS } = useDatabase();
  const controller = useMemo(() => new CustomersTransactionsController(cutomersTransactionsOS), [cutomersTransactionsOS]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const close = () => { if (!lock.current) { setOpen(false); setError(''); } };
  return <>
    <button type="button" className="unlink-customer-button" onClick={() => setOpen(true)}><MdLinkOff aria-hidden="true" />{t('UNLINK_ACTION')}</button>
    {open && <FullScreenModal title={t('UNLINK_TITLE')} onClose={close}>
      <p>{t('UNLINK_DESCRIPTION', { customer: customer.getName() })}</p>
      <p>{t('UNLINK_PAYMENT_NOTE')}</p>
      {error && <p role="alert">{error}</p>}
      <div className="workspace-buttons">
        <button type="button" disabled={busy} onClick={async () => {
          if (lock.current) return;
          lock.current = true; setBusy(true); setError('');
          try {
            await controller.unlinkTransaction(transactionId, customer.getId());
            setOpen(false); onUnlinked(); notify(t('UNLINK_SUCCESS', { customer: customer.getName() }));
          } catch (failure) { setError(failure instanceof Error ? failure.message : t('UNLINK_FAILED')); }
          finally { lock.current = false; setBusy(false); }
        }}>{t(busy ? 'UI_WORKING' : 'UNLINK_CONFIRM')}</button>
        <button type="button" disabled={busy} onClick={close}>{t('UI_CANCEL')}</button>
      </div>
    </FullScreenModal>}
  </>;
}
