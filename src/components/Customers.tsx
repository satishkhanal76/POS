import { useEffect, useState } from "react";
import { useDatabase } from "../contexts/DatabaseContext";
import CustomerController, {
  ICustomerFormData,
} from "../controllers/CustomerController";
import CustomForm from "./CustomForm";
import { ICustomer } from "../model/Customer";

const Customers = () => {
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
      .then((allCustomers) => setCustomers([...customers, ...allCustomers]));
  }, []);
  return (
    <div>
      <CustomForm<ICustomerFormData>
        inputsProps={[
          {
            name: "name",
            id: "name",
            type: "text",
            placeholder: "Customer Name..",
            label: "Name:",
          },
          {
            name: "phoneNumber",
            id: "phone-number",
            type: "text",
            placeholder: "Phone Number..",
            label: "Phone Number:",
          },
          {
            name: "button",
            id: "submit-button",
            type: "submit",
            value: "Add Customer",
          },
        ]}
        onFormSubmit={handleFormSubmit}
        formTitle="Add A Customer"
      ></CustomForm>
      <div className="customers-container">
        {customers.map((customer: ICustomer) => {
          return (
            <div className="customer" key={customer.getId()}>
              <div className="name">Name: {customer.getName()}</div>
              <div className="phone-number">
                Phone: {customer.getPhoneNumber()}
              </div>
              <button onClick={(eve) => handleDelete(customer)}>Delete</button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Customers;
