import { useLocaleText } from "../../contexts/Locale";
import { useEffect, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";
import SearchableModal, { ISearchableItem } from "../Modals/SearchableModal";
import CustomerController from "../../controllers/CustomerController";
import { ICustomer } from "../../models/Customer";

interface ItemSelectionModalProps {
  handleAddItem: (customer: ICustomer | null) => void;
  isModalOpen?: boolean;
  title?: string;
  onClose: () => void;
}

const CustomerSelectionModal = ({
  handleAddItem,
  onClose,
  isModalOpen = false,
  title,
}: ItemSelectionModalProps) => {
  const t = useLocaleText();
  const { customerOS } = useDatabase();
  const [customers, setCustomers] = useState<ICustomer[]>([]);

  useEffect(() => {
    if (!isModalOpen) return;
    let cancelled = false;
    const loadItems = async () => {
      const allCustomers = await new CustomerController(
        customerOS,
      ).getAllCustomers();
      if (!cancelled) setCustomers(allCustomers);
    };

    void loadItems().catch(() => {
      if (!cancelled) setCustomers([]);
    });
    return () => {
      cancelled = true;
    };
  }, [customerOS, isModalOpen]);

  const searchableItemProps: ISearchableItem[] = customers.map((customer) => ({
    id: customer.getId(),
    name: customer.getName(),
    children: (
      <>
        <span className="name">{customer.getName()}</span>
      </>
    ),
  }));

  if (isModalOpen)
    return (
      <SearchableModal
        title={title ?? t("UI_SELECT_A_CUSTOMER")}
        onClose={onClose}
        items={searchableItemProps}
        handleAdd={(searchableItem: ISearchableItem) =>
          handleAddItem(
            customers.find((i) => i.getId() === searchableItem.id) || null,
          )
        }
      />
    );
};

export default CustomerSelectionModal;
