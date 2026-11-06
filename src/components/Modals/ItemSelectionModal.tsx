import { useCallback, useMemo } from 'react';
import { useClientGlobal } from '../../contexts/ClientGlobal';
import useStockCounts from '../../hooks/useStockCounts';
import { useLocaleText } from '../../contexts/Locale';
import { useDatabase } from '../../contexts/DatabaseContext';
import PickerController from '../../controllers/PickerController';
import { PickerOptions } from '../../pickers/types';
import usePickerQuery from '../../hooks/usePickerQuery';
import Price from '../Items/Price';
import SearchableModal from './SearchableModal';
import ProductItem from '../../models/ProductItem';

interface Props {
    handleAddItem: (item: ProductItem | null) => void;
    onClose: () => void;
    isModalOpen?: boolean;
    purchase?: boolean;
}
export default function ItemSelectionModal({ handleAddItem, onClose, isModalOpen = false, purchase = false }: Props) {
    const t = useLocaleText(), stores = useDatabase(), settings = useClientGlobal();
    const controller = useMemo(() => new PickerController(stores), [stores]);
    const load = useCallback((options: PickerOptions) => controller.items(options), [controller]);
    const picker = usePickerQuery(isModalOpen, load, settings.pickerPageSize, settings.pickerRecentFirst, purchase);
    const { counts, error } = useStockCounts(picker.rows.map(item => item.getId()), settings.stockManagement && isModalOpen);
    if (!isModalOpen) return null;
    return <SearchableModal title={t('ADD_ITEM_MODAL_TITLE')} onClose={onClose} query={picker.query} onQueryChange={picker.setQuery} loading={picker.loading} loadingMore={picker.loadingMore} hasMore={picker.hasMore} error={picker.error} onLoadMore={() => void picker.loadMore()} onRetry={picker.retry} recentFirst={settings.pickerRecentFirst} items={picker.rows.map(item => ({ id: item.getId(), name: item.getName(), children: <span className="selection-item"><span className="name">{item.getName()}{settings.stockManagement && <small className="stock-selection-count">{t('STOCK_IN_STOCK')}: {error ? t('STOCK_UNAVAILABLE') : counts ? counts[item.getId()] ?? 0 : '…'}</small>}</span>{purchase ? <small>{t('ORDER_COST_ON_ADD')}</small> : <Price price={item.getAmount()}/>}</span> }))} handleAdd={entry => handleAddItem(picker.rows.find(item => item.getId() === entry.id) ?? null)}/>;
}
