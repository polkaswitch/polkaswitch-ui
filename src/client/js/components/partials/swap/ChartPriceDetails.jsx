import React from 'react';
export default function ChartPriceDetails(props) {
  const priceDetails = props.priceDetails
  const renderPrice = (price, isPair) => {
    if (isPair) {
      return (
        <div className="price">{price}</div>
      );
    } else {
      return (
        <div className="price">${price}</div>
      );
    }
  }

  const renderPercent = (percent) => {
    if (percent > 0) {
      return (
        <div className="percent" style={{color: '#58B57E'}}>{percent}%</div>
      );
    } else if (percent < 0) {
      return (
        <div className="percent" style={{color: '#E6007A'}}>{percent}%</div>
      );
    }
  }

  return (
      <div className="price-details" aria-label="Bal: ">
          {renderPrice(priceDetails.price, props.isPair)}
          <div className="wrapper is-right">
            {renderPercent(priceDetails.percent)}
            <div className="period">{priceDetails.from}</div>
          </div>
      </div>
    );
}

