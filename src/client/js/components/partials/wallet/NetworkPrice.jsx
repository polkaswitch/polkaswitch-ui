import React from 'react';

export default function PortfolioNetwork({ logoURI, name, value, change }) {
  return (
    <div className="column is-3">
      <img className="is-rounded token-icon" src={logoURI} />
      <div className="portfolio-makeup__asset_container">
        <span className="portfolio-makeup__asset_heading">{name}</span>
        <span className="portfolio-makeup__asset_price">
          {value.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          })}{' '}
          ({change}
          %)
        </span>
      </div>
    </div>
  );
}
