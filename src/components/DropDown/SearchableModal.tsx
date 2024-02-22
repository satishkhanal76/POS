import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import "./DropDown.css";

export interface ISearchableItem {
  id: string;
  name: string;
  children: ReactNode;
}

interface AddItemsModalProps {
  handleAdd: (searchableItem: ISearchableItem) => void;
  items: ISearchableItem[];
}

interface ItemDetails {
  item: ISearchableItem;
  matchesSearch: boolean;
}

const SearchableModal = ({ handleAdd, items }: AddItemsModalProps) => {
  const [itemsDetails, setItemsDetails] = useState<ItemDetails[]>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItemsDetails(
      items.map((item) => ({ item, matchesSearch: true } as ItemDetails))
    );
  }, [items]);

  useEffect(() => {
    //focus everytime the component mounts and there is a new inputRef
    inputRef.current?.focus();
  }, [inputRef]);

  const handleOnChange = (eve: React.ChangeEvent<HTMLInputElement>) => {
    const input = eve.target.value;
    const f = input.toUpperCase();

    setItemsDetails((i) => {
      return i?.map((itemDetails) => {
        return itemDetails.item.name.toUpperCase().indexOf(f) > -1
          ? { ...itemDetails, matchesSearch: true }
          : { ...itemDetails, matchesSearch: false };
      });
    });
  };

  return (
    <div className="dropdown-wrapper">
      <div className="dropdown-container">
        <div className="dropdown-search-wrapper">
          <input
            onChange={(eve) => handleOnChange(eve)}
            ref={inputRef}
            tabIndex={1}
            className="dropdown-search"
            type="text"
          />
        </div>
        <div className="dropdown-list">
          {itemsDetails
            ?.filter((itemDetails) => itemDetails.matchesSearch) //grabs all items that match the search details
            ?.map((itemDetails) => (
              <div
                onBeforeInput={() => {
                  handleAdd(itemDetails.item);
                }}
                tabIndex={1}
                key={itemDetails.item.id}
                className="dropdown-item"
                onClick={() => {
                  handleAdd(itemDetails.item);
                }}
              >
                {itemDetails.item.children}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SearchableModal;
