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

export default class TxCrossChainActiveStatusView extends Component {
  constructor(props) {
    super(props);
    this.handleFinishAction = this.handleFinishAction.bind(this);
  }

  handleFinishAction(transactionId) {
    return function (e) {
      this.props.handleFinishAction(transactionId);
    }.bind(this);
  }

  render() {
    const txData = this.props.data.crosschainTx;

    if (!txData) {
      return <div />;
    }

    const sendingChain = TokenListManager.getNetworkById(
      txData.invariant.sendingChainId,
    );
    const receivingChain = TokenListManager.getNetworkById(
      txData.invariant.receivingChainId,
    );
    const sendingAsset = TokenListManager.findTokenById(
      Utils.getAddress(txData.invariant.sendingAssetId),
      sendingChain,
    );
    const receivingAsset = TokenListManager.findTokenById(
      Utils.getAddress(txData.invariant.receivingAssetId),
      receivingChain,
    );

    const input = txData.sending.amount
      ? numeral(
        Utils.formatUnits(txData.sending.amount, sendingAsset.decimals),
      ).format('0.0000a')
      : '--';

    let icon; let lang; let
      clazz;

    const isActionNeeded = this.props.data.status === 'ReceiverTransactionPrepared';

    if (isActionNeeded) {
      icon = <ion-icon name="information-circle" />;
      lang = <div>ACTION NEEDED</div>;
      clazz = 'action';
    } else {
      icon = <button className="button is-white is-loading">&nbsp;</button>;
      lang = 'PENDING';
      clazz = 'pending';
    }

    return (
      <div className={classnames('level is-mobile tx-history tx-item', clazz)}>
        <div className="level-item tx-icon">
          <div className="icon">{icon}</div>
        </div>
        <div className="level-item tx-content">
          <div>
            <div>
              {lang}
              {' '}
              {input}
              {' '}
              {sendingAsset.symbol}
              {' '}
              to
              {' '}
              {receivingAsset.symbol}
            </div>
            <div>
              {sendingChain.name}
              {' '}
              &gt;
              {receivingChain.name}
            </div>
            <div className="tx-meta">
              {moment(this.props.data.preparedTimestamp * 1000).fromNow()}
            </div>
          </div>
        </div>
        {isActionNeeded && (
          <div className="level-item tx-action">
            <button
              className="button is-warning is-small"
              onClick={this.handleFinishAction(txData.invariant.transactionId)}
            >
              Finish
            </button>
          </div>
        )}
      </div>
    );
  }
}
