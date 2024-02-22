import { useEffect, useMemo, useState } from "react";
import { IItem } from "../../model/Item";
import ItemsController from "../../controllers/ItemsController";
import { useDatabase } from "../../contexts/DatabaseContext";
import SearchableModal, { ISearchableItem } from "../DropDown/SearchableModal";

interface ItemSelectionModalProps {
  handleAddItem: (item: IItem | null) => void;
  isModalOpen?: boolean;
}

const ItemSelectionModal = ({
  handleAddItem,
  isModalOpen = false,
}: ItemSelectionModalProps) => {
  const { itemOS } = useDatabase();
  const [items, setItems] = useState<IItem[]>([]);
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
        <span className="price">${item.getPrice()}</span>
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
