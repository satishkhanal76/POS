import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { MdClose } from "react-icons/md";
// import "./DropDown.css";

import './SearchableModal.css';
import { useLocale } from "../../contexts/Locale";

export interface ISearchableItem {
  id: string;
  name: string;
  children: ReactNode;
}

interface AddItemsModalProps {
  handleAdd: (searchableItem: ISearchableItem) => void;
  onClose: () => void;
  items: ISearchableItem[];
  title?: string;
  searchPlaceholderText?: string;
}

interface ItemDetails {
  item: ISearchableItem;
  matchesSearch: boolean;
}

const SearchableModal = ({ title, searchPlaceholderText, handleAdd, onClose, items }: AddItemsModalProps) => {
  const [itemsDetails, setItemsDetails] = useState<ItemDetails[]>();
  const inputRef = useRef<HTMLInputElement>(null);

  const {SEARCH_MODAL_DEFAULT_TITLE, SEARCH_BOX_DEFAULT_PLACEHOLDER } = useLocale();

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
    <div className="modal-wrapper">
      <div className="modal-conatiner">
        <div className="modal-title-container">
          <h4>{title || SEARCH_MODAL_DEFAULT_TITLE}</h4>
          <span onClick={onClose}><MdClose/></span>
        </div>
        <div className="modal-search-container">
          <input
            placeholder={searchPlaceholderText || SEARCH_BOX_DEFAULT_PLACEHOLDER}
            onChange={(eve) => handleOnChange(eve)}
            ref={inputRef}
            tabIndex={1}
            className="modal-search"
            type="text"
          />
        </div>
        <div className="modal-items-container">
          {itemsDetails
            ?.filter((itemDetails) => itemDetails.matchesSearch) //grabs all items that match the search details
            ?.map((itemDetails) => (
              <div
                onBeforeInput={() => {
                  handleAdd(itemDetails.item);
                }}
                tabIndex={1}
                key={itemDetails.item.id}
                className="modal-item"
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
