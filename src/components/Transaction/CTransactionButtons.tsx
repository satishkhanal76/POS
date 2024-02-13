import Button from "../Button";
import "./Transaction.css";

export interface ITransactionButtonsProps {
  viewingTransaction: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onPostTransaction: () => void;
  onChangeQuantity: () => void;
  onLoadTransaction: () => void;
}

const TransactionButtons = ({
  onAdd,
  onRemove,
  onPostTransaction,
  onChangeQuantity,
  onLoadTransaction,
  viewingTransaction,
}: ITransactionButtonsProps) => {
  return (
    <div className="buttons-container">
      <Button
        disabled={!viewingTransaction}
        className={viewingTransaction ? "big-button active" : "big-button"}
        onClick={onAdd}
      >
        ADD
      </Button>
      <Button
        disabled={!viewingTransaction}
        className={viewingTransaction ? "big-button active" : "big-button"}
        onClick={onRemove}
      >
        Remove
      </Button>
      <Button
        disabled={!viewingTransaction}
        className={viewingTransaction ? "big-button active" : "big-button"}
        onClick={onPostTransaction}
      >
        Post Transaction
      </Button>
      <Button
        disabled={!viewingTransaction}
        className={viewingTransaction ? "big-button active" : "big-button"}
        onClick={onChangeQuantity}
      >
        Change Quantity
      </Button>
      <Button
        className={viewingTransaction ? "big-button active" : "big-button"}
        onClick={onLoadTransaction}
      >
        Load Prev Transaction
      </Button>
    </div>
  );
};

export default TransactionButtons;
