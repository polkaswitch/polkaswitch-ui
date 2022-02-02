import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';
import * as ethers from 'ethers';
import numeral from 'numeral';
import dayjs from 'dayjs';
const Utils = ethers.utils;
import TxExplorerLink from './TxExplorerLink';

const Utils = ethers.utils;

export default class TxStatusNotificationView extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (!this.props.data.from) {
      return <div />;
    }

    const output = numeral(Utils.formatUnits(this.props.data.amount, this.props.data.from.decimals)).format('0.0000a');

    let icon;
    let lang;
    let clazz;

    if (!this.props.data.completed) {
      icon = <button className="button is-white is-loading">&nbsp;</button>;
      lang = 'PENDING';
      clazz = 'pending';
    } else if (this.props.data.success) {
      icon = <ion-icon name="checkmark-circle" />;
      lang = 'SWAPPED';
      clazz = 'success';
    } else {
      icon = <ion-icon name="alert-circle" />;
      lang = 'FAILED';
      clazz = 'failed';
    }

    return (
      <div className={classnames('level is-mobile tx-item', clazz)}>
        <div className="level-item tx-icon">
          <div className="icon">{icon}</div>
        </div>
        <div className="level-item tx-content">
          <div>
            <div>
              {lang} {output} {this.props.data.from.symbol} for {this.props.data.to.symbol}
            </div>
            <div>
              <TxExplorerLink chainId={this.props.data.chainId} hash={this.props.data.tx.hash}>
                View on Explorer <ion-icon name="open-outline" />
              </TxExplorerLink>
            </div>
          </div>
        </div>
        <div className="level-item tx-meta">
          {dayjs(this.props.data.lastUpdated).format('LT')}
        </div>
      </div>
    );
  }
}
