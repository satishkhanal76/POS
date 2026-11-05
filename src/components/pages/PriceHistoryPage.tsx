import { useLocaleText } from '../../contexts/Locale';
import { useEffect, useMemo, useState } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import PriceHistoryController, { PriceHistoryEntry } from '../../controllers/PriceHistoryController';
import PageHeader from '../Layout/PageHeader';
import CustomTableView, { CustomTableColumn } from '../utils/CustomTableView';
import Price from '../Items/Price';
import './PriceHistoryPage.css';

export default function PriceHistoryPage() {
  const t = useLocaleText();
  const { itemOS, itemPriceChangesOS } = useDatabase();
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [itemId, setItemId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    const controller = new PriceHistoryController(itemOS, itemPriceChangesOS);
    controller.getHistory().then(entries => {
      if (!cancelled) { setHistory(entries); setLoading(false); }
    }).catch(() => {
      if (!cancelled) { setError(t('UI_PRICE_HISTORY_COULD_NOT_BE_LOADED_RELOAD_THE_PAGE')); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [itemOS, itemPriceChangesOS, t]);

  const items = useMemo(() => Array.from(new Map(history.map(entry => [entry.itemId, entry.itemName])))
    .sort((a, b) => a[1].localeCompare(b[1])), [history]);
  const columns: CustomTableColumn<PriceHistoryEntry>[] = [
    { key: 'item', header: t('UI_ITEM'), render: entry => entry.itemName },
    { key: 'previous', header: t('UI_PREVIOUS_PRICE'), variant: 'numeric', render: entry => <Price price={entry.previousAmount} /> },
    { key: 'new', header: t('UI_NEW_PRICE'), variant: 'numeric', render: entry => <Price price={entry.amount} /> },
    { key: 'date', header: t('UI_EFFECTIVE_DATE'), render: entry => <time dateTime={new Date(entry.timestamp).toISOString()}>{new Date(entry.timestamp).toLocaleString()}</time> },
  ];

  return <main>
    <PageHeader title={t('NAVBAR_PRICE_HISTORY')} description={t('UI_REVIEW_ITEM_PRICE_CHANGES_NEWEST_FIRST_ITEM_NAMES_REFLECT')} />
    {loading ? <p role="status">{t('UI_LOADING_PRICE_HISTORY')}</p> : error ? <p role="alert">{error}</p> : <>
      <div className="price-history-filters">
        <label htmlFor="price-history-item">{t('UI_FILTER_BY_ITEM')}</label>
        <select id="price-history-item" value={itemId} onChange={event => setItemId(event.target.value)}>
          <option value="">{t('UI_ALL_ITEMS')}</option>
          {items.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>
      <CustomTableView label={t('UI_PRICE_HISTORY')} columns={columns} data={itemId ? history.filter(entry => entry.itemId === itemId) : history} rowKey={entry => entry.id}
        emptyTitle={t('UI_NO_PRICE_CHANGES_YET')} emptyDescription={t('UI_EDIT_AN_ITEM_S_PRICE_FROM_MANAGE_ITEMS_ITS')} />
    </>}
  </main>;
}
