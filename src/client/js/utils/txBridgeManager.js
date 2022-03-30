import _ from 'underscore';
import { BigNumber, constants, providers, Signer, utils } from 'ethers';
import { getRandomBytes32 } from '@connext/nxtp-utils';
import { mappingToGenerateConnextArray, mappingToGenerateArrayAnyBridge } from './bridgeManagerMappings';
import fetchWithRetry from '../utils/requests/fetchWithRetry';
import HopUtils from './hop';
import CBridgeUtils from './cbridge';
import Nxtp from './nxtp';
import Storage from './storage';
import { baseUrl } from './requests/utils';

const BRIDGES = ['hop', 'cbridge', 'connext'];

// hard-code for now, the HopSDK has "supportedChains", but let's integrate later.
const HOP_SUPPORTED_CHAINS = [1, 10, 100, 137, 42161];

const CBRIDGE_SUPPORTED_CHAINS = [1, 10, 56, 137, 250, 42161, 43114];

const CONNEXT_SUPPORTED_CHAINS = [1, 10, 56, 137, 100, 250, 42161, 43114];

// this is deprecated after API integration
const CONNEXT_SUPPORTED_BRIDGE_TOKENS = [
  'USDC',
  'USDT',
  'DAI',
  // TODO This is list is longer and is dynamically available per network pair.
  // Let's keep it simple for now
  // ... "MATIC", "ETH", "WBTC", "BNB"
];

// this is deprecated after API integration
// hard-code for now. I could not find this easily as a function in HopSDK
const HOP_SUPPORTED_BRIDGE_TOKENS = [
  'USDC',
  'USDT',
  'DAI',
  // TODO This is list is longer and is dynamically available per network pair.
  // Let's keep it simple for now
  // ... "MATIC", "ETH", "WBTC"
];

// this is deprecated after API integration
const CBRIDGE_SUPPORTED_BRIDGE_TOKENS = [
  'USDC',
  'USDT',
  // TODO This is list is longer and is dynamically available per network pair.
  // Let's keep it simple for now
  // ... "MATIC", "ETH", "WBTC"
];

