import _ from 'underscore';
import { BigNumber, constants, providers, Signer, utils } from 'ethers';
import { getRandomBytes32 } from '@connext/nxtp-utils';
import { mappingToGenerateConnextArray, mappingToGenerateArrayAnyBridge } from './bridgeManagerMappings';
import fetchWithRetry from '../utils/requests/fetchWithRetry';
import HopUtils from './hop';
import CBridgeUtils from './cbridge';
import Nxtp from './nxtp';
import Storage from './storage';
import { baseUrl, chainNameHandler, encodeQueryString } from './requests/utils';

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
    const toChainName = chainNameHandler(toChainToRequest.name);
    const fromChainName = chainNameHandler(fromChainToRequest.name);

    const queryStrings = encodeQueryString({
      tokenSymbol: from.symbol,
      toTokenSymbol: to.symbol,
      tokenAmount: fromAmountBN.toString(),
      fromTokenAddress: from.address,
      fromChain: fromChainName,
      fromChainId: from.chainId,
      toChainId: to.chainId,
      toTokenAddress: to.address,
      fromUserAddress: fromAdress,
      toChain: toChainName,
    });

    const getQuote = await fetchWithRetry(`${baseUrl}/v0/transfer/quote${queryStrings}`, {}, 3);

    const { routes, fromToken, fromChain, toToken, toChain } = getQuote;

    return { routes, fromToken, fromChain, toToken, toChain };
  },

  async checkAllowance({ bridge, fromAddress, fromChain, from }) {
    const { chainId, address, symbol, decimals } = from;

    const queryStrings = encodeQueryString({
      tokenSymbol: symbol,
      bridge,
      tokenAddress: address,
      fromChain,
      fromChainId: chainId,
      fromAddress,
    });

    const getAllowance = await fetchWithRetry(`${baseUrl}/v0/transfer/allowance${queryStrings}`, {}, 3);

    const { allowance } = getAllowance;
    let allowanceFormatted = window.ethers.utils.formatUnits(allowance, decimals);

    return { allowanceFormatted, allowance };
  },

  async sendTransfer({ fromAddress, fromChain, from, to, toChain, route, fromAmount }) {
    const { chainId: fromChainId, address: fromTokenAddress, symbol, decimals } = from;
    const { chainId: toChainId } = to;

    const toChainName = chainNameHandler(toChain);
    const fromChainName = chainNameHandler(fromChain);

    const fromAmountBN = window.ethers.utils.parseUnits(fromAmount, decimals);

    const sendTransferResp = await fetchWithRetry(
      `${baseUrl}/v0/transfer/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenSymbol: symbol,
          toTokenSymbol: to.symbol,
          tokenAmount: fromAmountBN.toString(),
          fromChain: fromChainName,
          fromChainId,
          fromTokenAddress,
          fromUserAddress: fromAddress,
          toChain: toChainName,
          toChainId,
          route: [route],
        }),
      },
      3,
    );

    console.log('new', { sendTransferResp });

    const {
      tx: { from: fromNxtpTemp, to: toNxtpTemp, data },
      tx,
    } = sendTransferResp;

    try {
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ data, to: toNxtpTemp, from: fromNxtpTemp }],
      });
      return { txHash, tx, fromNxtpTemp, toNxtpTemp, data };
    } catch (e) {
      console.error('error to send transfer', e);
    }
  },

  async getTransferStatus({ id, userAddress, toChain, fromChain, from, bridge, to }) {
    const { chainId: fromChainId } = from;
    const { chainId: toChainId } = to;

    const toChainName = chainNameHandler(toChain);
    const fromChainName = chainNameHandler(fromChain);

    const queryStrings = encodeQueryString({
      userAddress: userAddress,
      txId: id,
      bridge,
      fromChain: fromChainName,
      fromChainId: fromChainId,
      toChainId,
      toChain: toChainName,
    });

    const getTransferStatusRequest = await fetchWithRetry(`${baseUrl}/v0/transfer/status${queryStrings}`, {}, 3);

    return getTransferStatusRequest;
  },

  async approveToken({ bridge, fromAddress, to, toChain, fromChain, fromAmount, from }) {
    const { chainId: fromChainId, address, symbol, decimals } = from;
    const { chainId: toChainId } = to;

    const toChainName = chainNameHandler(toChain);
    const fromChainName = chainNameHandler(fromChain);

    const fromAmountBN = window.ethers.utils.parseUnits(fromAmount, decimals);

    const queryStrings = encodeQueryString({
      tokenSymbol: symbol,
      tokenAddress: address,
      bridge,
      fromChain: fromChainName,
      fromChainId,
      toChainId,
      toChain: toChainName,
      fromAddress,
      tokenAmount: fromAmountBN.toString(),
    });

    const getApprove = await fetchWithRetry(`${baseUrl}/v0/transfer/approve${queryStrings}`, {}, 3);

    const { from: fromApprove, to: toApprove, data } = getApprove;

    try {
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ data, to: toApprove, from: fromApprove }],
      });

      return txHash;
    } catch (e) {
      console.log('error', e);
    }
  },

  async signTransaction({ bridge, txId, userAddress }) {
    const signTransactionResp = await fetchWithRetry(
      `${baseUrl}/v0/transfer/sign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bridge,
          txId,
          userAddress,
          useNativeTokenToClaim,
        }),
      },
      3,
    );

    const { hash, relayerFee, useNativeTokenToClaim } = signTransactionResp;

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [hash, userAddress],
      });
      return { hash, relayerFee, useNativeTokenToClaim, signature };
    } catch (e) {
      console.log('Signing error:', e);
    }
  },

  async claimTokens({ fromChain, toChain, userAddress, txId, signature, bridge, relayerFee, useNativeTokenToClaim }) {
    const claimTokensResp = await fetchWithRetry(
      `${baseUrl}/v0/transfer/claim`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromChain,
          toChain,
          userAddress,
          txId,
          signature,
          relayerFee,
          useNativeTokenToClaim,
          bridge,
        }),
      },
      3,
    );

    return { claimTokensResp };
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
