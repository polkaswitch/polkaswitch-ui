import _ from 'underscore';
import * as ethers from 'ethers';
import BN from 'bignumber.js';
import EventManager from './events';
import TxQueue from './txQueue';
import TokenListManager from './tokenList';
import Wallet from './wallet';
import Storage from './storage';
import { approvalState, wrapTokens } from '../constants';
import CoingeckoManager from './coingecko';
import PathFinder from './pathfinder';

// never exponent
BN.config({ EXPONENTIAL_AT: 1e9 });

const { BigNumber } = ethers;
const Utils = ethers.utils;
const { Contract } = ethers;

window.SwapFn = {
  initialize() {},

  validateEthValue(token, value) {
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
    return undefined;
  },

  isValidParseValue(token, rawValue) {
    try {
      const parsed = ethers.utils.parseUnits(rawValue, token.decimals);
      return true;
    } catch (e) {
      console.log('Failed to parse: ', token.symbol, token.decimals, rawValue);
      return false;
    }
  },

  updateSettings(settings) {
    Storage.updateSettings(settings);
  },

  getSetting() {
    return Storage.swapSettings;
  },

  getContract() {
    const signer = Wallet.getProvider().getSigner();
    const currentNetworkConfig = TokenListManager.getCurrentNetworkConfig();
    const { chainId } = currentNetworkConfig;
    const abiName = currentNetworkConfig.abi;
    const recipient = Wallet.currentAddress();
    const contract = new Contract(currentNetworkConfig.aggregatorAddress, window.ABIS[abiName], signer);

    return { chainId, contract, recipient };
  },

  isNetworkGasDynamic() {
    const network = TokenListManager.getCurrentNetworkConfig();
    // if no gasAPI supplied, always default to auto;
    return !network.gasApi;
  },

  isGasAutomatic() {
    return (
      this.isNetworkGasDynamic() ||
      (!Storage.swapSettings.isCustomGasPrice && Storage.swapSettings.gasSpeedSetting === 'safeLow')
    );
  },

  getGasPrice() {
    if (Storage.swapSettings.isCustomGasPrice) {
      return Math.floor(+Storage.swapSettings.customGasPrice);
    }
    return Math.floor(+window.GAS_STATS[Storage.swapSettings.gasSpeedSetting]);
  },

  async calculateMinReturn(fromToken, toToken, amount) {
    return this.getExpectedReturn(fromToken, toToken, amount).then((actualReturn) => {
      const y = 1.0 - Storage.swapSettings.slippage / 100.0;
      const r = BN(actualReturn.returnAmount.toString()).times(y);
      const minReturn = Utils.formatUnits(r.toFixed(0), toToken.decimals);
      const { distribution } = actualReturn;
      const expectedAmount = Utils.formatUnits(actualReturn.returnAmount.toString(), toToken.decimals);
      return { minReturn, distribution, expectedAmount };
    });
  },

  calculateEstimatedTransactionCost(fromToken, toToken, amountBN, distribution) {
    const { chainId, contract, recipient } = this.getContract();
    switch (chainId) {
      case '56':
        return this.estimateGasWithBscAbi(contract, fromToken, toToken, amountBN, recipient, distribution);
      case '137':
        return this.estimateGasWithPolygonAbi(contract, fromToken, toToken, amountBN, distribution);
      case '1285':
        return this.estimateGasWithMoonriverAbi(contract, fromToken, toToken, amountBN, recipient, distribution);
      case '100':
        return this.estimateGasWithXdaiAbi(contract, fromToken, toToken, amountBN, distribution);
      case '1666600000':
        return this.estimateGasWithHarmonyAbi(contract, fromToken, toToken, amountBN, distribution);
      case '1313161554':
        return this.estimateGasWithAuroraAbi(contract, fromToken, toToken, amountBN, distribution);
      default:
        return this.estimateGasWithOneSplitAbi(contract, fromToken, toToken, amountBN, distribution);
    }
  },

  async calculatePriceImpact(fromToken, toToken, amount, originAmount) {
    let priceImpact = 0.0;
    const network = TokenListManager.getCurrentNetworkConfig();
    const assetPlatform = (network.coingecko && network.coingecko.platform) || '';
    let fromTokenAddress = fromToken.address;

    if (wrapTokens.hasOwnProperty(fromToken.symbol)) {
      fromTokenAddress = wrapTokens[fromToken.symbol][network.chainId];
    }
    const tokenPrice = await CoingeckoManager.getTokenPrice(assetPlatform, fromTokenAddress);

    if (tokenPrice) {
      // get small token amount equals to $1
      const smallAmount = BN(1).div(tokenPrice).toFixed(6);
      const pmExpectReturn = await this.getExpectedReturn(fromToken, toToken, Utils.parseUnits(smallAmount, fromToken.decimals));
      const pm = BN(pmExpectReturn.returnAmount.toString());
      const poExpectReturn = await this.getExpectedReturn(fromToken, toToken, amount);
      const po = BN(poExpectReturn.returnAmount.toString());
      const factor = BN(originAmount).div(smallAmount).toFixed(6);

      if (BN(po).isGreaterThan(pm.times(factor))) {
        priceImpact = parseFloat(BN(po.minus(pm.times(factor))).div(pm.times(factor)).times(100).toFixed(6));
      } else {
        priceImpact = parseFloat(BN(pm.times(factor).minus(po)).div(pm.times(factor)).times(100).toFixed(6));
      }
    }

    return priceImpact;
  },

  async mint(symbol, value) {
    const abi = await fetch(`/abi/test/${symbol.toUpperCase()}.json`);
    window.abiMeth = await abi.json();
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const token = TokenListManager.findTokenById(symbol);

    const incrementer = new Contract(token.address, window.abiMeth, signer);
    const contractFn = async () => {
      console.log(`Calling the mint function for: ${token.symbol} ${token.address}`);

      // Sign-Send Tx and Wait for Receipt
      const createReceipt = await incrementer.mint(window.ethereum.selectedAddress, value);
      await createReceipt.wait();

      console.log(`Tx successful with hash: ${createReceipt.hash}`);
      EventManager.emitEvent('walletUpdated', 1);
    };

    await contractFn();
  },

  performSwap(fromToken, toToken, amountBN, distribution) {
    return this.swap(fromToken, toToken, amountBN, distribution);
  },

  performApprove(fromToken, amountBN) {
    return this.approve(
      fromToken.address,
      // approve arbitrarily large number
      amountBN.add(BigNumber.from(Utils.parseUnits('100000000'))),
    );
  },

  getApproveStatus(token, amountBN) {
    return this.getAllowance(token).then(
      (allowanceBN) => {
        console.log('allowanceBN', allowanceBN);
        if (token.native || (allowanceBN && allowanceBN.gte(amountBN))) {
          return Promise.resolve(approvalState.APPROVED);
        }
        return Promise.resolve(approvalState.NOT_APPROVED);
      },
    );
  },

  approve(tokenContractAddress, amountBN) {
    const pathRoute = localStorage.getItem('route');
    const { chainId } = TokenListManager.getCurrentNetworkConfig();

    if (['oneinch', 'paraswap'].includes(pathRoute)) {
      return PathFinder.getApproveTx(tokenContractAddress, amountBN, pathRoute, chainId);
    }

    console.log(`Calling APPROVE() with ${tokenContractAddress} ${amountBN.toString()}`);
    const signer = Wallet.getProvider().getSigner();
    const contract = new Contract(tokenContractAddress, window.ABIS.erc20Abi, signer);

    return contract
      .approve(TokenListManager.getCurrentNetworkConfig().aggregatorAddress, amountBN, {})
      .then((transaction) => {
        console.log(`Waiting on APPROVE() with ${tokenContractAddress} ${amountBN.toString()}`);
        return transaction.wait();
      });
  },

  getAllowance(token) {
    if (!Wallet.isConnected()) {
      return Promise.resolve(false);
    }
    if (token.native) {
      console.log(`Not calling ALLOWANCE() on native token ${token.symbol}`);
      return Promise.resolve(false);
    }
    console.log(`Calling ALLOWANCE() with ${token.address}`);
    const contract = new Contract(token.address, window.ABIS.erc20Abi, Wallet.getProvider());

    const userAddress = Wallet.currentAddress();
    const pathRoute = localStorage.getItem('route');
    const { chainId } = TokenListManager.getCurrentNetworkConfig();

    if (['oneinch', 'paraswap'].includes(pathRoute)) {
      return PathFinder.getAllowance(userAddress, token.address, pathRoute, chainId)
        .then(({ allowance }) => BigNumber.from(allowance))
        .catch(() => new BN(0));
    }

    return contract.allowance(Wallet.currentAddress(), TokenListManager.getCurrentNetworkConfig().aggregatorAddress);
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

  getExpectedReturnCache: {},

  async getExpectedReturn(fromToken, toToken, amount, networkChainId) {
    const network = networkChainId
      ? TokenListManager.getNetworkById(networkChainId)
      : TokenListManager.getCurrentNetworkConfig();
    const { chainId } = network;

    const key = [fromToken.address, toToken.address, amount.toString(), chainId].join('');
    if (key in this.getExpectedReturnCache) {
      const cacheValue = this.getExpectedReturnCache[key];
      if (Date.now() - cacheValue.cacheTimestamp < 5000) {
        // 5 seconds cache
        console.log('Using expectedReturn cache: ', key);
        return this.getExpectedReturnCache[key];
      }
    }

    if (chainId === '1' || chainId === '42161' || chainId === '10') {
      const { destAmount, route, distribution } = (await PathFinder.getQuote(fromToken.symbol, toToken.symbol, amount, chainId)) || {};
      if (destAmount) {
        const returnAmount = new BN(destAmount).times(10 ** toToken.decimals).toFixed(0);

        localStorage.setItem('route', route);
        const result = { returnAmount, route, distribution };

        return result;
      }
    } else {
      localStorage.removeItem('route');
      const contract = new Contract(
        network.aggregatorAddress,
        window.ABIS[network.abi],
        Wallet.getReadOnlyProvider(chainId),
      );

      let expectReturnResult = null;
      if (chainId === '56' || chainId === '137') {
        expectReturnResult = await contract.getExpectedReturn(
          fromToken.address,
          toToken.address,
          amount, // uint256 in wei
          network.desiredParts // desired parts of splits accross pools(3 is recommended)
        );
      } else {
        expectReturnResult = await contract.getExpectedReturn(
          fromToken.address,
          toToken.address,
          amount, // uint256 in wei
          network.desiredParts, // desired parts of splits accross pools(3 is recommended)
          0 // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        );
      }

      const result = _.extend({}, expectReturnResult);
      result.cacheTimestamp = new Date();
      this.getExpectedReturnCache[key] = result;
      return result;
    }
  },

  async swap(fromToken, toToken, amountBN) {
    console.log(`Calling SWAP() with ${fromToken.symbol} to ${toToken.symbol} of ${amountBN.toString()}`);
    const { chainId, contract, recipient } = this.getContract();
    const pathRoute = localStorage.getItem('route');
    if (['oneinch', 'paraswap'].includes(pathRoute)) {
      const originAmount = new BN(amountBN.toString()).dividedBy(10 ** fromToken.decimals);
      return PathFinder.getSwap(fromToken.symbol, toToken.symbol, originAmount, pathRoute, chainId);
    }

    return this.calculateMinReturn(fromToken, toToken, amountBN).then(({ minReturn, distribution, expectedAmount }) => {
      /*
        returns(
          uint256 returnAmount
        )
      */
      switch (chainId) {
        case '56':
          return this.swapWithBscAbi(
            contract,
            fromToken,
            toToken,
            amountBN,
            expectedAmount,
            minReturn,
            recipient,
            distribution,
          );
        case '137':
          return this.swapWithPolygonAbi(
            contract,
            fromToken,
            toToken,
            amountBN,
            expectedAmount,
            minReturn,
            recipient,
            distribution,
          );
        case '1285':
          return this.swapWithMoonriverAbi(contract, fromToken, toToken, amountBN, minReturn, recipient, distribution);
        case '100':
          return this.swapWithXdaiAbi(contract, fromToken, toToken, amountBN, minReturn, distribution);
        case '1666600000':
          return this.swapWithHarmonyAbi(contract, fromToken, toToken, amountBN, minReturn, distribution);
        case '1313161554':
          return this.swapWithAuroraAbi(
            contract,
            fromToken,
            toToken,
            amountBN,
            expectedAmount,
            minReturn,
            distribution,
          );
        default:
          return this.swapWithOneSplitAbi(contract, fromToken, toToken, amountBN, minReturn, distribution);
      }
    });
  },

  getGasParams(fromToken, amountBN) {
    return {
      // gasPrice: // the price to pay per gas
      // gasLimit: // the limit on the amount of gas to allow the transaction to consume.
      // any unused gas is returned at the gasPrice,
      value: fromToken.native ? amountBN : undefined,
      gasPrice: !this.isGasAutomatic() ? Utils.parseUnits(`${this.getGasPrice()}`, 'gwei') : undefined,
    };
  },

  swapWithOneSplitAbi(contract, fromToken, toToken, amountBN, minReturn, distribution) {
    return contract
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        Utils.parseUnits(minReturn, toToken.decimals), // minReturn
        distribution,
        0, // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        this.getGasParams(fromToken, amountBN),
      )
      .then((transaction) => this.returnSwapResult(transaction, fromToken, toToken, amountBN));
  },

  swapWithBscAbi(contract, fromToken, toToken, amountBN, expectedAmount, minReturn, recipient, distribution) {
    return contract
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        Utils.parseUnits(expectedAmount, toToken.decimals), // expectedReturn
        Utils.parseUnits(minReturn, toToken.decimals), // minReturn
        recipient,
        distribution,
        this.getGasParams(fromToken, amountBN),
      )
      .then((transaction) => this.returnSwapResult(transaction, fromToken, toToken, amountBN));
  },

  swapWithPolygonAbi(contract, fromToken, toToken, amountBN, expectedAmount, minReturn, recipient, distribution) {
    return contract
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        Utils.parseUnits(expectedAmount, toToken.decimals), // expectedReturn
        Utils.parseUnits(minReturn, toToken.decimals), // minReturn
        recipient,
        distribution,
        this.getGasParams(fromToken, amountBN),
      )
      .then((transaction) => this.returnSwapResult(transaction, fromToken, toToken, amountBN));
  },

  swapWithMoonriverAbi(contract, fromToken, toToken, amountBN, minReturn, recipient, distribution) {
    return contract
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        Utils.parseUnits(minReturn, toToken.decimals), // minReturn
        recipient,
        distribution,
        0, // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        this.getGasParams(fromToken, amountBN),
      )
      .then((transaction) => this.returnSwapResult(transaction, fromToken, toToken, amountBN));
  },

  swapWithXdaiAbi(contract, fromToken, toToken, amountBN, minReturn, distribution) {
    return contract
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        Utils.parseUnits(minReturn, toToken.decimals), // minReturn
        distribution,
        0, // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        this.getGasParams(fromToken, amountBN),
      )
      .then((transaction) => this.returnSwapResult(transaction, fromToken, toToken, amountBN));
  },

  swapWithHarmonyAbi(contract, fromToken, toToken, amountBN, minReturn, distribution) {
    return contract
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        Utils.parseUnits(minReturn, toToken.decimals), // minReturn
        distribution,
        0, // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        this.getGasParams(fromToken, amountBN),
      )
      .then((transaction) => this.returnSwapResult(transaction, fromToken, toToken, amountBN));
  },

  swapWithAuroraAbi(contract, fromToken, toToken, amountBN, expectedAmount, minReturn, distribution) {
    return contract
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        Utils.parseUnits(expectedAmount, toToken.decimals), // expectedReturn
        Utils.parseUnits(minReturn, toToken.decimals), // minReturn
        distribution,
        0, // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        this.getGasParams(fromToken, amountBN),
      )
      .then((transaction) => this.returnSwapResult(transaction, fromToken, toToken, amountBN));
  },

  returnSwapResult(transaction, fromToken, toToken, amountBN) {
    console.log(`Waiting SWAP() with ${fromToken.symbol} to ${toToken.symbol} of ${amountBN.toString()}`);
    const network = TokenListManager.getCurrentNetworkConfig();
    const { chainId } = network;

    TxQueue.queuePendingTx({
      chainId,
      from: fromToken,
      to: toToken,
      amount: amountBN,
      tx: transaction,
    });
    return transaction.hash;
  },

  estimateGasWithOneSplitAbi(contract, fromToken, toToken, amountBN, distribution) {
    return contract.estimateGas
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        BigNumber.from(0),
        distribution,
        0, // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        this.getGasParams(fromToken, amountBN),
      )
      .then((gasUnitsEstimated) => this.returnEstimatedGasResult(gasUnitsEstimated));
  },

  estimateGasWithXdaiAbi(contract, fromToken, toToken, amountBN, distribution) {
    return contract.estimateGas
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        BigNumber.from(0),
        distribution,
        0, // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        this.getGasParams(fromToken, amountBN),
      )
      .then((gasUnitsEstimated) => this.returnEstimatedGasResult(gasUnitsEstimated));
  },

  estimateGasWithHarmonyAbi(contract, fromToken, toToken, amountBN, distribution) {
    return contract.estimateGas
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        BigNumber.from(0),
        distribution,
        0, // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        this.getGasParams(fromToken, amountBN),
      )
      .then((gasUnitsEstimated) => this.returnEstimatedGasResult(gasUnitsEstimated));
  },

  estimateGasWithAuroraAbi(contract, fromToken, toToken, amountBN, distribution) {
    return contract.estimateGas
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        BigNumber.from(0),
        distribution,
        0, // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        this.getGasParams(fromToken, amountBN),
      )
      .then((gasUnitsEstimated) => this.returnEstimatedGasResult(gasUnitsEstimated));
  },

  estimateGasWithBscAbi(contract, fromToken, toToken, amountBN, recipient, distribution) {
    return contract.estimateGas
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        BigNumber.from(0), // expectedReturn
        BigNumber.from(0), // minReturn
        recipient,
        distribution,
        0, // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        this.getGasParams(fromToken, amountBN),
      )
      .then((gasUnitsEstimated) => this.returnEstimatedGasResult(gasUnitsEstimated));
  },

  estimateGasWithPolygonAbi(contract, fromToken, toToken, amountBN, distribution) {
    return contract.estimateGas
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        BigNumber.from(0), // expectedReturn
        BigNumber.from(0), // minReturn
        distribution,
        0, // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        this.getGasParams(fromToken, amountBN),
      )
      .then((gasUnitsEstimated) => this.returnEstimatedGasResult(gasUnitsEstimated));
  },

  estimateGasWithMoonriverAbi(contract, fromToken, toToken, amountBN, recipient, distribution) {
    return contract.estimateGas
      .swap(
        fromToken.address,
        toToken.address,
        amountBN, // uint256 in wei
        BigNumber.from(0), // minReturn
        recipient,
        distribution,
        0, // the flag to enable to disable certain exchange(can ignore for testnet and always use 0)
        this.getGasParams(fromToken, amountBN),
      )
      .then((gasUnitsEstimated) => this.returnEstimatedGasResult(gasUnitsEstimated));
  },

  async returnEstimatedGasResult(gasUnitsEstimated) {
    // Returns the estimate units of gas that would be
    // required to execute the METHOD_NAME with args and overrides.
    let gasPrice;

    if (this.isGasAutomatic()) {
      gasPrice = await Wallet.getReadOnlyProvider().getGasPrice();
      gasPrice = Math.ceil(Utils.formatUnits(gasPrice, 'gwei'));
    } else {
      gasPrice = this.getGasPrice();
    }

    return Utils.formatUnits(Utils.parseUnits(`${gasPrice * gasUnitsEstimated.toString()}`, 'gwei'));
  },
};

export default window.SwapFn;
