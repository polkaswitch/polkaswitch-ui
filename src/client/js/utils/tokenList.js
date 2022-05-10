import _ from 'underscore';
import EventManager from './events';
import * as ethers from 'ethers';
import Storage from './storage';
import {SOLANA_CHAIN_ID, isSolananAddress} from './solanaWallet';

let store = require('store');
const Utils = ethers.utils;

window.TokenListManager = {
  _tokenLists: {},
  initialize: async function () {},

  initializeTokenLists: function() {
    // pre-load all token lists
    var filteredNetworks = _.filter(window.NETWORK_CONFIGS, (v) => {
      return v.enabled;
    });

    return Promise.all(filteredNetworks.map((network) => {
      return fetch(network.tokenList).then((response) => {
        return response.json();
      }).then((tokenList) => {
        tokenList = _.map(
          _.filter(tokenList, function (v) {
            return (v.chainId != SOLANA_CHAIN_ID && (v.native || (v.symbol && Utils.isAddress(v.address)))) || 
                  (v.chainId == SOLANA_CHAIN_ID && isSolananAddress(v.address));
          }),
          function (v) {
            if (v.address && v.chainId != SOLANA_CHAIN_ID)
              v.address = Utils.getAddress(v.address);

            return v;
          },
        );

        this._tokenLists[+network.chainId] = tokenList;
        this.updateTokenListwithCustom(network);

        return tokenList;
      });
    }));
  },

  getCurrentNetworkConfig: function () {
    var network = _.findWhere(window.NETWORK_CONFIGS, {
      name: Storage.getNetwork(),
    });
    return network;
  },

  getNetworkById: function (chainId) {
    var network = _.findWhere(window.NETWORK_CONFIGS, {
      chainId: '' + chainId,
    });
    return network;
  },

  getNetworkByName: function (name) {
    var network = _.findWhere(window.NETWORK_CONFIGS, { name });
    return network;
  },

  updateNetwork: function (network, connectStrategy) {
    EventManager.emitEvent('networkPendingUpdate', 1);
    Storage.updateNetwork(network);

    this.updateTokenList().then(function () {
      // reset default settings because gas values are updated per network
      Storage.resetNetworkSensitiveSettings();

      EventManager.emitEvent('networkUpdated', 1);
      EventManager.emitEvent('walletUpdated', 1);
      if (connectStrategy) {
        EventManager.emitEvent('initiateWalletConnect', connectStrategy);
      }
    });
  },

  updateTokenList: async function () {
    var network = this.getCurrentNetworkConfig();
    var tokenList = this.getTokenListForNetwork(network);
    var gasStats;

    if (network.gasApi) {
      gasStats = await (await fetch(network.gasApi)).json();
    } else {
      const provider = new ethers.providers.JsonRpcProvider(network.nodeProviders[0]);
      let defaultGasPrice = Math.ceil(Utils.formatUnits((await provider.getGasPrice()), "gwei"));

      gasStats = { safeLow: defaultGasPrice, fast: defaultGasPrice, fastest: defaultGasPrice };
    }

    // xDai GasAPI has different fields
    if (+network.chainId === 100) {
      gasStats.fastest = gasStats.fast;
      gasStats.safeLow = gasStats.slow;
      gasStats.fast = gasStats.average;
    } else if (+network.chainId === 56) {
      // Binance Smart Chain GasAPI has different fields
      if (!_.has(gasStats, 'safeLow')) {
        gasStats.safeLow = gasStats.standard;
        gasStats.fastest = gasStats.fast;
      }
    }

    window.GAS_STATS = _.mapObject(
      _.pick(gasStats, ['fast', 'fastest', 'safeLow']),
      function (v, k) {
        return Math.ceil(v * 1.1);
      },
    );

    window.TOKEN_LIST = tokenList;
    window.NATIVE_TOKEN = _.findWhere(tokenList, { native: true });
  },

  findTokenById: function (tid, optionalNetwork) {
    if (!tid?.toLowerCase) {
      console.log('WARN: TokenListManager: Provided Token ID is blank');
      return undefined;
    }

    let tokenList = window.TOKEN_LIST;
    if (optionalNetwork) {
      tokenList = this.getTokenListForNetwork(optionalNetwork);
    }

    const foundToken = _.find(tokenList, function (v) {
      if (!v.address?.toLowerCase || !v.symbol?.toLowerCase) {
        return false;
      }

      return (
        v.address?.toLowerCase() === tid.toLowerCase() ||
        v.symbol?.toLowerCase() === tid.toLowerCase()
      );
    });

    if (!foundToken) {
      console.log(
        'WARN: TokenListManager: Token ID Not Found:',
        tid,
        optionalNetwork?.name,
      );
    }
    return foundToken;
  },

  findTokenBySymbolFromCoinGecko: async function (symbol) {
    if (!window.COINGECKO_TOKEN_LIST) {
      window.COINGECKO_TOKEN_LIST = [{ temp: true }];
      window.COINGECKO_TOKEN_LIST = await (
        await fetch('/tokens/coingecko.list.json')
      ).json();
    }

    return _.find(window.COINGECKO_TOKEN_LIST, function (v) {
      return v.symbol?.toLowerCase() === symbol;
    });
  },

  updateTokenListwithCustom: function (network) {
    const customTokenAddresses = store.get('customTokenAddress');

    if (customTokenAddresses) {
      const addresses = customTokenAddresses[network.chainId] || [];
      if (addresses.length > 0) {
        if (this._tokenLists[network.chainId]) {
          this._tokenLists[network.chainId] = this._tokenLists[
            network.chainId
          ].concat(customTokenAddresses[network.chainId]);
        }
      }
    }
  },

  addCustomToken: function (token) {
    const network = this.getCurrentNetworkConfig();
    const chainId = network.chainId;
    let customToken = token;

    if (chainId > 0) {
      customToken.chainId = Number(chainId);
      customToken.address = Utils.getAddress(customToken.address);
      const customTokenAddresses = store.get('customTokenAddress') || {};
      let addresses = [];

      if (
        !_.isEmpty(customTokenAddresses) &&
        !_.isUndefined(customTokenAddresses[chainId])
      ) {
        addresses = customTokenAddresses[chainId];
      }

      addresses.push(customToken);
      store.set('customTokenAddress', { [chainId]: addresses });
      this.updateTokenListwithCustom(network);
    }
  },

  getTokenListForNetwork: function (network) {
    return this._tokenLists[+network.chainId];
  },
};

export default window.TokenListManager;
