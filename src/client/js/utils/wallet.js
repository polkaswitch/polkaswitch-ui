import _ from 'underscore';
import * as ethers from 'ethers';
import BN from 'bignumber.js';
import * as Sentry from '@sentry/react';

import WalletConnectProvider from '@walletconnect/web3-provider';
import TokenListManager from './tokenList';
import EventManager from './events';

const { BigNumber } = ethers;
const Utils = ethers.utils;
const { Contract } = ethers;

window.WalletJS = {
  _cachedWeb3Provider: undefined,
  _cachedCurrentAddress: undefined,
  _cachedNetworkId: -1,
  _cachedStrategy: undefined,

  providerConfigs: {
    walletConnect: {},
  },

  async initialize() {
    // initialize MetaMask if already connected
    if (window.ethereum) {
      this.initListeners(window.ethereum);

      if (window.ethereum.selectedAddress) {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
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

    EventManager.listenFor(
      'initiateWalletConnect',
      this._connectWalletHandler.bind(this),
    );
  },

  initListeners(provider) {
    provider.on(
      'accountsChanged',
      (accounts) => {
        // Time to reload your interface with accounts[0]!
        console.log('event - accountsChanged:', accounts);
        if (accounts.length === 0) {
          this.disconnect();
          EventManager.emitEvent('walletUpdated', 1);
        } else if (
          accounts[0] != this.currentAddress()
          && this._cachedWeb3Provider
        ) {
          this._saveConnection(this._cachedWeb3Provider, this._cachedStrategy);
        }
      },
    );

    provider.on(
      'disconnect',
      (providerRpcError) => {
        console.log('event - disconnect:', providerRpcError);
        this.disconnect();
        EventManager.emitEvent('walletUpdated', 1);
      },
    );

    provider.on(
      'chainChanged',
      (chainId) => {
        console.log('event - chainChanged:', chainId);
        // if chain changes due to manual user change, not via connect change:
        // just wipe clean, too hard to manage otherwise
        this._cachedNetworkId = chainId;
        if (!this.isMatchingConnectedNetwork()) {
          this.disconnect();
        }

        EventManager.emitEvent('walletUpdated', 1);
      },
    );
  },

  getReadOnlyProvider(chainId) {
    const network = chainId
      ? TokenListManager.getNetworkById(chainId)
      : TokenListManager.getCurrentNetworkConfig();
    const provider = new ethers.providers.JsonRpcProvider(network.nodeProviders[0]);
    return provider;
  },

  getProvider(strictCheck) {
    const condition = strictCheck
      ? this.isConnected()
      : this.isConnectedToAnyNetwork();

    if (condition) {
      return this._cachedWeb3Provider;
    }
    return this.getReadOnlyProvider();
  },

  getBalance(token, optionalNetwork) {
    // if network specified, as long as we connected to any network is fine,
    // if it's not provided, we need to be on the right network to get the right balance
    if ((!!optionalNetwork && this.isConnectedToAnyNetwork()) || this.isConnected()) {
      if (token.native) {
        return this.getDefaultBalance(optionalNetwork);
      } if (token.address) {
        return this.getERC20Balance(token.address, optionalNetwork);
      }
    } else {
      return Promise.resolve(BigNumber.from(0));
    }
  },

  getDefaultBalance(optionalNetwork) {
    if (optionalNetwork) {
      const provider = new ethers.providers.StaticJsonRpcProvider(optionalNetwork.nodeProviders[0]);
      return provider.getBalance(this.currentAddress());
    }
    return this.getProvider().getBalance(this.currentAddress());
  },

  async getERC20Balance(tokenContractAddress, optionalNetwork) {
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

  async getName(tokenAddr) {
    if (this.isConnected() && tokenAddr) {
      const contract = new Contract(
        tokenAddr,
        window.erc20Abi,
        this.getProvider(),
      );
      return await contract.name();
    }
    return Promise.resolve('');
  },

  async getDecimals(tokenAddr) {
    if (this.isConnected() && tokenAddr) {
      const contract = new Contract(
        tokenAddr,
        window.erc20Abi,
        this.getProvider(),
      );
      return await contract.decimals();
    }
    return Promise.reject();
  },

  async getSymbol(tokenAddr) {
    if (this.isConnected() && tokenAddr) {
      const contract = new Contract(
        tokenAddr,
        window.erc20Abi,
        this.getProvider(),
      );
      return await contract.symbol();
    }
    return Promise.reject();
  },

  isMetamaskSupported() {
    return typeof window.ethereum !== 'undefined';
  },

  async _currentConnectedNetworkId() {
    if (!this.isConnectedToAnyNetwork()) {
      return -1;
    }
    const connectedNetwork = await this.getProvider().getNetwork();
    return connectedNetwork.chainId;
  },

  getConnectionStrategy() {
    return this._cachedStrategy;
  },

  isConnected(strategy) {
    const connected = this.isConnectedToAnyNetwork() && this.isMatchingConnectedNetwork();

    // scope to connection strategy if supplied
    if (strategy) {
      return strategy == this._cachedStrategy && connected;
    }
    return connected;
  },

  isConnectedToAnyNetwork() {
    return !!this._cachedWeb3Provider;
  },

  isMatchingConnectedNetwork(optionalNetwork) {
    const network = TokenListManager.getCurrentNetworkConfig();
    if (optionalNetwork) {
      return +optionalNetwork.chainId === +this._cachedNetworkId;
    }
    return +network.chainId === +this._cachedNetworkId;
  },

  currentAddress() {
    if (this.isConnectedToAnyNetwork()) {
      return this._cachedCurrentAddress;
    }
    return undefined;
  },

  disconnect() {
    this._cachedCurrentAddress = undefined;
    this._cachedNetworkId = -1;
    this._cachedStrategy = undefined;
    this._cachedWeb3Provider = undefined;
    Sentry.configureScope((scope) => scope.setUser(null));
    EventManager.emitEvent('walletUpdated', 1);
  },

  _connectWalletHandler(target) {
    if (target === 'metamask') {
      this._connectProviderMetamask();
    } else if (target === 'walletConnect') {
      this._connectProviderWalletConnect();
    }
  },

  async _saveConnection(provider, strategy) {
    const connectedNetwork = await provider.getNetwork();
    const address = await provider.listAccounts();
    const { chainId } = connectedNetwork;

    this._cachedCurrentAddress = address[0];
    this._cachedNetworkId = chainId;
    this._cachedStrategy = strategy;
    this._cachedWeb3Provider = provider;

    Sentry.setUser({ id: address });

    EventManager.emitEvent('walletUpdated', 1);
  },

  _connectProviderWalletConnect() {
    const network = TokenListManager.getCurrentNetworkConfig();

    const provider = new WalletConnectProvider({
      rpc: {
        137: 'https://rpc-mainnet.maticvigil.com',
      },
      chainId: 137,
    });

    provider
      .enable()
      .then(
        (v) => {
          const web3Provider = new ethers.providers.Web3Provider(provider);

          return this._saveConnection(web3Provider, 'walletConnect');
        },
      )
      .catch((e) => {
        console.error(e);
      });

    this.initListeners(provider);
  },

  _connectProviderMetamask() {
    return new Promise(
      (async (resolve, reject) => {
        const network = TokenListManager.getCurrentNetworkConfig();

        const requestAccount = function () {
          _.delay(
            () => {
              window.ethereum
                .request({ method: 'eth_requestAccounts' })
                .then(
                  (accounts) => {
                    // Metamask currently only ever provide a single account
                    const account = accounts[0];

                    const web3Provider = new ethers.providers.Web3Provider(
                      window.ethereum,
                    );
                    return this._saveConnection(web3Provider, 'metamask').then(
                      () => {
                        resolve(account);
                      },
                    );
                  },
                )
                .catch((e) => {
                  console.error(e);
                  reject(e);
                });
            },
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
              () => {
                requestAccount();
              },
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
                () => {
                  requestAccount();
                },
              )
              .catch((e) => {
                console.error(e);
                reject(e);
              });
          } else {
            console.error(switchError);
            reject(switchError);
          }
        }
      }),
    );
  },
};

export default window.WalletJS;
