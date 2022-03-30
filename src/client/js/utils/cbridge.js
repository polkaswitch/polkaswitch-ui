/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable no-return-await */
/* eslint-disable camelcase */
// Celer doc: https://cbridge-docs.celer.network/developer/cbridge-sdk
import { Contract } from '@ethersproject/contracts';
import _ from 'underscore';
import { BigNumber, constants } from 'ethers';
import { base64, getAddress, hexlify } from 'ethers/lib/utils';
import BN from 'bignumber.js';
import HttpUtilis from './http';
import EventManager from './events';
import Wallet from './wallet';
import TokenListManager from './tokenList';
import { abi as BridgeABI } from '../../../contract/celer_contract/Bridge.json';

import { WithdrawReq, WithdrawType } from '../../../contract/celer_contract/factories/ts-proto/sgn/cbridge/v1/tx_pb';

const TokenABI = require('../../../contract/ERC20.json');

window.CBridgeUtils = {
  _client: false,

  _activeTxs: [],
  _historicalTxs: [],
  _isFinishedRefund: false,

  async initialize() {
    EventManager.listenFor('walletUpdated', this.resetClient.bind(this));

    if (Wallet.isConnected()) {
      this._client = await this.initializeClient();
    }
  },

  isClientInitialized() {
    return !!this._client;
  },

  async initializeClient() {
    // Test celer hostname: https://cbridge-v2-test.celer.network
    const client = (this._client = HttpUtilis.initHttp('https://cbridge-prod2.celer.network'));
    this._attachClientListeners(client);
    return client;
  },

  resetClient() {
    console.log('Celer Bridge grpc client reset');

    this._client = false;
    this._activeTxs = [];
    this._historicalTxs = [];
  },

  _attachClientListeners(_client) {
    if (!_client) {
    }
  },

  isSupportedAsset(sendingAssetId) {
    return true;
  },

  async isSupportedNetwork(network) {
    if (!this._client) {
      this._client = await this.initializeClient();
    }

    const config = await this.getTransferConfig();
    const { chains } = JSON.parse(config);
    return chains.some((e) => e.name.toLowerCase() === network.name.toLowerCase());
  },

  async getTransferConfig() {
    if (!Wallet.isConnected()) {
      console.error('cbridge: Wallet not connected');
      return false;
    }

    if (!this._client) {
      this._client = await this.initializeClient();
    }

    const transferConfig = await this._client.get('/v2/getTransferConfigs', null);
    return transferConfig.data;
  },

  async transferStepOne(tx, transactionId) {
    const { sendingChainId, sendingAssetId, receivingChainId, receivingAssetId, amountBN, receivingAddress, estimate } =
      tx;

    const { maxSlippage } = estimate;

    if (!Wallet.isConnected()) {
      console.error('CBridge: Wallet not connected');
      return false;
    }

    if (!this._client) {
      this._client = await this.initializeClient();
    }

    console.log('CBridge: Start transfer step one');
    const sendingAsset = TokenListManager.findTokenById(sendingAssetId);
    const amountToApprove = constants.MaxUint256;
    const signer = Wallet.getProvider().getSigner();

    const tokenContract = new Contract(sendingAsset.address, TokenABI, signer);
    const bridgeContractAddr = await this.findBridgeContractAddress(sendingChainId);

    console.debug('CBridge: start approving token');
    // STEP 1.1: Approve token
    const ownerAddress = await signer.getAddress();

    const allowance = await tokenContract.allowance(ownerAddress, bridgeContractAddr);

    let approveTx;

    if (allowance.lt(amountBN)) {
      approveTx = await tokenContract.approve(bridgeContractAddr, amountToApprove);
    }

    console.log('Cbridge Approved TX: ', approveTx);
    // STEP 1.2: sign transaction in the contract
    const bridgeContract = new Contract(bridgeContractAddr, BridgeABI, signer);

    const nonce = Date.now();

    await bridgeContract.send(ownerAddress, sendingAsset.address, amountBN, receivingChainId, nonce, maxSlippage);

    // ethereum generation hash with cBridge on-chain send tx params
    const transfer_id = window.ethers.utils.solidityKeccak256(
      ['address', 'address', 'address', 'uint256', 'uint64', 'uint64', 'uint64'],
      [
        Wallet.currentAddress(), /// User's wallet address,
        Wallet.currentAddress(), /// User's wallet address,
        sendingAsset.address, /// ETH / ERC20 token address
        amountBN.toString(), /// Send amount in String
        receivingChainId.toString(), /// Destination chain id
        nonce.toString(), /// Nonce
        sendingChainId.toString(), /// Source chain id
      ],
    );

    return {
      transferId: transfer_id,
      cbridge: true,
    };
  },

  async getTxHistory() {
    if (!this._client) {
      this._client = await this.initializeClient();
    }

    const config = {
      params: {
        addr: Wallet.currentAddress(),
        page_size: 15,
      },
    };

    const response = await this._client.get('/v2/transferHistory', config);

    return response.data.history;
  },

  async transferStepTwo(transferId) {
    const response = await this._client.post('/v2/getTransferStatus', {
      transfer_id: transferId,
    });
    return response;
  },

  async findBridgeContractAddress(sendingChainId) {
    const transferConfig = await this.getTransferConfig();
    const chainInfos = transferConfig.chains;
    const chainInfo = _.find(chainInfos, (c) => c.id === parseInt(sendingChainId));
    if (!chainInfo) {
      console.error('WARN: Cannot find celer bridge contract address');
    }

    return chainInfo.contract_addr;
  },

  async withdrawLiquidity(transferId, estimated, sendingChainId) {
    const nonce = Math.floor(Date.now() / 1000);

    const withdrawReqProto = new WithdrawReq();
    withdrawReqProto.setReqId(nonce);
    withdrawReqProto.setXferId(transferId);
    withdrawReqProto.setWithdrawType(WithdrawType.WITHDRAW_TYPE_REFUND_TRANSFER);

    const bytes = await this.signForWithdrawTx(withdrawReqProto);

    let resp;
    try {
      resp = await this._client.post('/v2/withdrawLiquidity ', {
        withdraw_req: base64.encode(withdrawReqProto.serializeBinary() || ''),
        sig: base64.encode(bytes || ''),
        estimate_received_amt: estimated,
        method_type: 'WD_METHOD_TYPE_ONE_RM',
      });
    } catch (e) {
      console.error(e);
      return false;
    }

    this.cbridgePolling = window.setInterval(() => this.handleCbridgeEventToRefund(transferId, sendingChainId), 40000);
  },

  async signForWithdrawTx(withdrawReqProto) {
    const signer = Wallet.getProvider().getSigner();

    let sig;
    try {
      sig = await signer.signMessage(
        window.ethers.utils.arrayify(window.ethers.utils.keccak256(withdrawReqProto.serializeBinary())),
      );
    } catch (error) {
      console.log(error);
    }

    const bytes = window.ethers.utils.arrayify(sig);

    return bytes;
  },

  async handleCbridgeEventToRefund(transferId, sendingChainId) {
    console.log('cBridge refund Started');

    const currentStatusResp = await this._client.post('/v2/getTransferStatus', {
      transfer_id: transferId,
    });

    const { powers: _powers, signers: _signers, sorted_sigs, wd_onchain, status } = currentStatusResp.data;

    const wdmsg = base64.decode(wd_onchain);

    const signers = _signers.map((item) => {
      const decodeSigners = base64.decode(item);
      const hexlifyObj = hexlify(decodeSigners);
      return getAddress(hexlifyObj);
    });

    const sigs = sorted_sigs.map((item) => {
      return base64.decode(item);
    });

    const powers = _powers.map((item) => {
      return base64.decode(item);
    });

    if (status === 8) {
      const bridgeContractAddr = await this.findBridgeContractAddress(sendingChainId);

      const bridgeContract = new Contract(bridgeContractAddr, BridgeABI, Wallet.getProvider().getSigner());

      const txWithdrawOnChain = await bridgeContract.withdraw(wdmsg, sigs, signers, powers);

      this.stopPollingCbridge();

      this._isFinishedRefund = true;
    }
  },

  async stopPollingCbridge() {
    window.clearInterval(this.cbridgePolling);
  },
};

export default window.CBridgeUtils;
