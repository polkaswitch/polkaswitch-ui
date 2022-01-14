/* eslint-disable class-methods-use-this */
import EventEmitter from 'eventemitter3';
import { PublicKey, Transaction } from '@solana/web3.js';
import { notify } from '../../utils/notifications';

export class SolongWalletAdapter extends EventEmitter {

  constructor() {
    super();
    this._publicKey = null;
    this._onProcess = false;
    this.connect = this.connect.bind(this);
  }

  get publicKey() {
    return this._publicKey;
  }

  async signTransaction(transaction) {
    return (window).solong.signTransaction(transaction);
  }

  connect() {
    if (this._onProcess) {
      return;
    }

    if ((window).solong === undefined) {
      notify({
        message: 'Solong Error',
        description: 'Please install solong wallet from Chrome ',
      });
      return;
    }

    this._onProcess = true;
    (window).solong
      .selectAccount()
      .then((account) => {
        this._publicKey = new PublicKey(account);
        this.emit('connect', this._publicKey);
      })
      .catch(() => {
        this.disconnect();
      })
      .finally(() => {
        this._onProcess = false;
      });
  }

  disconnect() {
    if (this._publicKey) {
      this._publicKey = null;
      this.emit('disconnect');
    }
  }
}
