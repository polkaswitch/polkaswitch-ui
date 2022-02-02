import React from 'react';
import * as ethers from 'ethers';
import BN from 'bignumber.js';
import { BigNumber, constants, providers, Signer, utils } from 'ethers';
import TokenIconImg from '../TokenIconImg';
import TokenListManager from '../../../utils/tokenList';

export default function AssetTableRow({ data }) {
  const Utils = window.ethers.utils;

  const network = TokenListManager.getNetworkById(data.chainId);
  const fullOutput = utils.formatUnits(data.balanceBN, data.decimals);

  return (
    <div className="columns wallets-page-tokens-table__row is-mobile">
      <div className="column is-half">
        <TokenIconImg network={network} size={35} token={data} />
        <div className="wallets-page-tokens-table__content">
          <h4 className="wallets-page-tokens-table__title">{data.name || data.symbol}</h4>
          <span className="wallets-page-tokens-table__sub">
            {data.symbol} &middot;
            <span>{network.name}</span>
          </span>
        </div>
      </div>
      <div className="is-hidden column is-hidden-mobile align-right">
        <h4 className="wallets-page-tokens-table__title">
          {data.price.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          })}
        </h4>
        <span className="wallets-page-tokens-table__sub">USD</span>
      </div>
      <div className="column align-right is-half">
        <h4 className="wallets-page-tokens-table__title">{fullOutput}</h4>
        <span className="wallets-page-tokens-table__sub">{data.symbol}</span>
      </div>
      <div className="is-hidden column is-hidden-mobile align-right">
        <h4 className="wallets-page-tokens-table__title">
          {(data.balance * data.price).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          })}
        </h4>
        <span className="wallets-page-tokens-table__sub">USD</span>
      </div>
    </div>
  );
}
