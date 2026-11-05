import { useState } from 'react';
import { ICustomer } from '../../models/Customer';
import { useDatabase } from '../../contexts/DatabaseContext';
import CustomerController from '../../controllers/CustomerController';
import FullScreenModal from '../Modals/FullScreenModal';
import './CustomForm.css';
import '../Workspace/Workspace.css';

interface CustomerEditFormProps {
  customer: ICustomer;
  onClose: () => void;
  onSaved: (customer: ICustomer) => void;
}

export default function CustomerEditForm({ customer, onClose, onSaved }: CustomerEditFormProps) {
  const { customerOS } = useDatabase();
  const [name, setName] = useState(customer.getName());
  const [phoneNumber, setPhoneNumber] = useState(customer.getPhoneNumber());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return <FullScreenModal title="Edit Customer" onClose={() => { if (!busy) onClose(); }}>
    <form className="custom-form" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError('');
      try {
        const updated = await new CustomerController(customerOS).updateCustomer(customer.getId(), { name, phoneNumber });
        onSaved(updated);
      } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save customer.'); }
      finally { setBusy(false); }
    }}>
      <p>Update this customer's details. Their existing transactions stay linked.</p>
      <div className="input-container"><label htmlFor="edit-customer-name">Customer name</label><input className="input" id="edit-customer-name" autoComplete="name" required disabled={busy} value={name} onChange={event => setName(event.target.value)} /></div>
      <div className="input-container"><label htmlFor="edit-customer-phone">Phone number</label><input className="input" id="edit-customer-phone" type="tel" autoComplete="tel" disabled={busy} value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} /></div>
      {error && <p role="alert">{error}</p>}
      <div className="workspace-buttons"><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button><button type="button" disabled={busy} onClick={onClose}>Cancel</button></div>
    </form>
  </FullScreenModal>;
}
