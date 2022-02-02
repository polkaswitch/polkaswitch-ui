import _ from 'underscore';
import * as ethers from 'ethers';
import BN from 'bignumber.js';
import numeral from 'numeral';
import store from 'store';

import EventManager from './events';

const { BigNumber } = ethers;
const Utils = ethers.utils;
const { Contract } = ethers;

const DEFAULT_SWAP_SETTINGS = Object.freeze({
  gasSpeedSetting: 'safeLow',
  customGasPrice: 0,
  isCustomGasPrice: false,
  slippage: 0.5,
  // TODO this is deprecated
  bridgeOption: 'cbridge'
});

window.Storage = {
  swapSettings: _.extend({}, DEFAULT_SWAP_SETTINGS),
  selectedNetwork: false,
  crossChainEnabled: false,
  cachedTokenLogoUrls: {},

  initialize() {
    const cachedSettings = store.get('settings');
    if (_.has(cachedSettings, 'gasSpeedSetting')) {
      this.swapSettings = _.extend(this.swapSettings, _.pick(cachedSettings, _.keys(DEFAULT_SWAP_SETTINGS)));
    }

    // initialize the Network
    const defaultNetwork = _.findWhere(window.NETWORK_CONFIGS, {
      enabled: true,
      singleChainSupported: true,
    }).name;
    const storedNetwork = _.findWhere(window.NETWORK_CONFIGS, {
      name: store.get('selectedNetwork'),
      enabled: true,
    });
    this.selectedNetwork = (storedNetwork && storedNetwork.name) || defaultNetwork;
    this.crossChainEnabled = store.get('crossChainEnabled', false);
    this.cachedTokenLogoUrls = store.get('tokenLogoUrls') || {};
  },

  updateNetwork(network) {
    this.selectedNetwork = network.name;
    store.set('selectedNetwork', this.selectedNetwork);
  },

  toggleCrossChain(enabled) {
    this.crossChainEnabled = enabled;
    store.set('crossChainEnabled', this.crossChainEnabled);
  },

  isCrossChainEnabled() {
    return this.crossChainEnabled;
  },

  getNetwork() {
    return this.selectedNetwork;
  },

  resetNetworkSensitiveSettings() {
    this.swapSettings = _.extend(
      this.swapSettings,
      _.pick(DEFAULT_SWAP_SETTINGS, 'gasSpeedSetting', 'customGasPrice', 'isCustomGasPrice'),
    );
    store.set('settings', this.swapSettings);
    EventManager.emitEvent('swapSettingsUpdated', 1);
  },

  resetSettings(keys) {
    this.swapSettings = _.extend({}, DEFAULT_SWAP_SETTINGS);
    store.set('settings', this.swapSettings);
    EventManager.emitEvent('swapSettingsUpdated', 1);
  },

  updateSettings(settings) {
    this.swapSettings = _.extend(this.swapSettings, settings);
    store.set('settings', this.swapSettings);
    EventManager.emitEvent('swapSettingsUpdated', 1);
  },

  updateCachedTokenLogoUrl(contractAddress, imgSrc) {
    this.cachedTokenLogoUrls[contractAddress] = imgSrc;
    store.set('tokenLogoUrls', this.cachedTokenLogoUrls);
  },

  getCachedTokenLogoUrl(contractAddress) {
    const logoUrl = this.cachedTokenLogoUrls[contractAddress];
    if (logoUrl) {
      return logoUrl;
    }
    return null;
  },
};

export default window.Storage;
