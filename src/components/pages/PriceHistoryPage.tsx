import { useEffect, useMemo, useState } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import PriceHistoryController, { PriceHistoryEntry } from '../../controllers/PriceHistoryController';
import PageHeader from '../Layout/PageHeader';
import CustomTableView, { CustomTableColumn } from '../utils/CustomTableView';
import Price from '../Items/Price';
import './PriceHistoryPage.css';

export default function PriceHistoryPage() {
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
      if (!cancelled) { setError('Price history could not be loaded. Reload the page to try again.'); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [itemOS, itemPriceChangesOS]);

  const items = useMemo(() => Array.from(new Map(history.map(entry => [entry.itemId, entry.itemName])))
    .sort((a, b) => a[1].localeCompare(b[1])), [history]);
  const columns: CustomTableColumn<PriceHistoryEntry>[] = [
    { key: 'item', header: 'Item', render: entry => entry.itemName },
    { key: 'previous', header: 'Previous Price', variant: 'numeric', render: entry => <Price price={entry.previousAmount} /> },
    { key: 'new', header: 'New Price', variant: 'numeric', render: entry => <Price price={entry.amount} /> },
    { key: 'date', header: 'Effective Date', render: entry => <time dateTime={new Date(entry.timestamp).toISOString()}>{new Date(entry.timestamp).toLocaleString()}</time> },
  ];

  return <main>
    <PageHeader title="Price History" description="Review item price changes, newest first. Item names reflect the current catalog." />
    {loading ? <p role="status">Loading price history…</p> : error ? <p role="alert">{error}</p> : <>
      <div className="price-history-filters">
        <label htmlFor="price-history-item">Filter by item</label>
        <select id="price-history-item" value={itemId} onChange={event => setItemId(event.target.value)}>
          <option value="">All items</option>
          {items.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>
      <CustomTableView label="Price history" columns={columns} data={itemId ? history.filter(entry => entry.itemId === itemId) : history} rowKey={entry => entry.id}
        emptyTitle="No Price Changes Yet" emptyDescription="Edit an item's price from Manage → Items. Its previous price, new price, and effective date will appear here." />
    </>}
  </main>;
}
