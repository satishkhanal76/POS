import { useState } from 'react';
import { useLocaleText } from '../../contexts/Locale';
import FullScreenModal from '../Modals/FullScreenModal';
import '../Customer/CustomForm.css';
import '../Workspace/Workspace.css';

export default function PaymentForm({ onClose, onApply }: { onClose: () => void; onApply: (amount: number) => void }) {
  const t = useLocaleText();
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  return <FullScreenModal title={t('PAYMENT_TITLE')} onClose={onClose}>
    <form className="custom-form" noValidate onSubmit={event => {
      event.preventDefault();
      const amount = Number(value);
      if (!/^\d+(\.\d{1,2})?$/.test(value) || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100))) { setError(true); return; }
      onApply(amount);
    }}>
      <p>{t('PAYMENT_DESCRIPTION')}</p>
      <div className="input-container"><label htmlFor="payment-amount">{t('PAYMENT_AMOUNT')}</label>
        <input autoFocus className="input" id="payment-amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={value}
          aria-invalid={error} aria-describedby={error ? 'payment-error' : undefined} onChange={event => { setValue(event.target.value); setError(false); }} />
      </div>
      {error && <p id="payment-error" role="alert">{t('PAYMENT_INVALID')}</p>}
      <div className="workspace-buttons"><button type="submit">{t('PAYMENT_CONTINUE')}</button><button type="button" onClick={onClose}>{t('UI_CANCEL')}</button></div>
    </form>
  </FullScreenModal>;
}
