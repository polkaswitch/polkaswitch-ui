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
import TokenIconImg from "./TokenIconImg";

export default class TxStatusView extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { data } = this.props;
    if (!data.from) {
      return (<div />);
    }

    var output = numeral(Utils.formatUnits(data.amount, this.props.data.from.decimals)).format('0.0000a');

    let lang, clazz;

    if (!data.completed) {
      lang = "Pending";
      clazz = "pending";
    } else if (data.success) {
      lang = "Completed";
      clazz = "success";
    } else {
      lang = "Failed";
      clazz = "failed";
    }

    return (
        <div className={classnames("level is-mobile tx-item", clazz)}>
          <div className="token-pair">
            <TokenIconImg
                size={30}
                mr={-10}
                z_index={10}
                token={data.from}
            />
            <TokenIconImg
                size={30}
                token={data.to}
            />
          </div>
          <div className="column">
            <div className="item-1">Trade</div>
            <div className="item-2">
              <TxExplorerLink
                chainId={data.chainId}
                hash={data.tx.hash}>
                View on explorer
              </TxExplorerLink>
            </div>
          </div>
          <div className="column is-mobile">
            <div className="item-1">{data.from.symbol}</div>
            <div className="item-2">{output}</div>
          </div>
          <div className="column is-mobile">
            <div className="item-1">
              <span className="icon is-left" width={11} height={11}>
                  <ion-icon name="arrow-forward"></ion-icon>
              </span>
              {data.to.symbol}
            </div>
            <div className="item-2">&nbsp;</div>
          </div>
          <div className="column">
            <div className="item-1"><span>{lang}</span></div>
            <div className="item-2">{moment(data.lastUpdated).format("MM/DD/YYYY h:mm A")}</div>
          </div>
        </div>
    );
  }
}

