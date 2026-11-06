import Select from '../Forms/Select';
import { useState } from 'react';
import { useLocaleText } from '../../contexts/Locale';
import { useDatabase } from '../../contexts/DatabaseContext';
import DiscountController from '../../controllers/DiscountController';
import { DiscountItemType } from '../../models/DiscountItem';
import { IDiscountTransactionItem } from '../../models/DiscountTransactionItem';
import { ITransaction } from '../../models/Transaction';
import { getDiscountAmount } from '../../validators/DiscountValidator';
import FullScreenModal from '../Modals/FullScreenModal';
import Price from '../Items/Price';
import '../Customer/CustomForm.css';
import '../Workspace/Workspace.css';

interface DiscountFormProps {
  transaction: ITransaction;
  onClose: () => void;
  onApplied: (item: IDiscountTransactionItem) => void;
}
export default function DiscountForm({ transaction, onClose, onApplied }: DiscountFormProps) {
  const t = useLocaleText();
  const { discountOS } = useDatabase();
  const [type, setType] = useState(DiscountItemType.FLAT);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const subtotal = transaction.getAllTransactionProductItems().reduce((sum, item) => sum + item.getAmount(), 0);
  let preview: number | null = null;
  try { preview = getDiscountAmount(type, Number(value), subtotal, transaction.getTotal()); } catch { /* Show input feedback on submit. */ }

  return <FullScreenModal title={t('DISCOUNT_DIALOG_TITLE')} onClose={() => { if (!busy) onClose(); }}>
    <form className="custom-form" noValidate onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError('');
      try {
        const item = await new DiscountController(discountOS).apply(transaction, { type, value: Number(value) });
        onApplied(item);
      } catch (failure) { setError(failure instanceof Error ? failure.message : t('DISCOUNT_SAVE_FAILED')); }
      finally { setBusy(false); }
    }}>
      <p>{t('DISCOUNT_DIALOG_DESCRIPTION')}</p>
      <div className="input-container"><label htmlFor="discount-type">{t('DISCOUNT_TYPE_LABEL')}</label>
        <Select className="input" id="discount-type" value={type} disabled={busy} onChange={value => { setType(Number(value) as DiscountItemType); setError(''); }}>
          <option value={DiscountItemType.FLAT}>{t('DISCOUNT_TYPE_FLAT')}</option>
          <option value={DiscountItemType.PERCENTAGE}>{t('DISCOUNT_TYPE_PERCENTAGE')}</option>
        </Select>
      </div>
      <div className="input-container"><label htmlFor="discount-value">{t(type === DiscountItemType.PERCENTAGE ? 'DISCOUNT_PERCENTAGE_LABEL' : 'DISCOUNT_AMOUNT_LABEL')}</label>
        <input className="input" id="discount-value" type="number" inputMode="decimal" step="any" min="0" max={type === DiscountItemType.PERCENTAGE ? 100 : transaction.getTotal()} value={value} disabled={busy}
          aria-invalid={!!error} aria-describedby={error ? 'discount-error' : undefined} onChange={event => { setValue(event.target.value); setError(''); }} />
      </div>
      {preview !== null && <div className="form-preview"><span>{t('DISCOUNT_PREVIEW')}</span><output><Price price={preview} isDeductionItem /></output></div>}
      {error && <p id="discount-error" role="alert">{error}</p>}
      <div className="workspace-buttons"><button type="submit" disabled={busy}>{t(busy ? 'DISCOUNT_APPLYING' : 'DISCOUNT_APPLY')}</button><button type="button" disabled={busy} onClick={onClose}>{t('UI_CANCEL')}</button></div>
    </form>
  </FullScreenModal>;
}
