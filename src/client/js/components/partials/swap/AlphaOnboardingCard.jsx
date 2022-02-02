import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';

import Wallet from '../../../utils/wallet';
import Metrics from '../../../utils/metrics';
import EventManager from '../../../utils/events';
import TokenListManager from '../../../utils/tokenList';
import SwapFn from '../../../utils/swapFn';

export default class AlphaOnboardingCard extends Component {
  constructor(props) {
    super(props);
    this.state = { minting: false, success: false, refresh: Date.now() };
    this.handleMint = this.handleMint.bind(this);
    this.handleNetworkChange = this.handleNetworkChange.bind(this);
  }

  componentDidMount() {
    this.subNetworkChange = EventManager.listenFor('networkUpdated', this.handleNetworkChange);
  }

  componentWillUnmount() {
    this.subNetworkChange.unsubscribe();
  }

  handleNetworkChange() {
    this.setState({
      refresh: Date.now(),
    });
  }

  handleMint(e) {
    if (!Wallet.isConnected()) {
      EventManager.emitEvent('promptWalletConnect', 1);
    } else {
      this.setState(
        {
          minting: true,
        },
        () => {
          Promise.all(
            _.map(['METH', 'MUNI', 'MSUSHI', 'MBAL'], (sym) => SwapFn.mint(sym, window.ethers.utils.parseEther('100'))),
          ).then((values) => {
            this.setState({
              minting: false,
              success: true,
            });
            console.log('done');
          });
        },
      );
    }
  }

  render() {
    const network = TokenListManager.getCurrentNetworkConfig();

    if (+network.chainId === 1287) {
      return (
        <div className="alpha-banner notification is-warning is-light">
          <div className="content">
            <p className="is-size-6">
              <b>Welcome to the Polkaswitch Alpha launch!</b>
            </p>
            <p>
              As we work closely with our technology partners for the Mainnet launch, you may experience intermittent
              issues.
            </p>
            <p>
              To be able to perform swaps on the Polkaswitch Alpha, we have built the following tool to conveniently
              mint test tokens into your connected wallet.
            </p>
            <p className="is-italic">100 Tokens will be added under METH, MUNI, MSUSHI and MBAL</p>
            <div className="buttons">
              <button
                disabled
                className={classnames('button is-success', {
                  'is-hidden': !this.state.success,
                })}
              >
                Tokens Added!
              </button>
              <button
                onClick={this.handleMint}
                disabled={this.state.minting}
                className={classnames('button is-warning', {
                  'is-loading': this.state.minting,
                  'is-hidden': this.state.success,
                })}
              >
                Mint Test Tokens
              </button>
            </div>
          </div>
        </div>
      );
    }
    return <div />;
  }
}
