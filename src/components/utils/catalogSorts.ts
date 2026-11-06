import { LocaleKey } from '../../contexts/Locale';
import { PageSort } from '../../database/Pagination';
export interface SortOption { value: PageSort; label: LocaleKey }
export const nameSortOptions: SortOption[] = [
    { value: 'name-asc', label: 'SORT_NAME_ASC' },
    { value: 'name-desc', label: 'SORT_NAME_DESC' },
];
export function itemSortOptions(stock: boolean): SortOption[] {
    return [...nameSortOptions,
        { value: 'price-low', label: 'SORT_PRICE_LOW' },
        { value: 'price-high', label: 'SORT_PRICE_HIGH' },
        ...(stock ? [{ value: 'stock-high', label: 'SORT_STOCK_HIGH' }, { value: 'stock-low', label: 'SORT_STOCK_LOW' }] as SortOption[] : []),
    ];
}
