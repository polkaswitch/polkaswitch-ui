import Wallet from './wallet';

export default {
  baseUrl: 'https://api.swing.xyz',

  async sendGet(url, params = {}) {
    let result = null;

    try {
      const endpoint = new URL(`${this.baseUrl}/${url}`);
      Object.keys(params).forEach((key) => endpoint.searchParams.append(key, params[key]));
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

  async sendPost(url, params) {
    let result = null;

    try {
      const response = await fetch(`${this.baseUrl}/${url}`, {
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

  async getQuote(srcToken, destToken, srcAmount, chainId) {
    const priceData = await this.sendGet('quote', {
      chainId,
      srcToken,
      destToken,
      srcAmount,
    });

    return priceData;
  },

  async getAllowance(userAddress, tokenAddress, route, chainId) {
    const allowance = await this.sendGet('allowance', {
      route,
      chainId,
      userAddress,
      tokenAddress,
    });

    return allowance;
  },

  async getApproveTx(tokenAddress, amount, route, chainId) {
    const userAddress = Wallet.currentAddress();
    const tx = await this.sendGet('approve/transaction', {
      route,
      chainId,
      tokenAddress,
      amount,
      userAddress,
    });
    const txHash = await this.sendTransaction(tx);

    return txHash;
  },

  async getSwap(srcToken, destToken, srcAmount, route, chainId) {
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

  async getPools(chainId) {
    const pools = await this.sendGet('pools', { chainId });
    return pools;
  },

  async sendTransaction(txObject) {
    try {
      const txHash = window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txObject],
      });
      return txHash;
    } catch (e) {
      console.log('Failed to send transaction:', e);
    }

    return null;
  },

  async waitTransaction(txHash) {
    try {
      let txResult = null;
      /* eslint-disable no-await-in-loop */
      while (!txResult) {
        txResult = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });
      }
      return txResult;
    } catch (e) {
      console.log('Failed to wait transaction:', e);
    }

    return null;
  },
};
