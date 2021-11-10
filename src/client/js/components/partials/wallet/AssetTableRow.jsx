import React from "react";

export default function AssetTableRow({ iconUrl, name, symbol, price, balance }) {
    return (
        <div className="columns wallets-page-tokens-table__row">
            <div className="column is-3">
                <img className="token-icon" src={iconUrl} />
                <div className="wallets-page-tokens-table__content">
                    <h4 className="wallets-page-tokens-table__title">{name}</h4>
                    <span className="wallets-page-tokens-table__sub">{symbol} &middot; <span>USDC</span></span>
                </div>
            </div>
            <div className="column is-hidden-mobile is-3 align-right">
                <h4 className="wallets-page-tokens-table__title">{price.toLocaleString("en-US", { style: "currency", currency: "USD" })}</h4>
                <span className="wallets-page-tokens-table__sub">USD</span>
            </div>
            <div className="column is-3 align-right">
                <h4 className="wallets-page-tokens-table__title">{balance.toLocaleString("en-US", { style: "currency", currency: "USD" })}</h4>
                <span className="wallets-page-tokens-table__sub">USD</span>
            </div>
            <div className="column is-hidden-mobile is-3 align-right">
                <h4 className="wallets-page-tokens-table__title">{(balance*price).toLocaleString("en-US", { style: "currency", currency: "USD" })}</h4>
                <span className="wallets-page-tokens-table__sub">USD</span>
            </div>
        </div>
    );
}