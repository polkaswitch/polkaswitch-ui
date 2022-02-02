import _ from 'underscore';
import * as ethers from 'ethers';
import BN from 'bignumber.js';
import { BigNumber, constants, providers, Signer, utils } from 'ethers';
import { Hop, Chain } from '@hop-protocol/sdk';
import EventManager from './events';
import Wallet from './wallet';
import TokenListManager from './tokenList';
import Storage from './storage';
import swapFn from './swapFn';
import { ApprovalState } from '../constants/Status';

// never exponent
BN.config({ EXPONENTIAL_AT: 1e9 });

window.HopUtils = {
  sdk: false,

  activeTxs: [],
  historicalTxs: [],

  _storeKey: () => `hop_${Wallet.currentAddress()}`,

  async initalize() {
    EventManager.listenFor('walletUpdated', this.resetSdk.bind(this));

    if (Wallet.isConnected()) {
      this.sdk = await this.initalizeSdk();
    }
  },

  isSdkInitalized() {
    return !!this._sdk;
  },

  async initalizeSdk() {
    const signer = Wallet.getProvider().getSigner();

    const sdk = (this._sdk = new Hop('mainnet').connect(signer));

    sdk.setChainProviders({
      ethereum: new providers.StaticJsonRpcProvider('https://mainnet.infura.io/v3/84842078b09946638c03157f83405213'),
      polygon: new providers.StaticJsonRpcProvider('https://polygon-rpc.com'),
      xdai: new providers.StaticJsonRpcProvider('https://rpc.xdaichain.com'),
      optimism: new providers.StaticJsonRpcProvider('https://mainnet.optimism.io'),
      arbitrum: new providers.StaticJsonRpcProvider('https://arb1.arbitrum.io/rpc'),
    });

    this.attachSdkListeners(sdk);
    return sdk;
  },

  resetSdk() {
    console.log('Nxtp SDK reset');

    if (this._sdk) {
      // detach all listeners
      // TODO
      // this.sdk.removeAllListeners();
      // this.sdk.detach();
    }

    this.sdk = false;
    this.activeTxs = [];
    this.historicalTxs = [];
  },

  _attachSdkListeners(_sdk) {
    if (!_sdk) {
    }
  },

  isSupportedAsset(sendingAssetId) {
    return true;
  },

  async isSupportedNetwork(network) {
    if (!this._sdk) {
      this._sdk = await this.initalizeSdk();
    }

    return _.contains(this.sdk.supportedChains, network.name.toLowerCase());
  },

  async getEstimate(
    transactionId,
    sendingChainId,
    sendingAssetId,
    receivingChainId,
    receivingAssetId,
    amountBN,
    receivingAddress,
  ) {
    if (!Wallet.isConnected()) {
      console.error('Hop: Wallet not connected');
      return false;
    }

    if (!this.sdk) {
      this.sdk = await this.initalizeSdk();
    }

    const sendingChain = TokenListManager.getNetworkById(sendingChainId);
    const receivingChain = TokenListManager.getNetworkById(receivingChainId);
    const sendingAsset = TokenListManager.findTokenById(sendingAssetId);
    const bridgeAsset = TokenListManager.findTokenById(
      sendingAsset.symbol,
      receivingChain,
    );

    const hopSendingChain = new Chain(
      sendingChain.name,
      sendingChain.chainId,
      sendingChain.nodeProviders[0],
    );
    const hopReceivingChain = new Chain(
      receivingChain.name,
      receivingChain.chainId,
      receivingChain.nodeProviders[0],
    );
    const hopBridge = this._sdk.bridge(sendingAsset.symbol);

    const amountOut = await hopBridge.getAmountOut(
      amountBN.toString(),
      hopSendingChain,
      hopReceivingChain,
    );
    const bonderFee = await hopBridge.getTotalFee(
      amountBN.toString(),
      hopSendingChain,
      hopReceivingChain,
    );

    console.log(amountOut, bonderFee);

    return {
      id: transactionId,
      transactionFee: bonderFee,
      returnAmount: amountOut,
    };
  },

  async transferStepOne(
    transactionId,
    sendingChainId,
    sendingAssetId,
    receivingChainId,
    receivingAssetId,
    amountBN,
    receivingAddress,
    maxSlippage,
  ) {
    if (!Wallet.isConnected()) {
      console.error('Hop: Wallet not connected');
      return false;
    }

    if (!this.sdk) {
      this.sdk = await this.initalizeSdk();
    }

    const sendingChain = TokenListManager.getNetworkById(sendingChainId);
    const receivingChain = TokenListManager.getNetworkById(receivingChainId);
    const sendingAsset = TokenListManager.findTokenById(sendingAssetId);
    const bridgeAsset = TokenListManager.findTokenById(
      sendingAsset.symbol,
      receivingChain,
    );

    const hopSendingChain = new Chain(
      sendingChain.name,
      sendingChain.chainId,
      sendingChain.nodeProviders[0],
    );
    const hopReceivingChain = new Chain(
      receivingChain.name,
      receivingChain.chainId,
      receivingChain.nodeProviders[0],
    );

    const hopBridge = this._sdk.bridge(sendingAsset.symbol);

    const approvalAddress = await hopBridge.getSendApprovalAddress(
      hopSendingChain,
      hopReceivingChain,
    );
    const token = hopBridge.getCanonicalToken(hopSendingChain);
    const amountToApprove = constants.MaxUint256;
    const approveTx = await token.approve(approvalAddress, amountToApprove);

    console.log('Hop Approved TX: ', approveTx);

    const tx = await hopBridge.send(amountBN.toString(), hopSendingChain, hopReceivingChain);

    console.log('Started Hop TX: ', tx.hash);

    this.sdk.watch(tx.hash, sendingAsset.symbol, hopSendingChain, hopReceivingChain).on('receipt', (data) => {
      const { receipt, chain } = data;
      console.log(receipt, chain);
    });

    return {
      transactionHash: tx.hash,
    };
  },

  getAllActiveTxs() {
    return this._activeTxs.map((x) => x);
  },

  getAllHistoricalTxs() {
    return this._historicalTxs.map((x) => x);
  },
};

export default window.HopUtils;
