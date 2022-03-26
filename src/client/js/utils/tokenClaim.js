import _ from 'underscore';
import EventManager from './events';
import * as ethers from 'ethers';
import Wallet from './wallet';

const BigNumber = ethers.BigNumber;
const Utils = ethers.utils;
const Contract = ethers.Contract;

window.TokenClaim = {
  abi: {},
  addressInfo: {},

  initialize: async function () {
    // // initialize MetaMask if already connected
    // if (window.ethereum) {
    //   this.initListeners(window.ethereum);

    //   if (window.ethereum.selectedAddress) {
    //     this.provider = new ethers.providers.Web3Provider(window.ethereum);
    //   }
    // } else if (false) {
    //   // TODO init WalletConnect
    // }

    this.initializeAddr();
  },
  // init abi
  initializeAbi: function() {
    return Promise.all([
      ['vestingAbi', '/abi/vesting/vestingABI.json']
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
    return Promise.all([
      ['vestingAbi', '/abi/vesting/vestingAddress.json']
    ].map((data) => {
      fetch(data[1]).then((resp) => {
        return resp.json();
      }).then((json) => {
        this.addressInfo = json;
      });
    }));
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
      const contract = this.getContract();

      try {
        await contract.release();
        return Promise.resolve(1);
      } catch(err) {
        return Promise.resolve(-1);
      }
    } else {
      return Promise.resolve(-1);
    }
  },

  // total unlocked amount
  unlocked: async function () {
    if (this.isConnectedToAnyNetwork()) {
      const contract = this.getContract();
      const address = Wallet._cachedCurrentAddress;

      const result = await contract.unlocked(address);
      return parseInt(ethers.utils.formatEther(result));
    } else {
      return Promise.resolve(0);
    }
  },
  // total locked amount
  locked: async function () {
    if (this.isConnectedToAnyNetwork()) {
      const contract = this.getContract();
      const address = Wallet._cachedCurrentAddress;

      const result = await contract.locked(address);
      return parseInt(ethers.utils.formatEther(result));
    } else {
      return Promise.resolve(0);
    }
  },
  // total claimed amount
  claimed: async function () {
    if (this.isConnectedToAnyNetwork()) {
      const contract = this.getContract();
      const address = Wallet._cachedCurrentAddress;

      const result = await contract.released(address);
      return parseInt(ethers.utils.formatEther(result));
    } else {
      return Promise.resolve(0);
    }
  },
  getContract: function() {
    const signer = this.getProvider().getSigner();
    const contractAddress = this.addressInfo['vesting'][Wallet._cachedNetworkId]['address'];

    return new Contract(
      contractAddress,
      this.abi,
      signer
    );
  },
  isConnectedToAnyNetwork: function () {
    return Wallet.isConnectedToAnyNetwork();
  },
  getProvider: function () {
    return Wallet.getProvider();
  },
};

export default window.TokenClaim;