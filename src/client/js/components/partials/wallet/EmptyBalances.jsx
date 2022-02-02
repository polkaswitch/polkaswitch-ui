import React from 'react';

export default function EmptyBalances() {
  return (
    <div className="columns is-centered">
      <div className="column card-container">
        <div className="card wallets-page-card">
          <div className="tokens-table-title-container">
            <span className="tokens-table-title-container__main">Assets</span>
          </div>

          <div className="columns">
            <div className="column data-na-container">
              <img src="/images/group.svg" alt="Connect Wallet" />
              <h2>Your crypto assets will show up here.</h2>
              <h3>Add assets to your wallet to display up to date prices and balances..</h3>
              <button className="button is-success">Start Trading</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
