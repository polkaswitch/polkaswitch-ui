import _ from 'underscore';
import EventManager from './events';
import * as ethers from 'ethers';
import TokenListManager from './tokenList';
import BN from 'bignumber.js';
import * as Sentry from '@sentry/react';

import WalletConnectProvider from '@walletconnect/web3-provider';

const BigNumber = ethers.BigNumber;
const Utils = ethers.utils;
const Contract = ethers.Contract;

window.TokenClaim = {
  abi: undefined,
  addr: undefined,
  network: undefined,
  provider: undefined,

  initialize: async function () {
    // initialize MetaMask if already connected
    if (window.ethereum) {
      this.initListeners(window.ethereum);

      if (window.ethereum.selectedAddress) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
      }
    } else if (false) {
      // TODO init WalletConnect
    }

    this.initializeAddr();
  },
  // init abi
  initializeAbi: function() {
    window.ABIS = {};

    return Promise.all([
      ['vestingAbi', '/abi/vesting.json']
    ].map((data) => {
      fetch(data[1]).then((resp) => {
        return resp.json();
      }).then((abiJson) => {
        this.abi = abiJson;
      });
    }));
  },
  // init contract address
  initializeAddr: function() {
    this.addr = "0x170446f2dAa16F7f8279a184821c841b6908647c";
  },
  
  initListeners: function (provider) {
    provider.on(
      'TokensReleased',
      function (beneficiary, unreleased) {
        // Time to reload your interface with accounts[0]!
        console.log('event - TokensReleased:', accounts);
      }.bind(this),
    );
  },
  // release vested tokens
  claimTokens: async function () {
    if (this.isConnectedToAnyNetwork()) {
      const signer = this.provider.getSigner();

      const contract = new Contract(
        this.addr,
        this.abi,
        signer
      );
      await contract.release(signer.getAddress());

      return Promise.resolve(1);
    } else {
      return Promise.resolve(-1);
    }
  },

  // total unlocked amount
  unlocked: async function () {
    if (this.isConnectedToAnyNetwork()) {
      const signer = this.provider.getSigner();

      const contract = new Contract(
        this.addr,
        this.abi,
        signer
      );
      return await contract.unlocked(signer.getAddress());
    } else {
      return Promise.resolve(0);
    }
  },
  // total locked amount
  locked: async function () {
    if (this.isConnectedToAnyNetwork()) {
      const signer = this.provider.getSigner();

      const contract = new Contract(
        this.addr,
        this.abi,
        signer
      );
      return await contract.locked(signer.getAddress());
    } else {
      return Promise.resolve(0);
    }
  },
  // total claimed amount
  claimed: async function () {
    if (this.isConnectedToAnyNetwork()) {
      const signer = this.provider.getSigner();

      const contract = new Contract(
        this.addr,
        this.abi,
        signer
      );
      return await contract.released(signer.getAddress());
    } else {
      return Promise.resolve(0);
    }
  },

  isConnectedToAnyNetwork: function () {
    return !!this.provider;
  },
};

export default window.TokenClaim;