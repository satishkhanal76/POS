import { useEffect, useMemo, useState } from "react";
import ItemsController from "../../controllers/ItemsController";
import { useDatabase } from "../../contexts/DatabaseContext";
import SearchableModal, { ISearchableItem } from "../DropDown/SearchableModal";
import ProductItem, { IProductItem } from "../../models/ProductItem";

interface ItemSelectionModalProps {
  handleAddItem: (item: ProductItem | null) => void;
  isModalOpen?: boolean;
}

const ItemSelectionModal = ({
  handleAddItem,
  isModalOpen = false,
}: ItemSelectionModalProps) => {
  const { itemOS } = useDatabase();
  const [items, setItems] = useState<ProductItem[]>([]);
  const itemsController = new ItemsController(itemOS);

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
      <>
        <span className="name">{item.getName()}</span>
        <span className="price">${item.getAmount()}</span>
      </>
    ),
  }));

  if (isModalOpen)
    return (
      <SearchableModal
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
