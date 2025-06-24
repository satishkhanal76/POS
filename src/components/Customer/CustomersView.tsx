
import { useLocale } from "../../contexts/Locale";
import { ICustomer } from "../../models/Customer";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";

interface ICustomersViewProps {
  customers: ICustomer[];
  handleDelete: (customer: ICustomer) => void;
}

const CustomersView = ({customers, handleDelete}: ICustomersViewProps) => {
  const text = useLocale();

  const columns: CustomTableColumn<ICustomer>[] = [
    {key: "name", header: text.CUSTOMER_TABLE_HEADER_NAME, render: (customer) => <>{customer.getName()}</>},
    {key: "phone-number", header: text.CUSTOMER_TABLE_HEADER_PHONE, render: (customer) => <>{customer.getPhoneNumber()}</>},
    {key: "actions", header: "", render: (customer) => <button onClick={() => handleDelete(customer)}>{text.CUSTOMER_TABLE_DELETE_BUTTON}</button>},

  ];
  return (
    <CustomTableView data={customers} columns={columns} rowKey={(customer) => customer.getId()} />
  );
};

export default CustomersView;
