export interface ICustomer {
  getId: () => string;
  getName: () => string;
  getPhoneNumber: () => string;
}

export interface CustomerParams {
  id: string;
  name: string;
  phoneNumber: string;
}

export default class Customer implements ICustomer {
  private id: string;
  private name: string;
  private phoneNumber: string;

  constructor({ id, name, phoneNumber }: CustomerParams) {
    this.id = id;
    this.name = name;
    this.phoneNumber = phoneNumber;
  }

  public getId() {
    return this.id;
  }

  public getName() {
    return this.name;
  }

  public getPhoneNumber() {
    return this.phoneNumber;
  }
}
