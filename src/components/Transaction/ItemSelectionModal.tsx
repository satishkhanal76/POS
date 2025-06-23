import { useMemo, useState } from "react";
import ItemsController from "../../controllers/ItemsController";
import { useDatabase } from "../../contexts/DatabaseContext";
import SearchableModal, { ISearchableItem } from "../DropDown/SearchableModal";
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
  const itemsController = new ItemsController(itemOS);

  const {ADD_ITEM_MODAL_TITLE} = useLocale();

  useMemo(() => {
    const loadItems = async () => {
      const allItems = await itemsController.getAllItems();
      setItems(allItems);
    };

    loadItems();
  }, []);

  const searchableItemProps: ISearchableItem[] = items.map((item) => ({
    id: item.getId(),
    name: item.getName(),
    children: (
      <div style={{display: "flex", justifyContent: "space-between"}}>
        <span className="name">{item.getName()}</span>
        <span className="price">${item.getAmount()}</span>
      </div>
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
