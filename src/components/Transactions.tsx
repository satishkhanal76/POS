const Transactions = () => {
  return (
    <div className="transaction-container">
      <div className="transaction-title">Transaction</div>
      <div className="transaction-item active">
        <span className="quantity">1</span>
        <span className="name">Apple</span>
        <span className="price">$5</span>
      </div>
      <div className="transaction-item">
        <span className="quantity">1</span>
        <span className="name">Apple</span>
        <span className="price">$5</span>
      </div>
      <div className="transaction-item">
        <span className="quantity">1</span>
        <span className="name">Apple</span>
        <span className="price">$5</span>
      </div>
    </div>
  );
};

export default Transactions;
