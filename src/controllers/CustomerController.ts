import CustomerOS, {
  CustomerSchema,
  ICustomerOS,
} from "../database/CustomerOS";
import Customer, { CustomerParams, ICustomer } from "../model/Customer";
import { v4 as uuidv4 } from "uuid";
import Controller, { IController } from "./Controller";

export interface ICustomerFormData {
  name: string;
  phoneNumber: string;
}

export interface ICustomerController<S, I, OS> extends IController<S, I, OS> {
  handleFormSubmit: (data: S) => Promise<I>;
  getAllCustomers: () => Promise<I[]>;
  deleteCustomer: (customer: I) => Promise<I>;
}

export default class CustomerController
  extends Controller<CustomerSchema, ICustomer, CustomerOS>
  implements ICustomerController<CustomerSchema, ICustomer, ICustomerOS>
{
  constructor(customerOS: CustomerOS) {
    super(customerOS);
  }

  public async handleFormSubmit({ name, phoneNumber }: ICustomerFormData) {
    const cutomer: ICustomer = new Customer({
      id: uuidv4(),
      name,
      phoneNumber,
    });

    return this.addOne(cutomer);
  }

  public async getAllCustomers() {
    const dbCustomers = await this.getAll();
    return dbCustomers.map(
      (dbCustomer) => new Customer(dbCustomer as CustomerParams)
    );
  }

  public async deleteCustomer(customer: ICustomer) {
    await this.deleteOne(customer.getId());
    return customer;
  }
}
