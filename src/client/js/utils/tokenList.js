
import _ from "underscore";
import EventManager from './events';
import * as ethers from 'ethers';
import Storage from './storage';

let store = require('store');
const Utils = ethers.utils;

window.TokenListManager = {
  swap: {
    from:{},
    to:{},
    network: 'Ethereum'
  },
  _tokenLists: {},
  initialize: async function() {
    // pre-load all token lists
    var filteredNetworks = _.filter(window.NETWORK_CONFIGS, (v) => { return v.enabled });

    for (var network of filteredNetworks) {
      var tokenList = await (await fetch(network.tokenList)).json();

      tokenList = _.map(_.filter(tokenList, function(v) {
        return (v.native) || (v.symbol && Utils.isAddress(v.address));
      }), function(v) {
        if (v.address) {
          v.address = Utils.getAddress(v.address);
        }
        return v;
      });

      this._tokenLists[+network.chainId] = tokenList;
    };
  },

  getCurrentNetworkConfig: function() {
    var network = _.findWhere(window.NETWORK_CONFIGS, { name: Storage.getNetwork() });
    return network;
  },

  getNetworkById: function(chainId) {
    var network = _.findWhere(window.NETWORK_CONFIGS, { chainId: ("" + chainId) });
    return network;
  },

  updateNetwork: function(network, connectStrategy) {
    EventManager.emitEvent('networkPendingUpdate', 1);
    Storage.updateNetwork(network);

    this.updateTokenList().then(function() {
      // reset default settings because gas values are updated per network
      Storage.clearSettings();

      EventManager.emitEvent('networkUpdated', 1);
      EventManager.emitEvent('walletUpdated', 1);
      if (connectStrategy) {
        EventManager.emitEvent('initiateWalletConnect', connectStrategy);
      }
    });
  },

  isCrossChainEnabled: function() {
    return Storage.isCrossChainEnabled();
  },

  toggleCrossChain: function(enabled) {
    Storage.toggleCrossChain(enabled);
    EventManager.emitEvent('networkUpdated', 1);
  },

  updateTokenList: async function() {
    var network = this.getCurrentNetworkConfig();
    var tokenList = this.getTokenListForNetwork(network);
    var gasStats;

    if (network.gasApi) {
      gasStats = await(await fetch(network.gasApi)).json();
    } else {
      const provider = new ethers.providers.JsonRpcProvider(network.nodeProvider);
      let defaultGasPrice = Math.ceil(Utils.formatUnits((await provider.getGasPrice()), "gwei"));

      gasStats = { safeLow: defaultGasPrice, fast: defaultGasPrice, fastest: defaultGasPrice };
    }

    // Binance Smart Chain GasAPI has different fields
    if (!_.has(gasStats, 'safeLow')) {
      gasStats.safeLow = gasStats.standard;
      gasStats.fastest = gasStats.fast;
    }

    window.GAS_STATS = _.mapObject(_.pick(gasStats, [
      'fast', 'fastest', 'safeLow'
    ]), function(v, k) {
      return Math.ceil(v * 1.10);
    });

    window.TOKEN_LIST = tokenList;
    this.updateTokenListwithCustom(network);
    window.NATIVE_TOKEN = _.findWhere(tokenList, { native: true });
    // update swap token configuration
    const swap = {
      from: this.findTokenById(network.defaultPair.from),
      to: this.findTokenById(network.defaultPair.to),
      network: network.name
    }
    this.updateSwapConfig(swap);
  },

  updateSwapConfig: function(swap) {
    this.swap = _.extend(this.getSwapConfig(), swap);
    store.set('swap', this.swap);
    EventManager.emitEvent('swapConfigUpdated', 1);
  },

  getSwapConfig: function () {
    return this.swap;
  },

  findTokenById: function(tid, optionalNetwork) {
    var tokenList = window.TOKEN_LIST;

    if (optionalNetwork) {
      tokenList = this.getTokenListForNetwork(optionalNetwork);
    }

    var foundToken = _.find(tokenList, function(v) {
      return v.address === tid || v.symbol === tid;
    });
    if (!foundToken) {
      console.log("WARN: TokenListManager: Token ID Not Found:", tid, optionalNetwork?.name);
    }
    return foundToken;
  },

  findTokenBySymbolFromCoinGecko: function(symbol) {
    return _.find(window.COINGECKO_TOKEN_LIST, function(v) {
      return v.symbol.toLowerCase() === symbol;
    });
  },

  updateTokenListwithCustom: function (network) {
    const customTokenAddresses = store.get('customTokenAddress');

    if (customTokenAddresses) {
      const addresses = customTokenAddresses[network.chainId] || [];
      if (addresses.length > 0) {
        window.TOKEN_LIST = window.TOKEN_LIST.concat(customTokenAddresses[network.chainId]);
      }
    }
  },

  addCustomToken: function(token) {
    const  network = this.getCurrentNetworkConfig();
    const chainId = network.chainId;
    let customToken = token;

    if (chainId > 0) {
      customToken.chainId = Number(chainId);
      customToken.address = Utils.getAddress(customToken.address);
      const customTokenAddresses = store.get('customTokenAddress') || {};
      let addresses = [];

      if (!_.isEmpty(customTokenAddresses) && (!_.isUndefined(customTokenAddresses[chainId]))) {
        addresses = customTokenAddresses[chainId];
      }

      addresses.push(customToken);
      store.set('customTokenAddress', {[chainId]: addresses});
      this.updateTokenListwithCustom(network);
    }
  },

  getTokenListForNetwork: function(network) {
    return this._tokenLists[+network.chainId];
  }

};

export default window.TokenListManager;

