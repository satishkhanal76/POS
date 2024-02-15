import { useEffect, useState } from "react";
import "../styles/POS.css";
import Transaction from "./Transaction/Transaction";

interface IPOSState {}

const POS = () => {
  return (
    <div className="pos-container">
      <Transaction />
    </div>
  );
};

export default POS;
