import { useState } from 'react';
import { useLocaleText } from '../../contexts/Locale';
import { IProductTransactionItem } from '../../models/ProductTransactionItem';
import { IDiscountTransactionItem } from '../../models/DiscountTransactionItem';
import { parseQuantity } from '../../validators/QuantityValidator';
import FullScreenModal from '../Modals/FullScreenModal';
import Price from '../Items/Price';
import '../Customer/CustomForm.css';
import '../Workspace/Workspace.css';

interface QuantityFormProps {
  item: IProductTransactionItem | IDiscountTransactionItem;
  onClose: () => void;
  onApply: (quantity: number) => void | Promise<void>;
}
export default function QuantityForm({ item, onClose, onApply }: QuantityFormProps) {
  const t = useLocaleText();
  const [value, setValue] = useState(String(item.getQuantity()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  let amount: number | null = null;
  try { const next = parseQuantity(value) * item.getItem().getAmount(); if (Number.isFinite(next)) amount = next; } catch { /* Validate visibly on submit. */ }
  return <FullScreenModal title={t('QUANTITY_TITLE')} onClose={() => { if (!busy) onClose(); }}>
    <form className="custom-form" noValidate onSubmit={async event => {
      event.preventDefault();
      if (busy) return;
      setBusy(true);
      try { const quantity = parseQuantity(value); await onApply(quantity); }
      catch (failure) { setError(failure instanceof Error ? failure.message : t('QUANTITY_INVALID')); }
      finally { setBusy(false); }
    }}>
      <p>{t('QUANTITY_DESCRIPTION', { item: item.getItem().getName() })}</p>
      <div className="input-container"><label htmlFor="quantity-value">{t('QUANTITY_LABEL')}</label>
        <input className="input" id="quantity-value" type="number" inputMode="numeric" min="1" max={Number.MAX_SAFE_INTEGER} step="1" value={value} disabled={busy}
          aria-invalid={!!error} aria-describedby={error ? 'quantity-error' : 'quantity-help'} onChange={event => { setValue(event.target.value); setError(''); }} />
        <p id="quantity-help">{t('QUANTITY_HELP')}</p>
      </div>
      {amount !== null && <div className="form-preview"><span>{t('QUANTITY_LINE_TOTAL')}</span><output><Price price={amount} /></output></div>}
      {error && <p id="quantity-error" role="alert">{error}</p>}
      <div className="workspace-buttons"><button type="submit" disabled={busy}>{t('QUANTITY_APPLY')}</button><button type="button" disabled={busy} onClick={onClose}>{t('UI_CANCEL')}</button></div>
    </form>
  </FullScreenModal>;
}
