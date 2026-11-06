import { MdSearch } from 'react-icons/md';
import './CatalogSearch.css';

export default function CatalogSearch({ label, placeholder, value, onChange }: {
    label: string; placeholder: string; value: string; onChange: (value: string) => void;
}) {
    return <label className="catalog-search">
        <span className="catalog-search-label">{label}</span>
        <span className="catalog-search-control"><MdSearch aria-hidden="true"/><input type="search" value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)}/></span>
    </label>;
}
