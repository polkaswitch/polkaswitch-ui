import _ from "underscore";
import EventManager from './events';
import Wallet from "./wallet";

let store = require('store');

export default {
  _signerAddress: '',
  _queue: {},
  compareTime: 3 * 60 * 60 * 24 * 1000,

  initialize: async function() {
    this._queue = this.getQueue();
    const keys = _.keys(this._queue);
    const length = keys.length;
    const now = Date.now();
    let delCount = 0;

    if (this._signerAddress && (this._signerAddress.length > 0)) {
      if (length > 0) {
        for (let i = 0; i < length; i++) {
          const item = this._queue[keys[i]];

          if (item["completed"] === false) {
            const provider = Wallet.getReadOnlyProvider();
            const hash = item.tx.hash;
            await this.getTransactionReceipt(provider, hash);
          } else if (item["completed"] === true && ((now - item.lastUpdated) > this.compareTime)) {
            delete this._queue[keys[i]];
            delCount ++;
          }
        }
        if (delCount > 0) {
          store.set(this._signerAddress, this._queue);
        }
      }
    }
  },

  removeOldTx: function() {
    this._queue = this.getQueue();
    const keys = _.keys(this._queue);
    const length = keys.length;
    const now = Date.now();
    let delCount = 0;
    if (this._signerAddress && (this._signerAddress.length > 0)) {
      if (length > 0) {
        for (let i = 0; i < length; i++) {
          const item = this._queue[keys[i]];
          if (item["completed"] === true && ((now - item.lastUpdated) > this.compareTime)) {
            delete this._queue[keys[i]];
            delCount ++;
          }
        }
        if (delCount > 0) {
          store.set(this._signerAddress, this._queue);
        }
      }
    }
  },

  getTransactionReceipt: async function(provider, hash) {
    if (provider) {
      try {
        let receipt = await provider.getTransactionReceipt(hash);
        if (receipt && receipt.confirmations > 3 && receipt.status === 1) {
          this.successTx(hash, receipt, null);
        } else if (receipt && receipt.status === 0) {
          this.failedTx(hash, null, null);
        } else {
          setTimeout(async () => {
            await this.getTransactionReceipt(provider, hash);
          }, 10 * 1000)
        }
      } catch (e) {
        this.failedTx(hash, null,  e);
      }
    }
  },

  queuePendingTx: function(data, confirms) {
    this._queue = this.getQueue();
    let hash = data.tx.hash;
    data.lastUpdated = Date.now();
    data.completed = false;
    data.success = false;

    this._queue[hash] = data;
    if (this._signerAddress && (this._signerAddress.length > 0)) {
      store.set(this._signerAddress, this._queue);
      EventManager.emitEvent('txQueueUpdated', { hash, data });
    }

    data.tx.wait(confirms || 1).then(function (txReceipt) {
      this.successTx(hash, txReceipt, data);
    }.bind(this)).catch(function (err) {
      this.failedTx(hash, data, err);
    }.bind(this));
  },

  successTx: function(hash, txReceipt, data) {
    // Remove old Tx
    this.removeOldTx();
    console.log(txReceipt);
    console.log(`Transaction Hash: ${txReceipt.transactionHash}`);
    console.log(`Gas Used: ${txReceipt.gasUsed.toString()}`);
    this._queue[hash].receipt = txReceipt;
    this._queue[hash].success = true;
    this._queue[hash].completed = true;
    this._queue[hash].lastUpdated = Date.now();
    store.set(this._signerAddress, this._queue)
    EventManager.emitEvent('txQueueUpdated', { hash, data });
    EventManager.emitEvent('txSuccess', hash);
  },

  failedTx: function(hash, data, error) {
    // Remove old Tx
    this.removeOldTx();

    if (error) {
      console.error(error);
    }

    this._queue[hash].completed = true;
    this._queue[hash].success = false;
    this._queue[hash].lastUpdated = Date.now();
    store.set(this._signerAddress, this._queue)
    EventManager.emitEvent('txQueueUpdated', { hash, data });
    EventManager.emitEvent('txFailed', hash);
  },

  getQueue: function() {
    this._signerAddress = Wallet.currentAddress();
    const queue = store.get(this._signerAddress) || {};
    return queue;
  },

  numOfPending: function() {
    return _.keys(this.getQueue()).length;
  },

  getTx: function(nonce) {
    return this.getQueue()[nonce];
  },
};

