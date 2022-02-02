import _ from 'underscore';
import store from 'store';
import BN from 'bignumber.js';
import { BigNumber, constants, providers, Signer, utils } from 'ethers';

import { getRandomBytes32 } from '@connext/nxtp-utils';
import Wallet from './wallet';
import swapFn from './swapFn';
import HopUtils from './hop';
import Nxtp from './nxtp';
import Storage from './storage';

// hard-code for now. I could not find this easily as a function in HopSDK
const HOP_SUPPORTED_BRIDGE_TOKENS = [
  'USDC',
  'USDT',
  'DAI',
  // TODO This is list is longer and is dynamically available per network pair.
  // Let's keep it simple for now
  // ... "MATIC", "ETH", "WBTC"
];

// hard-code for now, the HopSDK has "supportedChains", but let's integrate later.
const HOP_SUPPORTED_CHAINS = [1, 137, 100, 10, 42161];

const CONNEXT_SUPPORTED_BRIDGE_TOKENS = [
  'USDC',
  'USDT',
  'DAI',
  // TODO This is list is longer and is dynamically available per network pair.
  // Let's keep it simple for now
  // ... "MATIC", "ETH", "WBTC", "BNB"
];

const CONNEXT_SUPPORTED_CHAINS = [1, 56, 137, 100, 250, 42161, 43114];

export default {
  _signerAddress: '',
  _queue: {},

  async initialize() {},

  getBridgeInterface(nonce) {
    const tx = this.getTx(nonce);
    let { bridgeOption } = Storage.swapSettings;

    if (tx?.bridge) {
      bridgeOption = tx.bridge;
    }

    if (bridgeOption === 'hop') {
      return HopUtils;
    }
    return Nxtp;
  },

  isSupported(to, toChain, from, fromChain) {
    const { bridgeOption } = Storage.swapSettings;

    const targetChainIds = [+toChain.chainId, +fromChain.chainId];

    if (bridgeOption === 'hop') {
      if (!HOP_SUPPORTED_CHAINS.includes(+toChain.chainId)) {
        return [false, `${toChain.name} is not supported by Hop Bridge`];
      }
      if (!HOP_SUPPORTED_CHAINS.includes(+fromChain.chainId)) {
        return [false, `${fromChain.name} is not supported by Hop Bridge`];
      }
      return [true, false];
    }
    if (!CONNEXT_SUPPORTED_CHAINS.includes(+toChain.chainId)) {
      return [false, `${toChain.name} is not supported by Connext Bridge`];
    }
    if (!CONNEXT_SUPPORTED_CHAINS.includes(+fromChain.chainId)) {
      return [false, `${fromChain.name} is not supported by Connext Bridge`];
    }
    return [true, false];
  },

  supportedBridges(to, toChain, from, fromChain) {
    const bridges = [];
    const targetChainIds = [+toChain.chainId, +fromChain.chainId];

    if (_.includes(CONNEXT_SUPPORTED_CHAINS, targetChainIds)) {
    }
  },

  getEstimate(sendingChainId, sendingAssetId, receivingChainId, receivingAssetId, amountBN, receivingAddress) {
    const transactionId = getRandomBytes32();
    const bridgeInterface = this.getBridgeInterface();

    this._queue[transactionId] = {
      bridge: Storage.swapSettings.bridgeOption,
      sendingChainId,
      sendingAssetId,
      receivingChainId,
      receivingAssetId,
      amountBN,
      receivingAddress,
    };

    return this.getBridgeInterface().getEstimate(
      transactionId,
      sendingChainId,
      sendingAssetId,
      receivingChainId,
      receivingAssetId,
      amountBN,
      receivingAddress,
    );
  },

  transferStepOne(transactionId) {
    const bridgeInterface = this.getBridgeInterface(transactionId);
    const tx = this.getTx(transactionId);
    return bridgeInterface.transferStepOne(
      transactionId,
      tx.sendingChainId,
      tx.sendingAssetId,
      tx.receivingChainId,
      tx.receivingAssetId,
      tx.amountBN,
      tx.receivingAddress,
    );
  },

  transferStepTwo(transactionId) {
    const bridgeInterface = this.getBridgeInterface(transactionId);
    const tx = this.getTx(transactionId);
    return bridgeInterface.transferStepTwo(
      transactionId,
      tx.sendingChainId,
      tx.sendingAssetId,
      tx.receivingChainId,
      tx.receivingAssetId,
      tx.amountBN,
      tx.receivingAddress,
    );
  },

  twoStepTransferRequired(nonce) {
    const tx = this.getTx(nonce);
    if (!tx) {
      return false;
    }

    return tx.bridge === 'connext';
  },

  getTx(nonce) {
    return this._queue[nonce];
  },
};
