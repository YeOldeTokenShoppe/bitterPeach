import React from "react";

const Coin = ({ onClick }) => {
  return (
    <div className="purse">
      <div className="coin">
        <div className="front"></div>
        <div className="back"></div>
        <div className="side">
          {[...Array(16)].map((_, index) => (
            <div key={index} className="spoke"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Coin;
