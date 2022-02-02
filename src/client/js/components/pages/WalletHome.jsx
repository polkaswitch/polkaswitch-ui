import React, { Component } from 'react';
import * as ethers from 'ethers';
import BN from 'bignumber.js';
import { BigNumber, constants, providers, Signer, utils } from 'ethers';
import _ from 'underscore';
import classnames from 'classnames';
import Navbar from '../partials/navbar/Navbar';
import ConnectWalletModal from '../partials/ConnectWalletModal';
import TxHistoryModal from '../partials/TxHistoryModal';
import NotificationSystem from '../partials/NotificationSystem';
import MobileMenu from '../partials/navbar/MobileMenu';
import NetworkPrice from '../partials/wallet/NetworkPrice';
import NetworkDropdown from '../partials/NetworkDropdown';
import AssetsTable from '../partials/wallet/AssetsTable';
import DisconnectedWallet from '../partials/wallet/DisconnectedWallet';
import EmptyBalances from '../partials/wallet/EmptyBalances';

import Wallet from '../../utils/wallet';
import TokenListManager from '../../utils/tokenList';
import EventManager from '../../utils/events';

export default class WalletHome extends Component {
  constructor(props) {
    super(props);
    this.state = {
      refresh: Date.now(),
      currentNetwork: TokenListManager.getCurrentNetworkConfig(),
      balances: [],
      loading: true,
    };

    this.NETWORKS = _.filter(window.NETWORK_CONFIGS, (v) => v.enabled);

    this.loadBalances = this.loadBalances.bind(this);
    this.handleWalletChange = this.handleWalletChange.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.renderBalancesAccrossNetworks = this.renderBalancesAccrossNetworks.bind(this);
    this.renderPortfolioMakeUp = this.renderPortfolioMakeUp.bind(this);
    this.renderWalletHome = this.renderWalletHome.bind(this);
  }

  componentDidMount() {
    this.subWalletChange = EventManager.listenFor('walletUpdated', this.handleWalletChange);

    this.loadBalances();
  }

  componentWillUnmount() {
    this.subWalletChange.unsubscribe();
  }

  handleWalletChange() {
    this.setState({
      refresh: Date.now(),
      balances: [],
      loading: true,
    });

    this.loadBalances();
  }

  handleConnect() {
    EventManager.emitEvent('promptWalletConnect', 1);
  }

  handleNetworkChange(network) {
    this.setState({
      refresh: Date.now(),
      balances: [],
      currentNetwork: network,
      loading: true,
    });

    this.loadBalances();
  }

  loadBalances() {
    _.defer(async () => {
      const { currentNetwork } = this.state;

      const balances = [];
      const promises = [];
      const localRefresh = this.state.refresh;

      const networks = this.NETWORKS;

      Promise.all(
        networks.map(
          (network) =>
            new Promise(async (resolve, reject) => {
              const tokenList = TokenListManager.getTokenListForNetwork(network);

              try {
                const nativeBalance = await Wallet.getDefaultBalance(network);
              } catch (e) {
                console.error('Failed to fetch balances from network: ', network.name);
                console.error(e);
                resolve(true);
                return; // go next network, if the provider is not working
              }

              for (let j = 0; j < tokenList.length; j++) {
                const token = tokenList[j];

                const p = Wallet.getBalance(token, network).then(
                  function (tk, net, balance) {
                    if (this.state.refresh === localRefresh && !balance.isZero()) {
                      this.setState({
                        balances: [
                          ...this.state.balances,
                          {
                            ...tk,
                            balance: +balance.toString() / Math.pow(10, tk.decimals),
                            balanceBN: balance,
                            price: 1,
                          },
                        ],
                      });
                    }
                  }.bind(this, token, network),
                );

                promises.push(p);
              }

              resolve(true);
            }),
        ),
      ).then(() => {
        // bleeding browser-support
        Promise.allSettled(promises).then(() => {
          console.log('Completed fetching balances from all networks');
          if (this.state.refresh === localRefresh) {
            this.setState({
              loading: false,
            });
          }
        });
      });
    });
  }

  renderBalancesAccrossNetworks() {
    const bMap = this.state.balances.reduce((_map, cv) => {
      let balance = 0;
      if (_map[cv.chainId]) {
        balance += _map[cv.chainId];
      }
      balance += cv.balance * cv.price;
      return { ..._map, [cv.chainId]: balance };
    }, {});

    return Object.keys(bMap).map((netId) => {
      const network = TokenListManager.getNetworkById(netId);
      return <NetworkPrice key={netId} logoURI={network.logoURI} name={network.name} value={bMap[netId]} change={0} />;
    });
  }

  renderPortfolioMakeUp() {
    if (Wallet.isConnectedToAnyNetwork() && this.state.balances.length) {
      return (
        <>
          <div className="columns is-hidden-mobile">
            <div className="column">
              <div className="portfolio-makeup__heading">Portfolio Makeup</div>
            </div>
          </div>

          <div className="columns is-hidden-mobile portfolio-makeup">{this.renderBalancesAccrossNetworks()}</div>
        </>
      );
    }
    return null;
  }

  renderWalletHome() {
    if (Wallet.isConnectedToAnyNetwork()) {
      if (!this.state.balances.length && this.state.currentNetwork === undefined) {
        return <EmptyBalances />;
      }
      return (
        <>
          <div className="columns is-centered">
            <div className="column card-container">
              <div className="card wallets-page-card">
                <div className="portfolio-balance level is-mobile">
                  <div className="level-left">
                    <h6 className="portfolio-balance__main-heading">Portfolio Overview</h6>
                  </div>
                  <div className="is-hidden level-right">
                    <NetworkDropdown
                      handleDropdownClick={this.handleNetworkChange}
                      selected={this.state.currentNetwork}
                    />
                  </div>
                </div>

                <div className="is-hidden columns total-balance">
                  <div className="column">
                    <h6 className="total-balance__sub-heading">Total Balance</h6>
                    <h2 className="total-balance__main-heading">
                      {this.state.balances
                        .reduce((p, t) => (p += t.price * t.balance), 0)
                        .toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        })}
                    </h2>
                  </div>
                </div>

                <div className="is-hidden">{this.renderPortfolioMakeUp()}</div>
              </div>
            </div>
          </div>
          <div className="columns is-centered">
            <div className="column card-container">
              <div className="card wallets-page-card">
                <div className="tokens-table-title-container">
                  <span className="tokens-table-title-container__main">Assets</span>
                  <span className="is-hidden tokens-table-title-container__sub">Don't see your assets?</span>
                </div>

                <AssetsTable tokenData={this.state.balances} loading={this.state.loading} />
              </div>
            </div>
          </div>
        </>
      );
    }
    return <DisconnectedWallet onClick={this.handleConnect} />;
  }

  render() {
    return (
      <div className="container">
        <Navbar />
        <MobileMenu />
        <NotificationSystem />
        <ConnectWalletModal />
        <TxHistoryModal />

        {this.renderWalletHome()}
      </div>
    );
  }
}
