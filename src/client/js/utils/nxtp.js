import _ from 'underscore';
import * as ethers from 'ethers';
import BN from 'bignumber.js';
import { BigNumber, constants, Signer, utils } from 'ethers';
import { ActiveTransaction, NxtpSdk, NxtpSdkEvents, HistoricalTransaction } from '@connext/nxtp-sdk';
import {
  AuctionResponse,
  ChainData,
  CrosschainTransaction,
  getRandomBytes32,
  getChainData,
  Logger,
  TransactionPreparedEvent,
} from '@connext/nxtp-utils';
import EventManager from './events';
import Wallet from './wallet';

import swapFn from './swapFn';

// never exponent
BN.config({ EXPONENTIAL_AT: 1e9 });

const store = require('store');

window.NxtpUtils = {
  _queue: {},
  _sdk: false,

  _activeTxs: [],
  _historicalTxs: [],

  _storeKey: () => `connext_${Wallet.currentAddress()}`,

  _sdkConfig: false,
  _connextChainData: false,

  async initalize() {
    this._connextChainData = await getChainData();
    this._prepSdkConfig();

    EventManager.listenFor('walletUpdated', this.resetSdk.bind(this));

    if (Wallet.isConnected()) {
      this._sdk = await this.initalizeSdk();
    }
  },

  _prepSdkConfig() {
    this._sdkConfig = {};

    window.NETWORK_CONFIGS.forEach((e) => {
      if (e.enabled && e.crossChainSupported) {
        const connextData = this._connextChainData.get(e.chainId);

        this._sdkConfig[e.chainId] = {
          providers: e.nodeProviders,
          subgraph: connextData?.subgraph,
        };
      }
    });
  },

  isSdkInitalized() {
    return !!this._sdk;
  },

  async initalizeSdk() {
    const signer = Wallet.getProvider().getSigner();

    const sdk = (this._sdk = new NxtpSdk({
      chainConfig: this._sdkConfig,
      signer,
      logger: new Logger({ name: 'NxtpSdk', level: 'info' }),
      network: process.env.REACT_APP_NETWORK || 'mainnet',
      skipPolling: true
    }));

    return sdk;
  },

  resetSdk() {
    console.log('Nxtp SDK reset');

    if (this._sdk) {
      // detach all listeners
      this._sdk.removeAllListeners();
      this._sdk.detach();
    }

    this._sdk = false;
    this._queue = {};
    this._activeTxs = [];
    this._historicalTxs = [];
  },

  async fetchActiveTxs() {
    if (!this._sdk) {
      return;
    }
    this._activeTxs = await this._sdk.getActiveTransactions();
    console.log('activeTxs: ', this._activeTxs);
  },

  async fetchHistoricalTxs() {
    if (!this._sdk) {
      return;
    }
    this._historicalTxs = await this._sdk.getHistoricalTransactions();
    console.log('historicalTxs: ', this._historicalTxs);
  },

  getHistoricalTx(transactionId) {
    const tx = this._queue[transactionId];

    const nxtpInternalTxID = tx?.bridge?.quote?.data?.bid?.transactionId;

    return this._historicalTxs.find((t) => t.crosschainTx.invariant.transactionId === nxtpInternalTxID);
  },

  isActiveTxFinishable(transactionId) {
    const tx = this._queue[transactionId];

    const nxtpInternalTx = this.getActiveTx(tx?.bridge?.quote?.data?.bid?.transactionId);

    if (!tx) {
      return false;
    }

    return nxtpInternalTx.status === NxtpSdkEvents.ReceiverTransactionPrepared;
  },

  isActiveTxFinished(transactionId) {
    const tx = this._queue[transactionId];

    return !!tx;
  },

  getActiveTx(transactionId) {
    return this._activeTxs.find((t) => t.crosschainTx.invariant.transactionId === transactionId);
  },

  updateActiveTx(transactionId, status, event, crosschainTx) {
    let updated = false;
    this._activeTxs = this._activeTxs.map((item) => {
      if (item.crosschainTx.invariant.transactionId === transactionId) {
        if (crosschainTx) {
          item.crosschainTx = {
            ...item.crosschainTx,
            ...crosschainTx,
          };
        }
        item.status = status;
        if (event) {
          item.event = event;
        }
        updated = true;
      }
      return item;
    });

    if (!updated && crosschainTx) {
      this._activeTxs.push({ crosschainTx, status, event });
    }
  },

  removeActiveTx(transactionId) {
    this._activeTxs = this._activeTxs.filter((t) => t.crosschainTx.invariant.transactionId !== transactionId);
  },

  async transferStepOne(tx, transactionId) {
    const transferQuote = tx.bridge?.quote?.data;

    this._queue[transactionId] = tx;

    if (!transferQuote) {
      throw new Error('Please request quote first');
    }

    if (!Wallet.isConnected()) {
      // if (injectedProviderChainId !== auctionResponse.bid.sendingChainId) {
      return false;
    }

    const transfer = await this._sdk.prepareTransfer(transferQuote, true);
    console.log('transfer: ', transfer);
    // WAIT on Events at this point

    return true;
  },

  async transferStepTwo(transactionId) {
    const tx = this._queue[transactionId];

    const txId = tx?.bridge?.quote?.data?.bid?.transactionId || transactionId;

    const nxtpInternalTx = this.getActiveTx(txId);

    const { bidSignature, encodedBid, encryptedCallData } = nxtpInternalTx;
    const { receiving, sending, invariant } = nxtpInternalTx.crosschainTx;
    const variant = receiving ?? sending;
    const sendingTxData = {
      ...invariant,
      ...sending,
    };

    const receivingTxData =
      typeof receiving === 'object'
        ? {
            ...invariant,
            ...receiving,
          }
        : undefined;

    const finish = await this._sdk.fulfillTransfer({
      bidSignature,
      encodedBid,
      encryptedCallData,
      txData: receivingTxData,
    });

    console.log('finished ->: ', finish);

    if (finish) {
      this.removeActiveTx(receivingTxData.transactionId);
      await this.fetchActiveTxs();
    }

    return true;
  },

  async getAllActiveTxs() {
    await this.fetchActiveTxs();
    return this._activeTxs;
  },

  getAllHistoricalTxs() {
    return this._historicalTxs;
  },
};

export default window.NxtpUtils;
