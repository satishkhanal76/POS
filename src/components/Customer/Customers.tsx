import { useEffect, useMemo, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";
import CustomerController, {
  ICustomerFormData,
} from "../../controllers/CustomerController";
import CustomForm from "./CustomForm";
import { ICustomer } from "../../models/Customer";
import { useLocale } from "../../contexts/Locale";

const Customers = () => {
  const text = useLocale();
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const { customerOS } = useDatabase();
  const customerController = new CustomerController(customerOS);

  const handleFormSubmit = async (formData: ICustomerFormData) => {
    try {
      const customer = await customerController.handleFormSubmit(formData);
      setCustomers([...customers, customer]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (customer: ICustomer) => {
    const deletedCustomer = await customerController.deleteCustomer(customer);

    setCustomers(
      customers.filter((c) => c.getId() !== deletedCustomer.getId())
    );
  };

  useEffect(() => {
    customerController
      .getAllCustomers()
      .then((allCustomers) => setCustomers(allCustomers));
  }, []);
  return (
    <div>
      <CustomForm<ICustomerFormData>
        inputsProps={[
          {
            name: "name",
            id: "name",
            type: "text",
            placeholder: text.INPUT_CUSTOMER_NAME_PLACE_HOLDER,
            label: text.INPUT_CUSTOMER_NAME_LABEL,
          },
          {
            name: "phoneNumber",
            id: "phone-number",
            type: "text",
            placeholder: text.INPUT_CUSTOMER_PHONE_PLACE_HOLDER,
            label: text.INPUT_CUSTOMER_PHONE_LABEL,
          },
          {
            name: "button",
            id: "submit-button",
            type: "submit",
            value: text.CUSTOMER_FORM_SUBMIT_BUTTON,
          },
        ]}
        onFormSubmit={handleFormSubmit}
        formTitle={text.CUSTOMER_FORM_TITLE}
      ></CustomForm>
      <div className="customers-container">
        <h2 className="customers-title">{text.CUSTOMERS_TITLE}</h2>
        <div className="customers">
          {customers.map((customer: ICustomer) => {
            return (
              <div className="customer" key={customer.getId()}>
                <div className="name">{customer.getName()}</div>
                <div className="phone-number">{customer.getPhoneNumber()}</div>
                <button
                  className="delete-button"
                  onClick={() => handleDelete(customer)}
                >
                  {text.CUSTOMER_DELETE_BUTTON}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Customers;
