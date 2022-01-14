import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';

import Wallet from '../../utils/wallet';
import Metrics from '../../utils/metrics';
import EventManager from '../../utils/events';

export default class ConnectWalletButton extends Component {
  constructor(props) {
    super(props);
    this.state = { refresh: Date.now() };
    this.handleWalletChange = this.handleWalletChange.bind(this);
  }

  componentDidMount() {
    if (Wallet.isConnectedToAnyNetwork()) {
      Metrics.identify(Wallet.currentAddress());
    }

    this.subWalletChange = EventManager.listenFor(
      'walletUpdated',
      this.handleWalletChange,
    );
  }

  componentWillUnmount() {
    this.subWalletChange.unsubscribe();
  }

  handleConnection(e) {
    EventManager.emitEvent('promptWalletConnect', 1);
  }

  handleWalletChange() {
    this.setState({ refresh: Date.now() });
  }

  getTruncWalletAddress() {
    var address = Wallet.currentAddress();

    if (!address) {
      return 'n/a';
    }

    var first = address.substring(0, 7);
    var last = address.substring(address.length - 5, address.length);
    return `${first}...${last}`;
  }

  renderButtonContent() {
    if (Wallet.isConnectedToAnyNetwork()) {
      return (
        <>
          <span className="dot"></span>
          <img
            className="image-icon"
            width={20}
            height={18}
            src="/images/metamask.png"
          />
          <span className="wallet-address">{this.getTruncWalletAddress()}</span>
        </>
      );
    } else {
      return (
        <>
          <span>Connect Wallet</span>
        </>
      );
    }
  }

  render() {
    var isConnected = Wallet.isConnectedToAnyNetwork();

    return (
      <div>
        <div
          className={classnames('wallet-status', {
            'button is-primary': !isConnected,
          })}
          onClick={this.handleConnection.bind(this)}
        >
          {this.renderButtonContent()}
        </div>
     </div>
    );
  }
}
