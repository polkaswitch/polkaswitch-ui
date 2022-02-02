import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';

import Wallet from '../../utils/wallet';
import Metrics from '../../utils/metrics';
import EventManager from '../../utils/events';
import TokenListManager from '../../utils/tokenList';

import BasicModal from './BasicModal';

export default class ConnectWalletModal extends Component {
  constructor(props) {
    super(props);
    this.state = { refresh: Date.now(), open: false };
    this.handleWalletChange = this.handleWalletChange.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
  }

  componentDidMount() {
    this.subWalletChange = EventManager.listenFor('walletUpdated', this.handleWalletChange);
    this.subConnectPrompt = EventManager.listenFor('promptWalletConnect', this.handleOpen);
  }

  componentWillUnmount() {
    this.subWalletChange.unsubscribe();
    this.subConnectPrompt.unsubscribe();
  }

  handleConnection(target) {
    return function (e) {
      if (Wallet.isConnected()) {
        return false;
      }

      Metrics.track('connect-wallet', { type: target });
      EventManager.emitEvent('initiateWalletConnect', target);
    };
  }

  handleDisconnect(e) {
    Wallet.disconnect();
  }

  handleWalletChange() {
    this.setState({ refresh: Date.now() });

    if (Wallet.isConnected()) {
      Metrics.identify(Wallet.currentAddress());
      if (this.state.open) {
        this.handleClose();
      }
    }
  }

  handleOpen(e) {
    this.setState({
      open: true,
    });
  }

  handleClose(e) {
    this.setState({
      open: false,
    });
  }

  render() {
    const currentNetworkName = TokenListManager.getCurrentNetworkConfig().chain.chainName;

    return (
      <BasicModal
        modalClasses="modal-dropdown-options"
        open={this.state.open}
        title="Connect Your Wallet"
        handleClose={this.handleClose}
      >
        <div
          className={classnames('option', {
            connected: Wallet.isConnected('metamask'),
          })}
          onClick={this.handleConnection('metamask')}
        >
          <div className="level is-mobile is-narrow">
            <div className="level-left">
              <div className="level-item">
                <div>
                  <div>MetaMask</div>
                  {Wallet.isConnected('metamask') && (
                    <>
                      <div className="connected">Connected</div>
                      <div className="connected">{Wallet.currentAddress()}</div>
                    </>
                  )}
                  {!Wallet.isMetamaskSupported() && (
                    <>
                      <div className="error">Please install Metamask Plugin first!</div>
                    </>
                  )}
                  {Wallet.isConnectedToAnyNetwork() && !Wallet.isMatchingConnectedNetwork() && (
                    <>
                      <div className="error">
                        You are connected to the wrong network!
                        <br />
                        Click here to switch to the {currentNetworkName}
                      </div>
                    </>
                  )}
                  {Wallet.isMetamaskSupported() && !Wallet.isConnectedToAnyNetwork() && (
                    <>
                      <div className="has-text-info">Click here to connect to {currentNetworkName}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="level-right">
              <div className="level-item">
                <img src="/images/metamask.png" />
              </div>
            </div>
          </div>
        </div>
        <div
          className={classnames('option', {
            connected: Wallet.isConnected('walletConnect'),
          })}
          onClick={this.handleConnection('walletConnect')}
        >
          <div className="level is-mobile is-narrow">
            <div className="level-left">
              <div className="level-item">
                <div>
                  <div>WalletConnect</div>
                  {Wallet.isConnected('walletConnect') && (
                    <>
                      <div className="connected">Connected</div>
                      <div className="connected">{Wallet.currentAddress()}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="level-right">
              <div className="level-item">
                <img src="/images/walletConnect.svg" />
              </div>
            </div>
          </div>
        </div>
        <div className="option coming-soon">
          <div className="level is-mobile is-narrow">
            <div className="level-left">
              <div className="level-item">Coinbase Wallet (Coming Soon)</div>
            </div>
            <div className="level-right">
              <div className="level-item">
                <img src="/images/coinbaseWallet.svg" />
              </div>
            </div>
          </div>
        </div>

        <div
          className={classnames('option bare', {
            'is-hidden': !Wallet.isConnected(),
          })}
        >
          <button className="button is-danger is-outlined" onClick={this.handleDisconnect}>
            Disconnect
          </button>
        </div>

        <div className="footnote">
          <div>
            New to{' '}
            <a target="_blank" href="https://ethereum.org/wallets/">
              Ethereum
            </a>
            ,{' '}
            <a target="_blank" href="https://polygon.technology/technology/">
              Polygon
            </a>
            , or{' '}
            <a target="_blank" href="https://wiki.polkadot.network/docs/en/getting-started">
              Polkadot
            </a>
            ?
          </div>
        </div>
      </BasicModal>
    );
  }
}
