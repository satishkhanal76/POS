import { ReactNode, useId, useState } from 'react';
import { MdSearch, MdArrowForward } from 'react-icons/md';
import FullScreenModal from './FullScreenModal';
import { useLocale } from '../../contexts/Locale';
import './SearchableModal.css';

export interface ISearchableItem {
  id: string;
  name: string;
  children: ReactNode;
}
interface SearchableModalProps {
  handleAdd: (item: ISearchableItem) => void;
  onClose: () => void;
  items: ISearchableItem[];
  title?: string;
  searchPlaceholderText?: string;
}

export default function SearchableModal({ title, searchPlaceholderText, handleAdd, onClose, items }: SearchableModalProps) {
  const [query, setQuery] = useState('');
  const searchId = useId();
  const text = useLocale();
  const matches = items.filter(item => item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return (
    <FullScreenModal title={title || text.SEARCH_MODAL_DEFAULT_TITLE} onClose={onClose}>
      <div className="modal-search-container">
        <MdSearch aria-hidden="true" />
        <label className="modal-visually-hidden" htmlFor={searchId}>Search by name</label>
        <input id={searchId} placeholder={searchPlaceholderText || text.SEARCH_BOX_DEFAULT_PLACEHOLDER} value={query} onChange={event => setQuery(event.target.value)} className="modal-search" type="search" autoComplete="off" />
      </div>
      <p className="modal-result-count" role="status">{matches.length} {matches.length === 1 ? 'result' : 'results'} · Select to add</p>
      <div className="modal-items-container">
        {matches.map(item => (
          <button type="button" key={item.id} className="modal-item" onClick={() => handleAdd(item)}>
            <span className="modal-item-details">{item.children}</span><MdArrowForward className="modal-item-arrow" aria-hidden="true" />
          </button>
        ))}
        {!matches.length && <div className="modal-empty"><MdSearch aria-hidden="true" /><h3>{items.length ? 'No matches found' : 'Nothing to select yet'}</h3><p>{items.length ? 'Try another name or clear your search.' : 'Add items or customers from Manage, then return here.'}</p></div>}
      </div>
    </FullScreenModal>
  );
}
