import { useClientGlobal } from '../../contexts/ClientGlobal';
import useStockCounts from '../../hooks/useStockCounts';
import { useLocaleText } from '../../contexts/Locale';
import Price from "../Items/Price";
import { useEffect, useState } from "react";
import ItemsController from "../../controllers/ItemsController";
import { useDatabase } from "../../contexts/DatabaseContext";
import SearchableModal, { ISearchableItem } from "./SearchableModal";
import ProductItem from "../../models/ProductItem";
import { useLocale } from "../../contexts/Locale";

interface ItemSelectionModalProps {
  handleAddItem: (item: ProductItem | null) => void;
  onClose: () => void;
  isModalOpen?: boolean;
}

const ItemSelectionModal = ({
  handleAddItem,
  onClose,
  isModalOpen = false,
}: ItemSelectionModalProps) => {
  const { itemOS } = useDatabase();
  const [items, setItems] = useState<ProductItem[]>([]);
  const { stockManagement } = useClientGlobal();
  const t = useLocaleText();
  const { counts, error } = useStockCounts(items.map(item => item.getId()), stockManagement && isModalOpen);

  const {ADD_ITEM_MODAL_TITLE} = useLocale();

  useEffect(() => {
    if (!isModalOpen) return;
    let cancelled = false;
    const loadItems = async () => {
      const allItems = await new ItemsController(itemOS).getAllItems();
      if (!cancelled) setItems(allItems);
    };

    void loadItems();
    return () => { cancelled = true; };
  }, [itemOS, isModalOpen]);

  const searchableItemProps: ISearchableItem[] = items.map((item) => ({
    id: item.getId(),
    name: item.getName(),
    children: (
      <span className="selection-item">
        <span className="name">{item.getName()}{stockManagement && <small className="stock-selection-count">{t('STOCK_IN_STOCK')}: {error ? t('STOCK_UNAVAILABLE') : counts ? (counts[item.getId()] ?? 0) : '…'}</small>}</span>
        <Price price={item.getAmount()} />
      </span>
    ),
  }));

  if (isModalOpen)
    return (
      <SearchableModal
        title={ADD_ITEM_MODAL_TITLE}
        onClose={onClose}
        items={searchableItemProps}
        handleAdd={(searchableItem: ISearchableItem) =>
          handleAddItem(
            items.find((i) => i.getId() === searchableItem.id) || null
          )
        }
      />
    );
};

export default ItemSelectionModal;
