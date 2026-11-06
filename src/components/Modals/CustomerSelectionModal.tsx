import { useCallback, useMemo } from 'react';
import { useLocaleText } from '../../contexts/Locale';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useClientGlobal } from '../../contexts/ClientGlobal';
import PickerController from '../../controllers/PickerController';
import { PickerOptions } from '../../pickers/types';
import usePickerQuery from '../../hooks/usePickerQuery';
import SearchableModal from './SearchableModal';
import { ICustomer } from '../../models/Customer';

interface Props {
    handleAddItem: (customer: ICustomer | null) => void;
    isModalOpen?: boolean;
    title?: string;
    purchase?: boolean;
    onClose: () => void;
}
export default function CustomerSelectionModal({ handleAddItem, onClose, isModalOpen = false, title, purchase = false }: Props) {
    const t = useLocaleText(), stores = useDatabase(), settings = useClientGlobal();
    const controller = useMemo(() => new PickerController(stores), [stores]);
    const load = useCallback((options: PickerOptions) => controller.contacts(options), [controller]);
    const picker = usePickerQuery(isModalOpen, load, settings.pickerPageSize, settings.pickerRecentFirst, purchase);
    if (!isModalOpen) return null;
    return <SearchableModal title={title ?? t('UI_SELECT_A_CUSTOMER')} onClose={onClose} items={picker.rows.map(person => ({ id: person.getId(), name: person.getName(), children: <span className="name">{person.getName()}<small className="picker-contact-phone">{person.getPhoneNumber()}</small></span> }))} query={picker.query} onQueryChange={picker.setQuery} loading={picker.loading} loadingMore={picker.loadingMore} hasMore={picker.hasMore} error={picker.error} onLoadMore={() => void picker.loadMore()} onRetry={picker.retry} recentFirst={settings.pickerRecentFirst} searchLabel={t('SEARCH_CONTACTS')} searchPlaceholderText={t('SEARCH_CONTACTS')} handleAdd={entry => handleAddItem(picker.rows.find(person => person.getId() === entry.id) ?? null)}/>;
}
