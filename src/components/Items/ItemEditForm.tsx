import { useState } from 'react';
import FullScreenModal from '../Modals/FullScreenModal';
import { IProductItem } from '../../models/ProductItem';
import ItemsController from '../../controllers/ItemsController';
import { useDatabase } from '../../contexts/DatabaseContext';
import '../Customer/CustomForm.css';

interface ItemEditFormProps {
  item: IProductItem;
  onClose: () => void;
  onSaved: () => void;
}
export default function ItemEditForm({ item, onClose, onSaved }: ItemEditFormProps) {
  const { itemOS } = useDatabase();
  const [name, setName] = useState(item.getName());
  const [price, setPrice] = useState(String(item.getAmount()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <FullScreenModal title="Edit Item" onClose={() => { if (!busy) onClose(); }}>
    <form className="custom-form" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError('');
      try {
        if (!price.trim()) throw new Error('Enter a price.');
        await new ItemsController(itemOS).updateItem(item.getId(), name, Number(price));
        onSaved();
      } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save item.'); }
      finally { setBusy(false); }
    }}>
      <p>Price changes take effect now. Previous transactions keep the price from their transaction date. Name changes update the catalog name everywhere.</p>
      <div className="input-container"><label htmlFor="edit-item-name">Item name</label><input className="input" id="edit-item-name" value={name} required disabled={busy} onChange={event => setName(event.target.value)} /></div>
      <div className="input-container"><label htmlFor="edit-item-price">Current price</label><input className="input" id="edit-item-price" type="number" min="0" step="any" value={price} required disabled={busy} onChange={event => setPrice(event.target.value)} /></div>
      {error && <p role="alert">{error}</p>}
      <div className="workspace-buttons"><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button><button type="button" disabled={busy} onClick={onClose}>Cancel</button></div>
    </form>
  </FullScreenModal>;
}
