import PageHeader from "../Layout/PageHeader";
import React, { useEffect, useState } from "react";
import FullScreenModal from "../Modals/FullScreenModal";
import CustomForm from "../Customer/CustomForm";
import { useLocale } from "../../contexts/Locale";
import { ICustomer } from "../../models/Customer";
import { useDatabase } from "../../contexts/DatabaseContext";
import CustomerController, { ICustomerFormData } from "../../controllers/CustomerController";
import { MdAdd } from "react-icons/md";
import CustomersView from "../Customer/CustomersView";

const CustomersPage = () => {

  const [isAddModalOpen, setIsModalOpen] = useState<boolean>(false);
    
  
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
    
  return <>
          {isAddModalOpen && <FullScreenModal title={text.CUSTOMER_FORM_TITLE} onClose={() => setIsModalOpen(false)}>
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
                  className: "btn"
                },
              ]}
              onFormSubmit={handleFormSubmit}
            ></CustomForm>
          </FullScreenModal>}
          <PageHeader title={text.CUSTOMERS_TITLE} actions={<button type="button" className="page-add-button" onClick={() => setIsModalOpen(true)} aria-label="Add a customer" title="Add a customer"><MdAdd aria-hidden="true" /></button>} />
          <CustomersView handleDelete={handleDelete} customers={customers} />
        </>;
};

export default CustomersPage;
