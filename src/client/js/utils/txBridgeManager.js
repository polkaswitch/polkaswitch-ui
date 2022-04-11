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

const SUPPORTED_BRIDGE_TOKENS = [
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
  getBridgeInterface(nonce) {
    const tx = this.getTx(nonce);

    const bridgeOption = tx.bridge?.route[0]?.bridge;

    if (bridgeOption === 'hop') {
      return HopUtils;
    }
    if (bridgeOption === 'celer') {
      return CBridgeUtils;
    }
    return Nxtp;
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
          maxSlippage: route.route[0].maxSlippage || 7497 /*check out this value afterwards*/,
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

  transferStepOne(transactionId) {
    const bridgeInterface = this.getBridgeInterface(transactionId);

    const tx = this.getTx(transactionId);

    return bridgeInterface.transferStepOne(tx, transactionId);
  },

  transferStepTwo(transactionId, txBridgeInternalId) {
    const bridgeInterface = this.getBridgeInterface(transactionId);
    const tx = this.getTx(transactionId);

    if (tx.bridge?.route[0]?.bridge === 'celer') {
      return bridgeInterface.transferStepTwo(txBridgeInternalId);
    }

    return bridgeInterface.transferStepTwo(transactionId);
  },

  twoStepTransferRequired(nonce) {
    const tx = this.getTx(nonce);

    if (!tx) {
      return false;
    }

    const bridgeName = tx.bridge?.route[0]?.bridge;

    return bridgeName === 'nxtp' || bridgeName === 'celer';
  },

  getTx(nonce) {
    return this._queue[nonce];
  },

  async getAllTxHistory() {
    const nxtpQueue = Nxtp.getAllHistoricalTxs();
    const cBridgeQueue = await CBridgeUtils.getTxHistory();

    this.buildGenericTxHistory(nxtpQueue, 'connext');
    this.buildGenericTxHistory(cBridgeQueue, 'cbridge');

    return this._genericTxHistory;
  },

  buildGenericTxHistory(bridgeTxHistory, bridge) {
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
