import Button, { IButtonProps } from "../Button";
import "./TransactionButtons.css";

interface TransactionButtonsProps {
  buttonsProps: IButtonProps[];
  buttonsClassName: string;
  buttonsClassNameWhenActive: string;
}

const TransactionButtons = ({
  buttonsProps,
  buttonsClassName,
  buttonsClassNameWhenActive,
}: TransactionButtonsProps) => {
  return (
    <div className="buttons-container">
      {buttonsProps.map((buttonProps, i) => {
        return (
          <Button
            key={i}
            className={
              buttonProps.disabled
                ? buttonsClassName
                : buttonsClassNameWhenActive
            }
            {...buttonProps}
          ></Button>
        );
      })}
    </div>
  );
};

export default TransactionButtons;
