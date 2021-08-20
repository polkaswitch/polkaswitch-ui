
import _ from "underscore";
import EventManager from './events';
import * as ethers from 'ethers';
let store = require('store');
const Utils = ethers.utils;

window.TokenListManager = {
  initialize: async function() {
  },

  getCurrentNetworkConfig: function() {
    var network = _.findWhere(window.NETWORK_CONFIGS, { name: window.SELECTED_NETWORK });
    return network;
  },

  getNetworkById: function(chainId) {
    var network = _.findWhere(window.NETWORK_CONFIGS, { chainId: ("" + chainId) });
    return network;
  },

  updateNetwork: function(network, connectStrategy) {
    EventManager.emitEvent('networkPendingUpdate', 1);

    window.SELECTED_NETWORK = network.name;

    this.updateTokenList().then(function() {
      EventManager.emitEvent('networkUpdated', 1);
      EventManager.emitEvent('walletUpdated', 1);
      if (connectStrategy) {
        EventManager.emitEvent('initiateWalletConnect', connectStrategy);
      }
    });
  },

  updateTokenList: async function() {
    var network = this.getCurrentNetworkConfig();
    var tokenList = await(await fetch(network.tokenList)).json();
    var gasStats = await(await fetch(network.gasApi)).json();

    tokenList = _.map(_.filter(tokenList, function(v) {
      return (v.native) || (v.symbol && Utils.isAddress(v.address));
    }), function(v) {
      if (v.address) {
        v.address = Utils.getAddress(v.address);
      }
      return v;
    });

    // Binance Smart Chain GasAPI has different fields
    if (!gasStats.safeLow) {
      gasStats.safeLow = gasStats.standard;
      gasStats.fastest = gasStats.fast;
    }

    window.GAS_STATS = _.mapObject(_.pick(gasStats, [
      'fast', 'fastest', 'safeLow'
    ]), function(v, k) {
      return v + 1;
    });

    window.TOKEN_LIST = tokenList;
    this.updateTokenListwithCustom(network);
    window.NATIVE_TOKEN = _.findWhere(tokenList, { native: true });
  },

  findTokenById: function(tid) {
    var foundToken = _.find(window.TOKEN_LIST, function(v) {
      return v.address === tid || v.symbol === tid;
    });
    if (!foundToken) {
      console.log("WARNING: Unable to find token ID", tid);
    }
    return foundToken;
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
  }

};

export default window.TokenListManager;

