import React, { Component } from 'react';
import _ from "underscore";
import classnames from 'classnames';
import * as ethers from 'ethers';
import numeral from 'numeral';
import moment from 'moment';

const BigNumber = ethers.BigNumber;
const Utils = ethers.utils;

import TokenListManager from '../../utils/tokenList';

import TxExplorerLink from './TxExplorerLink';

export default class TxCrossChainHistoricalStatusView extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    var txData = this.props.data.crosschainTx;

    if (!txData) {
      return (<div />);
    }

    var sendingChain = TokenListManager.getNetworkById(txData.invariant.sendingChainId);
    var receivingChain = TokenListManager.getNetworkById(txData.invariant.receivingChainId);
    var sendingAsset = TokenListManager.findTokenById(
      Utils.getAddress(txData.invariant.sendingAssetId),
      sendingChain
    );
    var receivingAsset = TokenListManager.findTokenById(
      Utils.getAddress(txData.invariant.receivingAssetId),
      receivingChain
    );

    var input = numeral(Utils.formatUnits(txData.sending.amount, sendingAsset.decimals)).format('0.0000a');
    var output = numeral(Utils.formatUnits(txData.receiving.amount, receivingAsset.decimals)).format('0.0000a');

    var icon, lang, clazz;

    if (this.props.data.status === "FULFILLED") {
      icon = (<ion-icon name="checkmark-circle"></ion-icon>);
      lang = "SWAPPED";
      clazz = "success";
    } else {
      icon = (<ion-icon name="alert-circle"></ion-icon>);
      lang = "FAILED";
      clazz = "failed";
    }

    return (
      <div className={classnames("level is-mobile tx-item", clazz)}>
        <div className="level-item tx-icon">
          <div className="icon">
            {icon}
          </div>
        </div>
        <div className="level-item tx-content">
          <div>
            <div>{lang} {input} {sendingAsset.symbol} for {output} {receivingAsset.symbol}</div>
            <div>{sendingChain.name} > {receivingChain.name}</div>
            <div>
              <TxExplorerLink
                chainId={receivingChain.chainId}
                hash={this.props.data.fulfilledTxHash}>
                View on Explorer <ion-icon name="open-outline"></ion-icon>
              </TxExplorerLink>
            </div>
            <div className="tx-meta">
              {moment(this.props.data.preparedTimestamp * 1000).fromNow()}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