export default {
  _signerAddress: '',
  _queue: {},
  _routes: {},
  _genericTxHistory: [],
  _activeTxHistory: [],

  async initialize() {},

  // this is deprecated after API integration - step 2
  getBridge(type) {
    if (type === 'hop') {
      return HopUtils;
    }
    if (type === 'cbridge') {
      return CBridgeUtils;
    }
    return Nxtp;
  },

  // this is deprecated after API integration - step 2
  getBridgeInterface(nonce) {
    const tx = this.getTx(nonce);

    const bridgeOption = tx.bridge?.route[0]?.bridge;

    if (bridgeOption === 'hop') {
      return HopUtils;
    }
    if (bridgeOption === 'cbridge') {
      return CBridgeUtils;
    }
    return Nxtp;
  },

  // will be deprecated after API integration - step 1
  supportedBridges(to, toChain, from, fromChain) {
    const bridges = [];
    const targetChainIds = [+toChain.chainId, +fromChain.chainId];
    const targetTokenIds = [to.symbol, from.symbol];

    // This also controls the order they appear in the UI

    if (targetChainIds.every((e) => CBRIDGE_SUPPORTED_CHAINS.includes(e))) {
      if (to.symbol === from.symbol && targetTokenIds.every((e) => CBRIDGE_SUPPORTED_BRIDGE_TOKENS.includes(e))) {
        bridges.push('cbridge');
      }
    }

    if (targetChainIds.every((e) => HOP_SUPPORTED_CHAINS.includes(e))) {
      if (to.symbol === from.symbol && targetTokenIds.every((e) => HOP_SUPPORTED_BRIDGE_TOKENS.includes(e))) {
        bridges.push('hop');
      }
    }

    if (targetChainIds.every((e) => CONNEXT_SUPPORTED_CHAINS.includes(e))) {
      // Connext always supported regardless of token due to the extra swap steps
      bridges.push('connext');
    }

    return bridges;
  },

  async getQuotes(to, toChainToRequest, from, fromChainToRequest, fromAdress, fromAmountBN, NonEvmAddress) {
    const toChainName = toChainToRequest.name === 'BNB Chain' ? 'bsc' : toChainToRequest.name.toLowerCase();
    const fromChainName = fromChainToRequest.name === 'BNB Chain' ? 'bsc' : fromChainToRequest.name.toLowerCase();

    const getQuote = await fetchWithRetry(
      `${baseUrl}/v0/transfer/quote?tokenSymbol=${
        from.symbol
      }&tokenAmount=${fromAmountBN.toString()}&fromTokenAddress=${
        from.address
      }&fromChain=${fromChainName}&fromChainId=${from.chainId}&toChain=${toChainName}&toChainId=${
        to.chainId
      }&fromUserAddress=${fromAdress}&toTokenAddress=${to.address}`,
      {},
      3,
    );

    const { routes, fromToken, fromChain, toToken, toChain } = getQuote;

    return { routes, fromToken, fromChain, toToken, toChain };
  },

  async buildNewAllEstimates({ to, toChain, from, fromChain, fromUserAddress, toUserAddress, fromAmountBN }) {
    const {
      routes,
      fromToken,
      fromChain: fromChainResp,
      toToken,
      toChain: toChainResp,
    } = await this.getQuotes(to, toChain, from, fromChain, fromUserAddress, fromAmountBN);

    const successfullEstimatesNew = routes.map((route) => {
      const generatedTransactionId = getRandomBytes32();

      const txData = {
        amountBN: fromAmountBN,
        bridge: route,
        estimate: {
          id: `${generatedTransactionId}`,
          transactionFee: route.quote?.destinationTxFee,
          returnAmount: route.quote?.amount,
          maxSlippage: 7497 /*check out this value afterwards*/,
        },
        receivingAddress: fromUserAddress,
        receivingAssetId: toToken.address,
        receivingChainId: toChainResp.chainId,
        sendingAssetId: fromToken.address,
        sendingChainId: fromChainResp.chainId,
      };

      this._queue[generatedTransactionId] = { ...txData };

      return txData;
    });

    return successfullEstimatesNew;
  },

  // remove after full integration of getQuotes - step 1
  // getAllEstimates(to, toChain, from, fromChain, amountBN, receivingAddress, amount) {
  //   const parentTransactionId = getRandomBytes32();
  //   this._routes[parentTransactionId] = {};

  //   const supportedBridges = this.supportedBridges(to, toChain, from, fromChain);

  //   // todo remove this map with response from the getQuote API
  //   return supportedBridges.map((bridgeType) => {
  //     const txData = {
  //       bridge: bridgeType,
  //       sendingChainId: +fromChain.chainId,
  //       sendingAssetId: from.address,
  //       receivingChainId: +toChain.chainId,
  //       receivingAssetId: to.address,
  //       amountBN,
  //       receivingAddress,
  //     };

  //     const childTransactionId = getRandomBytes32();
  //     this._routes[parentTransactionId][bridgeType] = _.extend({}, txData);
  //     this._queue[childTransactionId] = _.extend({}, txData);

  //     return this.getBridge(bridgeType)
  //       .getEstimate(
  //         childTransactionId,
  //         +fromChain.chainId,
  //         from.address,
  //         +toChain.chainId,
  //         to.address,
  //         amountBN,
  //         receivingAddress,
  //       )
  //       .then((estimate) => {
  //         this._routes[parentTransactionId][bridgeType].estimate = estimate;
  //         this._queue[childTransactionId].estimate = estimate;

  //         if (!estimate?.hasMinBridgeAmount) {
  //           this._routes[parentTransactionId][bridgeType] = null;
  //         }

  //         return this._routes[parentTransactionId][bridgeType];
  //       });
  //   });
  // },

  transferStepOne(transactionId) {
    const bridgeInterface = this.getBridgeInterface(transactionId);

    const tx = this.getTx(transactionId);

    return bridgeInterface.transferStepOne(tx, transactionId);
  },

  transferStepTwo(transactionId, txBridgeInternalId) {
    const bridgeInterface = this.getBridgeInterface(transactionId);
    const tx = this.getTx(transactionId);

    if (tx.bridge === 'cbridge') {
      return bridgeInterface.transferStepTwo(txBridgeInternalId);
    }

    return bridgeInterface.transferStepTwo(
      transactionId,
      tx.sendingChainId,
      tx.sendingAssetId,
      tx.receivingChainId,
      tx.receivingAssetId,
      tx.amountBN,
      tx.receivingAddress,
    );
  },

  twoStepTransferRequired(nonce) {
    const tx = this.getTx(nonce);

    if (!tx) {
      return false;
    }

    const bridgeName = tx.bridge?.route[0]?.bridge;

    return bridgeName === 'nxtp' || bridgeName === 'cbridge';
  },

  getTx(nonce) {
    return this._queue[nonce];
  },

  async getAllTxHistory() {
    // TODO: Implement Hop TxHistory

    const nxtpQueue = Nxtp.getAllHistoricalTxs();
    const cBridgeQueue = await CBridgeUtils.getTxHistory();

    this.buildGenericTxHistory(nxtpQueue, 'connext');
    this.buildGenericTxHistory(cBridgeQueue, 'cbridge');

    return this._genericTxHistory;
  },

  buildGenericTxHistory(bridgeTxHistory, bridge) {
    // TODO: Implement Hop TxHistory

    if (bridge === 'connext') {
      const genericTxHistoryNxtp = mappingToGenerateConnextArray({
        array: bridgeTxHistory,
      });

      this._genericTxHistory = genericTxHistoryNxtp;
    } else {
      const genericTxHistoryCbridge = mappingToGenerateArrayAnyBridge({
        array: bridgeTxHistory,
        bridge,
      });

      this._genericTxHistory = [...this._genericTxHistory, ...genericTxHistoryCbridge];
    }
  },

  async getAllActiveTxs() {
    const NON_ACTIVE_STATUS_CBRIDGE = [0, 2, 5, 10];

    const nxtpActiveTxs = mappingToGenerateConnextArray({
      array: await Nxtp.getAllActiveTxs(),
    });

    const cbridgeAllTxs = await CBridgeUtils.getTxHistory();

    const cbridgeActiveTxs = cbridgeAllTxs.filter((tx) => !NON_ACTIVE_STATUS_CBRIDGE.includes(tx.status));

    const cbridgeActiveTxsFormatted = mappingToGenerateArrayAnyBridge({
      array: cbridgeActiveTxs,
      bridge: 'cbridge',
    });

    return [...cbridgeActiveTxsFormatted, ...nxtpActiveTxs];
  },

  async getNumOfActiveBridgeTxs() {
    const numOfTxs = await this.getAllActiveTxs();
    return numOfTxs || [];
  },
};

const handleFinishActionOfActiveTx = {
  cbridge: {
    handleFinishAction: async (txId, estimated, sendingChainId) => {
      await CBridgeUtils.withdrawLiquidity(txId, estimated, sendingChainId);
    },
  },
  connext: {
    handleFinishAction: async (txId) => await Nxtp.transferStepTwo(txId),
  },
};

export { handleFinishActionOfActiveTx };
