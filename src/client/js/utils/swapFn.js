import _ from 'underscore';
import * as ethers from 'ethers';
import BN from 'bignumber.js';
import EventManager from './events';
import TxQueue from './txQueue';
import TokenListManager from './tokenList';
import Wallet from './wallet';
import Storage from './storage';
import { ApprovalState } from '../constants/Status';
import PathFinder from './pathfinder';

// never exponent
BN.config({ EXPONENTIAL_AT: 1e9 });

const BigNumber = ethers.BigNumber;
const Utils = ethers.utils;
const Contract = ethers.Contract;

window.SwapFn = {
  initialize: function () {},

  validateEthValue: function (token, value) {
    let targetAmount = +value;

    if (!isNaN(targetAmount)) {
      if (targetAmount === 0) {
        return value;
      }

      // floor to the minimum possible value
      targetAmount = Math.max(10 ** -token.decimals, targetAmount);
      targetAmount = BN(BN(targetAmount).toFixed(token.decimals)).toString();

      return targetAmount;
    }
  },

  isValidParseValue: function (token, rawValue) {
    try {
      var parsed = ethers.utils.parseUnits(rawValue, token.decimals);
      return true;
    } catch (e) {
      console.log('Failed to parse: ', token.symbol, token.decimals, rawValue);
      return false;
    }
  },

  updateSettings: function (settings) {
    Storage.updateSettings(settings);
  },

  getSetting: function () {
    return Storage.swapSettings;
  },

  _getContract: function () {
    const signer = Wallet.getProvider().getSigner();
    const currentNetworkConfig = TokenListManager.getCurrentNetworkConfig();
    const currentNetworkName = currentNetworkConfig.name;
    const abiName = currentNetworkConfig.abi;
    const recipient = Wallet.currentAddress();
    const contract = new Contract(
      currentNetworkConfig.aggregatorAddress,
      window[abiName],
      signer
    );

    return { currentNetworkName, contract, recipient }
  },

  isNetworkGasDynamic: function () {
    var network = TokenListManager.getCurrentNetworkConfig();
    // if no gasAPI supplied, always default to auto;
    return !network.gasApi;
  },

  isGasAutomatic: function () {
    return (
      this.isNetworkGasDynamic() ||
      (!Storage.swapSettings.isCustomGasPrice &&
        Storage.swapSettings.gasSpeedSetting === 'safeLow')
    );
  },

  getGasPrice: function () {
    if (Storage.swapSettings.isCustomGasPrice) {
      return Math.floor(+Storage.swapSettings.customGasPrice);
    } else {
      return Math.floor(
        +window.GAS_STATS[Storage.swapSettings.gasSpeedSetting],
      );
    }
  },

  calculateMinReturn: function(fromToken, toToken, amount) {
    return this.getExpectedReturn(
      fromToken, toToken, amount
    ).then(function(actualReturn) {
      const y = 1.0 - (Storage.swapSettings.slippage / 100.0);
      const r = BN(actualReturn.returnAmount.toString()).times(y);
      const minReturn = Utils.formatUnits(r.toFixed(0), toToken.decimals);
      const distribution = actualReturn.distribution;
      const expectedAmount = Utils.formatUnits(actualReturn.returnAmount.toString(), toToken.decimals);
      return { minReturn, distribution, expectedAmount }
    }.bind(this));
  },

  calculateEstimatedTransactionCost: function (
    fromToken,
    toToken,
    amountBN,
    distribution
  ) {
    const { currentNetworkName, contract, recipient } = this._getContract();
    switch (currentNetworkName) {
      case 'Polygon':
        return this._estimateGasWithPolygonAbi(contract, fromToken, toToken, amountBN, distribution);
      case 'Moonriver':
        return this._estimateGasWithMoonriverAbi(contract, fromToken, toToken, amountBN, recipient, distribution);
      case 'xDai':
        return this._estimateGasWithXdaiAbi(contract, fromToken, toToken, amountBN, distribution);
      default:
        return this._estimateGasWithOneSplitAbi(contract, fromToken, toToken, amountBN, distribution);
    }
  },

  calculatePriceImpact: function (fromToken, toToken, amount) {
    return this._findSmallResult(fromToken, toToken, 1).then(
      function (small) {
        const [smallResult, smallAmount] = small;

        return this.getExpectedReturn(fromToken, toToken, amount).then(
          function (actualReturn) {
            var x = BN(smallResult.returnAmount.toString()).div(
              BN(smallAmount.toString()),
            );
            var y = BN(actualReturn.returnAmount.toString()).div(
              BN(amount.toString()),
            );

            return x.minus(y).abs().div(x).toFixed(6);
          }.bind(this),
        );
      }.bind(this),
    );
  },

  _smallResultCache: {},

  _findSmallResult: function (fromToken, toToken, factor) {
    if (this._smallResultCache[`${fromToken.symbol}-${toToken.symbol}`]) {
      return Promise.resolve(
        this._smallResultCache[`${fromToken.symbol}-${toToken.symbol}`],
      );
    }

    let smallAmount = Utils.parseUnits('' + Math.ceil(10 ** (factor * 3)), 0);

    return this.getExpectedReturn(fromToken, toToken, smallAmount).then(
      function (smallResult) {
        if (smallResult.returnAmount.gt(100)) {
          this._smallResultCache[`${fromToken.symbol}-${toToken.symbol}`] = [
            smallResult,
            smallAmount,
          ];
          return [smallResult, smallAmount];
        } else {
          return this._findSmallResult(fromToken, toToken, factor + 1);
        }
      }.bind(this),
    );
  },

  _mint: async function (symbol, value) {
    var abi = await fetch(`/abi/test/${symbol.toUpperCase()}.json`);
    window.abiMeth = await abi.json();
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const token = TokenListManager.findTokenById(symbol);

    const incrementer = new Contract(token.address, abiMeth, signer);
    const contractFn = async () => {
      console.log(
        `Calling the mint function for: ${token.symbol} ${token.address}`,
      );

      // Sign-Send Tx and Wait for Receipt
      const createReceipt = await incrementer.mint(
        window.ethereum.selectedAddress,
        value,
      );
      await createReceipt.wait();

      console.log(`Tx successful with hash: ${createReceipt.hash}`);
      EventManager.emitEvent('walletUpdated', 1);
    };

    await contractFn();
  },

  performSwap: function (fromToken, toToken, amountBN, distribution) {
    return this._swap(fromToken, toToken, amountBN, distribution);
  },

  performApprove: function (fromToken, amountBN) {
    return this._approve(
      fromToken.address,
      // approve arbitrarily large number
      amountBN.add(BigNumber.from(Utils.parseUnits('100000000'))),
    );
  },

  getApproveStatus: function (token, amountBN) {
    return this._getAllowance(token).then(
      function (allowanceBN) {
        if (token.native || (allowanceBN && allowanceBN.gte(amountBN))) {
          return Promise.resolve(ApprovalState.APPROVED);
        } else {
          return Promise.resolve(ApprovalState.NOT_APPROVED);
        }
      }.bind(this),
    );
  },

  _approve: function (tokenContractAddress, amountBN) {
    const pathRoute = localStorage.getItem('route');
    const chainId = TokenListManager.getCurrentNetworkConfig().chainId;

    if (['oneinch', 'paraswap'].includes(pathRoute)) {
      return PathFinder.getApproveTx(tokenContractAddress, amountBN, pathRoute, chainId);
    }

    console.log(
      `Calling APPROVE() with ${tokenContractAddress} ${amountBN.toString()}`,
    );
    const signer = Wallet.getProvider().getSigner();
    const contract = new Contract(
      tokenContractAddress,
      window.erc20Abi,
      signer,
    );
    return contract
      .approve(
        TokenListManager.getCurrentNetworkConfig().aggregatorAddress,
        amountBN,
        {
          // gasPrice: // the price to pay per gas
          // gasLimit: // the limit on the amount of gas to allow the transaction to consume; any unused gas is returned at the gasPrice
        },
      )
      .then(function (transaction) {
        console.log(
          `Waiting on APPROVE() with ${tokenContractAddress} ${amountBN.toString()}`,
        );
        return transaction.wait();
      });
  },

  _getAllowance: function (token) {
    if (!Wallet.isConnected()) {
      return Promise.resolve(false);
    }
    if (token.native) {
      console.log(`Not calling ALLOWANCE() on native token ${token.symbol}`);
      return Promise.resolve(false);
    }
    console.log(`Calling ALLOWANCE() with ${token.address}`);
    const contract = new Contract(
      token.address,
      window.erc20Abi,
      Wallet.getProvider(),
    );
  
    const userAddress = Wallet.currentAddress();
    const pathRoute = localStorage.getItem('route');
    const chainId = TokenListManager.getCurrentNetworkConfig().chainId;

    if (['oneinch', 'paraswap'].includes(pathRoute)) {
      return PathFinder.getAllowance(
        userAddress, token.address, pathRoute, chainId
      )
      .then(({ allowance }) => new BN(allowance))
      .catch(() => new BN(0));
    }

    return contract.allowance(
      userAddress,
      TokenListManager.getCurrentNetworkConfig().aggregatorAddress,
    );
  },

  /*
    function getExpectedReturn(
      IERC20 fromToken,
      IERC20 destToken,
      uint256 amount,
      uint256 parts,
      uint256 flags
    )
    public view returns (
      uint256 returnAmount,
      uint256[] memory distribution
    )
  */

  _getExpectedReturnCache: {},

  getExpectedReturn: async function (fromToken, toToken, amount, chain) {
    const network = chain
      ? TokenListManager.getNetworkById(chain)
      : TokenListManager.getCurrentNetworkConfig();
    const chainId = network.chainId;

    const key = [
      fromToken.address,
      toToken.address,
      amount.toString(),
      chainId,
    ].join('');

    if (key in this._getExpectedReturnCache) {
      const cacheValue = this._getExpectedReturnCache[key];
      if (Date.now() - cacheValue._cacheTimestamp < 5000) {
        // 5 seconds cache
        console.log('Using expectedReturn cache: ', key);
        return this._getExpectedReturnCache[key];
      }
    }

    if (chainId === '1') {
      const originAmount = new BN(amount.toString()).dividedBy(10 ** fromToken.decimals);
      const { destAmount, route } = await PathFinder.getQuote(fromToken.symbol, toToken.symbol, originAmount, chainId);
      const returnAmount = new BN(destAmount).times(10 ** toToken.decimals).toFixed(0);
      
      localStorage.setItem('route', route);
      const result = { returnAmount, route };

      return result;
    } else {
      localStorage.removeItem('route');
      const contract = new Contract(
        network.aggregatorAddress,
        window[network.abi],
        Wallet.getReadOnlyProvider(chainId)
      );

      let result = await contract.getExpectedReturn(
        fromToken.address,
        toToken.address,
        amount, // uint256 in wei
        network.desiredParts, // desired parts of splits accross pools(3 is recommended)
        0  // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
      );

      result = _.extend({}, result);
      result._cacheTimestamp = new Date();
      this._getExpectedReturnCache[key] = result;
      
      return result;
    }
  },

  _swap: function(fromToken, toToken, amountBN) {
    const pathRoute = localStorage.getItem('route');
    const chainId = TokenListManager.getCurrentNetworkConfig().chainId;

    if (['oneinch', 'paraswap'].includes(pathRoute)) {
      const originAmount = new BN(amountBN.toString()).dividedBy(10 ** fromToken.decimals);
      return PathFinder.getSwap(fromToken.symbol, toToken.symbol, originAmount, pathRoute, chainId);
    }

    console.log(`Calling SWAP() with ${fromToken.symbol} to ${toToken.symbol} of ${amountBN.toString()}`);
    const { currentNetworkName, contract, recipient } = this._getContract();

    return this.calculateMinReturn(
      fromToken, toToken, amountBN
    ).then(function({ minReturn, distribution, expectedAmount }) {
      /*
        returns(
          uint256 returnAmount
        )
      */
      switch(currentNetworkName) {
        case 'Polygon':
          this._swapWithPolygonAbi(contract, fromToken, toToken, amountBN, expectedAmount, minReturn, distribution);
          break;
        case 'Moonriver':
          this._swapWithMoonriverAbi(contract, fromToken, toToken, amountBN, minReturn, recipient, distribution);
          break;
        case 'xDai':
          this._swapWithXdaiAbi(contract, fromToken, toToken, amountBN, minReturn, distribution);
          break;
        default:
          this._swapWithOneSplitAbi(contract, fromToken, toToken, amountBN, minReturn, distribution);
      }
    }.bind(this));
  },

  _swapWithOneSplitAbi: function(contract, fromToken, toToken, amountBN, minReturn, distribution) {
    return contract.swap(
      fromToken.address,
      toToken.address,
      amountBN, // uint256 in wei
      Utils.parseUnits(minReturn, toToken.decimals), // minReturn
      distribution,
      0,  // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
      {
        // gasPrice: // the price to pay per gas
        // gasLimit: // the limit on the amount of gas to allow the transaction to consume; any unused gas is returned at the gasPrice,
        value: fromToken.native ? amountBN : undefined,
        gasPrice: !this.isGasAutomatic()
            ? Utils.parseUnits("" + this.getGasPrice(), "gwei")
            : undefined
      }
    ).then(function(transaction) {
      this._returnSwapResult(transaction, fromToken, toToken, amountBN);
    }.bind(this));
  },

  _swapWithPolygonAbi: function(contract, fromToken, toToken, amountBN, expectedAmount, minReturn, distribution) {
    return contract.swap(
      fromToken.address,
      toToken.address,
      amountBN, // uint256 in wei
      Utils.parseUnits(expectedAmount, toToken.decimals), // expectedReturn
      Utils.parseUnits(minReturn, toToken.decimals), // minReturn
      distribution,
      0,  // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
      {
        // gasPrice: // the price to pay per gas
        // gasLimit: // the limit on the amount of gas to allow the transaction to consume; any unused gas is returned at the gasPrice,
        value: fromToken.native ? amountBN : undefined,
        gasPrice: !this.isGasAutomatic()
            ? Utils.parseUnits("" + this.getGasPrice(), "gwei")
            : undefined
      }
    ).then(function(transaction) {
      this._returnSwapResult(transaction, fromToken, toToken, amountBN);
    }.bind(this));
  },

  _swapWithMoonriverAbi: function(contract, fromToken, toToken, amountBN, minReturn, recipient, distribution) {
    return contract.swap(
      fromToken.address,
      toToken.address,
      amountBN, // uint256 in wei
      Utils.parseUnits(minReturn, toToken.decimals), // minReturn
      recipient,
      distribution,
      0,  // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
      {
        // gasPrice: // the price to pay per gas
        // gasLimit: // the limit on the amount of gas to allow the transaction to consume; any unused gas is returned at the gasPrice,
        value: fromToken.native ? amountBN : undefined,
        gasPrice: !this.isGasAutomatic()
            ? Utils.parseUnits("" + this.getGasPrice(), "gwei")
            : undefined
      }
    ).then(function(transaction) {
      this._returnSwapResult(transaction, fromToken, toToken, amountBN);
    }.bind(this));
  },

  _swapWithXdaiAbi: function(contract, fromToken, toToken, amountBN, minReturn, distribution) {
    return contract.swap(
      fromToken.address,
      toToken.address,
      amountBN, // uint256 in wei
      Utils.parseUnits(minReturn, toToken.decimals), // minReturn
      distribution,
      0,  // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
      {
        // gasPrice: // the price to pay per gas
        // gasLimit: // the limit on the amount of gas to allow the transaction to consume; any unused gas is returned at the gasPrice,
        value: fromToken.native ? amountBN : undefined,
        gasPrice: !this.isGasAutomatic()
            ? Utils.parseUnits("" + this.getGasPrice(), "gwei")
            : undefined
      }
    ).then(function(transaction) {
      this._returnSwapResult(transaction, fromToken, toToken, amountBN);
    }.bind(this));
  },

  _returnSwapResult: function (transaction, fromToken, toToken, amountBN) {
    console.log(`Waiting SWAP() with ${fromToken.symbol} to ${toToken.symbol} of ${amountBN.toString()}`);
    const network = TokenListManager.getCurrentNetworkConfig();
    const chainId = network.chainId;

    TxQueue.queuePendingTx({
      chainId: chainId,
      from: fromToken,
      to: toToken,
      amount: amountBN,
      tx: transaction
    });
    return transaction.hash;
  },

  _estimateGasWithXdaiAbi: function(contract, fromToken, toToken, amountBN, distribution) {
    return contract.estimateGas.swap(
      fromToken.address,
      toToken.address,
      amountBN, // uint256 in wei
      BigNumber.from(0),
      distribution,
      0,  // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
      {
        // gasPrice: // the price to pay per gas
        // gasLimit: // the limit on the amount of gas to allow the transaction to consume; any unused gas is returned at the gasPrice,
        value: fromToken.native ? amountBN : undefined,
        gasPrice: !this.isGasAutomatic()
            ? Utils.parseUnits("" + this.getGasPrice(), "gwei")
            : undefined
      }
    ).then(async function(gasUnitsEstimated) {
      console.log('### gasUnitsEstimated ###', gasUnitsEstimated)
      return await this._returnEstimatedGasResult(gasUnitsEstimated);
    }.bind(this));
  },

  _estimateGasWithOneSplitAbi: function(contract, fromToken, toToken, amountBN, distribution) {
    return contract.estimateGas.swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        BigNumber.from(0),
        distribution,
        0,  // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        {
          // gasPrice: // the price to pay per gas
          // gasLimit: // the limit on the amount of gas to allow the transaction to consume; any unused gas is returned at the gasPrice,
          value: fromToken.native ? amountBN : undefined,
          gasPrice: !this.isGasAutomatic()
              ? Utils.parseUnits("" + this.getGasPrice(), "gwei")
              : undefined
        }
    ).then(async function(gasUnitsEstimated) {
      return await this._returnEstimatedGasResult(gasUnitsEstimated);
    }.bind(this));
  },

  _estimateGasWithPolygonAbi: function(contract, fromToken, toToken, amountBN, distribution) {
    return contract.estimateGas.swap(
      fromToken.address,
      toToken.address,
      amountBN, // uint256 in wei
      BigNumber.from(0), // expectedReturn
      BigNumber.from(0), // minReturn
      distribution,
      0,  // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
      {
        // gasPrice: // the price to pay per gas
        // gasLimit: // the limit on the amount of gas to allow the transaction to consume; any unused gas is returned at the gasPrice,
        value: fromToken.native ? amountBN : undefined,
        gasPrice: !this.isGasAutomatic()
            ? Utils.parseUnits("" + this.getGasPrice(), "gwei")
            : undefined
      }
    ).then(async function(gasUnitsEstimated) {
      return await this._returnEstimatedGasResult(gasUnitsEstimated);
    }.bind(this));
  },

  _estimateGasWithMoonriverAbi: function(contract, fromToken, toToken, amountBN, recipient, distribution) {
    return contract.estimateGas.swap(
      fromToken.address,
      toToken.address,
      amountBN, // uint256 in wei
      BigNumber.from(0), // minReturn
      recipient,
      distribution,
      0,  // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
      {
        // gasPrice: // the price to pay per gas
        // gasLimit: // the limit on the amount of gas to allow the transaction to consume; any unused gas is returned at the gasPrice,
        value: fromToken.native ? amountBN : undefined,
        gasPrice: !this.isGasAutomatic()
            ? Utils.parseUnits("" + this.getGasPrice(), "gwei")
            : undefined
      }
    ).then(async function(gasUnitsEstimated) {
      return await this._returnEstimatedGasResult(gasUnitsEstimated);
    }.bind(this));
  },

  _returnEstimatedGasResult: async function(gasUnitsEstimated) {
    // Returns the estimate units of gas that would be
    // required to execute the METHOD_NAME with args and overrides.
    let gasPrice;

    if (this.isGasAutomatic()) {
      gasPrice = await Wallet.getReadOnlyProvider().getGasPrice();
      gasPrice = Math.ceil(Utils.formatUnits(gasPrice, "gwei"));
    } else {
      gasPrice = this.getGasPrice();
    }

    return Utils.formatUnits(
        Utils.parseUnits("" + (gasPrice * gasUnitsEstimated.toString()), "gwei")
    );
  }
};

export default window.SwapFn;
