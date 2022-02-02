import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';
import * as ethers from 'ethers';
import numeral from 'numeral';
import moment from 'moment';

import TokenListManager from '../../utils/tokenList';

import TxExplorerLink from './TxExplorerLink';

const { BigNumber } = ethers;
const Utils = ethers.utils;

export default class TxCrossChainHistoricalStatusView extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const txData = this.props.data.crosschainTx;

    if (!txData) {
      return <div />;
    }

    const sendingChain = TokenListManager.getNetworkById(txData.invariant.sendingChainId);
    const receivingChain = TokenListManager.getNetworkById(txData.invariant.receivingChainId);
    const sendingAsset = TokenListManager.findTokenById(
      Utils.getAddress(txData.invariant.sendingAssetId),
      sendingChain,
    );
    const receivingAsset = TokenListManager.findTokenById(
      Utils.getAddress(txData.invariant.receivingAssetId),
      receivingChain,
    );

    const input = numeral(Utils.formatUnits(txData.sending.amount, sendingAsset.decimals)).format('0.0000a');

    let output;
    let icon;
    let lang;
    let clazz;

    if (txData.receiving?.amount) {
      output = numeral(Utils.formatUnits(txData.receiving.amount, receivingAsset.decimals)).format('0.0000a');
    }

    if (this.props.data.status === 'FULFILLED') {
      icon = <ion-icon name="checkmark-circle" />;
      lang = 'SWAPPED';
      clazz = 'success';
    } else {
      icon = <ion-icon name="alert-circle" />;
      lang = 'FAILED';
      clazz = 'failed';
    }

    return (
      <div className={classnames('level is-mobile tx-item tx-history', clazz)}>
        <div className="level-item tx-icon">
          <div className="icon">{icon}</div>
        </div>
        <div className="level-item tx-content">
          <div>
            <div>
              {lang} {input} {sendingAsset.symbol} for {output} {receivingAsset.symbol}
            </div>
            <div>
              {sendingChain.name} &gt;
              {receivingChain.name}
            </div>
            <div>
              <TxExplorerLink chainId={receivingChain.chainId} hash={this.props.data.fulfilledTxHash}>
                View on Explorer <ion-icon name="open-outline" />
              </TxExplorerLink>
            </div>
            <div className="tx-meta">{moment(this.props.data.preparedTimestamp * 1000).fromNow()}</div>
          </div>
        </div>
      </div>
    );
  }
}
