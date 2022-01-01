import Wallet from './wallet';

export default {
  _baseUrl: 'https://api.swing.xyz',

  sendGet: async function (url, params = {}) {
    let result = null;

    try {
      const endpoint = new URL(`${this._baseUrl}/${url}`);
      Object.keys(params).forEach((key) =>
        endpoint.searchParams.append(key, params[key]),
      );
      console.log('URL=', endpoint);
      const response = await fetch(endpoint);

      if (response.ok) {
        const data = await response.json();
        if (data) {
          result = data;
        }
      }
    } catch (err) {
      console.log('Failed to get data from PathFinder.', err);
    }

    return result;
  },

  sendPost: async function (url, params) {
    let result = null;

    try {
      const response = await fetch(`${this._baseUrl}/${url}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          result = data;
        }
      }
    } catch (err) {
      console.log('Failed to get data from PathFinder.', err);
    }

    return result;
  },

  getQuote: async function (chainId, srcToken, destToken, srcAmount) {
    const priceData = await this.sendGet('quote', {
      chainId,
      srcToken,
      destToken,
      srcAmount,
    });

    return priceData;
  },

  getApprove: async function (route, chainId, tokenAddress, amount) {
    const userAddress = Wallet.currentAddress();
    const tx = await this.sendGet('approve', {
      route,
      chainId,
      tokenAddress,
      amount,
      userAddress,
    });
    const txHash = await this.sendTransaction(tx);

    return txHash;
  },

  getSwap: async function (route, chainId, srcToken, destToken, srcAmount) {
    const userAddress = Wallet.currentAddress();
    const tx = await this.sendPost('swap', {
      chainId,
      route,
      srcToken,
      destToken,
      srcAmount,
      userAddress,
    });
    const txHash = await this.sendTransaction(tx);

    return txHash;
  },

  sendTransaction: async function (txObject) {
    try {
      const txHash = window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txObject],
      });
      return txHash;
    } catch (e) {
      console.log('Failed to send transaction:', e);
    }
  },

  waitTransaction: async function (txHash) {
    try {
      let txResult = null;
      while (!txResult) {
        txResult = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });
      }
      return txResult;
    } catch (e) {
      console.log(e);
    }
  },

  sendMultipleTransaction: async function (data1, data2) {
    try {
      // Send 1st transaction
      const txHash1 = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [data1],
      });
      // Check status
      let txResult = null;
      while (!txResult) {
        txResult = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash1],
        });
      }
      // Send 2nd transaction
      const txHash2 = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [data2],
      });
      return txHash2;
    } catch (e) {
      console.log(e);
    }
    return null;
  },
};