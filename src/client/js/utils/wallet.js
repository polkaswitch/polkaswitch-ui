import _ from 'underscore';
import EventManager from './events';
import * as ethers from 'ethers';
import TokenListManager from './tokenList';
import BN from 'bignumber.js';
import * as Sentry from '@sentry/react';

import WalletConnectProvider from '@walletconnect/web3-provider';

const BigNumber = ethers.BigNumber;
const Utils = ethers.utils;
const Contract = ethers.Contract;

window.WalletJS = {
  _cachedWeb3Provider: undefined,
  _cachedCurrentAddress: undefined,
  _cachedNetworkId: -1,
  _cachedStrategy: undefined,

  providerConfigs: {
    walletConnect: {},
  },

  initialize: async function () {
    // initialize MetaMask if already connected
    if (window.ethereum) {
      this.initListeners(window.ethereum);

      if (window.ethereum.selectedAddress) {
        var web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        await this._saveConnection(web3Provider, 'metamask');
      }
    } else if (false) {
      // TODO init WalletConnect
    }

    window.erc20Abi = await (await fetch('/abi/erc20_standard.json')).json();
    window.oneSplitAbi = await (await fetch('/abi/test/OneSplit.json')).json();
    window.crossChainOneSplitAbi = await (
      await fetch('/abi/cross-chain/cross-chain-aggregator.json')
    ).json();
    window.polygonAbi = await (await fetch('/abi/test/Polygon.json')).json();
    window.moonriverAbi = await (await fetch('/abi/test/Moonriver.json')).json();
    window.xDaiAbi = await (await fetch('/abi/test/Xdai.json')).json();
    window.harmonyAbi = await (await fetch('/abi/test/Harmony.json')).json();

    EventManager.listenFor(
      'initiateWalletConnect',
      this._connectWalletHandler.bind(this),
    );
  },

  initListeners: function (provider) {
    provider.on(
      'accountsChanged',
      function (accounts) {
        // Time to reload your interface with accounts[0]!
        console.log('event - accountsChanged:', accounts);
        if (accounts.length === 0) {
          this.disconnect();
          EventManager.emitEvent('walletUpdated', 1);
        } else if (
          accounts[0] != this.currentAddress() &&
          this._cachedWeb3Provider
        ) {
          this._saveConnection(this._cachedWeb3Provider, this._cachedStrategy);
        }
      }.bind(this),
    );

    provider.on(
      'disconnect',
      function (providerRpcError) {
        console.log('event - disconnect:', providerRpcError);
        this.disconnect();
        EventManager.emitEvent('walletUpdated', 1);
      }.bind(this),
    );

    provider.on(
      'chainChanged',
      function (chainId) {
        console.log('event - chainChanged:', chainId);
        // if chain changes due to manual user change, not via connect change:
        // just wipe clean, too hard to manage otherwise
        this._cachedNetworkId = chainId;
        if (!this.isMatchingConnectedNetwork()) {
          this.disconnect();
        }

        EventManager.emitEvent('walletUpdated', 1);
      }.bind(this),
    );
  },

  getReadOnlyProvider: function(chainId) {
    var network = chainId ?
      TokenListManager.getNetworkById(chainId) :
      TokenListManager.getCurrentNetworkConfig();
    const provider = new ethers.providers.JsonRpcProvider(network.nodeProviders[0]);
    return provider;
  },

  getProvider: function (strictCheck) {
    var condition = strictCheck
      ? this.isConnected()
      : this.isConnectedToAnyNetwork();

    if (condition) {
      return this._cachedWeb3Provider;
    } else {
      return this.getReadOnlyProvider();
    }
  },

  getBalance: function(token, optionalNetwork) {
    // if network specified, as long as we connected to any network is fine,
    // if it's not provided, we need to be on the right network to get the right balance
    if ((!!optionalNetwork && this.isConnectedToAnyNetwork()) || this.isConnected()) {
      if (token.native) {
        return this.getDefaultBalance(optionalNetwork);
      } else if (token.address) {
        return this.getERC20Balance(token.address, optionalNetwork);
      }
    } else {
      return Promise.resolve(BigNumber.from(0));
    }
  },

  getDefaultBalance: function (optionalNetwork) {
    if (optionalNetwork) {
      let provider = new ethers.providers.StaticJsonRpcProvider(optionalNetwork.nodeProviders[0]);
      return provider.getBalance(this.currentAddress());
    } else {
      return this.getProvider().getBalance(this.currentAddress());
    }
  },

  getERC20Balance: async function (tokenContractAddress, optionalNetwork) {
    let provider;

    if (optionalNetwork) {
      provider = new ethers.providers.StaticJsonRpcProvider(optionalNetwork.nodeProviders[0]);
    } else {
      provider = this.getProvider();
    }

    const contract = new Contract(
      tokenContractAddress,
      window.erc20Abi,
      provider,
    );
    return await contract.balanceOf(this.currentAddress());
  },

  getName: async function (tokenAddr) {
    if (this.isConnected() && tokenAddr) {
      const contract = new Contract(
        tokenAddr,
        window.erc20Abi,
        this.getProvider(),
      );
      return await contract.name();
    } else {
      return Promise.resolve('');
    }
  },

  getDecimals: async function (tokenAddr) {
    if (this.isConnected() && tokenAddr) {
      const contract = new Contract(
        tokenAddr,
        window.erc20Abi,
        this.getProvider(),
      );
      return await contract.decimals();
    } else {
      return Promise.reject();
    }
  },

  getSymbol: async function (tokenAddr) {
    if (this.isConnected() && tokenAddr) {
      const contract = new Contract(
        tokenAddr,
        window.erc20Abi,
        this.getProvider(),
      );
      return await contract.symbol();
    } else {
      return Promise.reject();
    }
  },

  isMetamaskSupported: function () {
    return typeof window.ethereum !== 'undefined';
  },

  _currentConnectedNetworkId: async function () {
    if (!this.isConnectedToAnyNetwork()) {
      return -1;
    } else {
      let connectedNetwork = await this.getProvider().getNetwork();
      return connectedNetwork.chainId;
    }
  },

  getConnectionStrategy: function () {
    return this._cachedStrategy;
  },

  isConnected: function (strategy) {
    var connected =
      this.isConnectedToAnyNetwork() && this.isMatchingConnectedNetwork();

    // scope to connection strategy if supplied
    if (strategy) {
      return strategy == this._cachedStrategy && connected;
    } else {
      return connected;
    }
  },

  isConnectedToAnyNetwork: function () {
    return !!this._cachedWeb3Provider;
  },

  isMatchingConnectedNetwork: function (optionalNetwork) {
    var network = TokenListManager.getCurrentNetworkConfig();
    if (optionalNetwork) {
      return +optionalNetwork.chainId === +this._cachedNetworkId;
    } else {
      return +network.chainId === +this._cachedNetworkId;
    }
  },

  currentAddress: function () {
    if (this.isConnectedToAnyNetwork()) {
      return this._cachedCurrentAddress;
    } else {
      return undefined;
    }
  },

  disconnect: function () {
    this._cachedCurrentAddress = undefined;
    this._cachedNetworkId = -1;
    this._cachedStrategy = undefined;
    this._cachedWeb3Provider = undefined;
    Sentry.configureScope((scope) => scope.setUser(null));
    EventManager.emitEvent('walletUpdated', 1);
  },

  _connectWalletHandler: function (target) {
    if (target === 'metamask') {
      this._connectProviderMetamask();
    } else if (target === 'walletConnect') {
      this._connectProviderWalletConnect();
    }
  },

  _saveConnection: async function (provider, strategy) {
    let connectedNetwork = await provider.getNetwork();
    let address = await provider.listAccounts();
    let chainId = connectedNetwork.chainId;

    this._cachedCurrentAddress = address[0];
    this._cachedNetworkId = chainId;
    this._cachedStrategy = strategy;
    this._cachedWeb3Provider = provider;

    Sentry.setUser({ id: address });

    EventManager.emitEvent('walletUpdated', 1);
  },

  _connectProviderWalletConnect: function () {
    let network = TokenListManager.getCurrentNetworkConfig();

    const provider = new WalletConnectProvider({
      rpc: {
        137: 'https://rpc-mainnet.maticvigil.com',
      },
      chainId: 137,
    });

    provider
      .enable()
      .then(
        function (v) {
          var web3Provider = new ethers.providers.Web3Provider(provider);

          return this._saveConnection(web3Provider, 'walletConnect');
        }.bind(this),
      )
      .catch(function (e) {
        console.error(e);
      });

    this.initListeners(provider);
  },

  _connectProviderMetamask: function () {
    return new Promise(
      async function (resolve, reject) {
        let network = TokenListManager.getCurrentNetworkConfig();

        const requestAccount = function () {
          _.delay(
            function () {
              window.ethereum
                .request({ method: 'eth_requestAccounts' })
                .then(
                  function (accounts) {
                    // Metamask currently only ever provide a single account
                    const account = accounts[0];

                    var web3Provider = new ethers.providers.Web3Provider(
                      window.ethereum,
                    );
                    return this._saveConnection(web3Provider, 'metamask').then(
                      function () {
                        resolve(account);
                      },
                    );
                  }.bind(this),
                )
                .catch(function (e) {
                  console.error(e);
                  reject(e);
                });
            }.bind(this),
            1000,
          );
        }.bind(this);

        try {
          await window.ethereum
            .request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: network.chain.chainId }],
            })
            .then(
              function () {
                requestAccount();
              }.bind(this),
            );
        } catch (switchError) {
          // This error code indicates that the chain has not been added to MetaMask.
          if (switchError.code === 4902) {
            window.ethereum
              .request({
                method: 'wallet_addEthereumChain',
                params: [network.chain],
              })
              .then(
                function () {
                  requestAccount();
                }.bind(this),
              )
              .catch(function (e) {
                console.error(e);
                reject(e);
              });
          } else {
            console.error(switchError);
            reject(switchError);
          }
        }
      }.bind(this),
    );
  },
};

export default window.WalletJS;
