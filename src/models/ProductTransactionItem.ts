import ProductItem from "./ProductItem";
import TransactionItem, {
  ITransactionItem,
  TransactionItemParams,
} from "./TransactionItem";

export interface IProductTransactionItem
  extends ITransactionItem<ProductItem> {}

export interface ProductTransactionItemParams
  extends TransactionItemParams<ProductItem> {}

export default class ProductTransactionItem
  extends TransactionItem<ProductItem>
  implements IProductTransactionItem
{
  constructor(productTransItemSchema: ProductTransactionItemParams) {
    super(productTransItemSchema);
  }
}
