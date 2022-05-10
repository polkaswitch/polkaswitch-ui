import { Account, clusterApiUrl, Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import EventManager from './events';
import { TokenListProvider, ENV as ChainID, TokenInfo } from '@solana/spl-token-registry';
export const SOLANA_CHAIN_ID = 0;
export const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";
export const NATIVE_SOL_MINT = "11111111111111111111111111111111";
export function isSolananAddress(address) {
  try{
      new PublicKey(address);
      return true;
  } catch(error) {
      return false;
  }
}

export const  MintParser = (pubKey, info) => {
  const buffer = Buffer.from(info.data);

  const data = deserializeMint(buffer);

  const details = {
    pubkey: pubKey,
    account: {
      ...info,
    },
    info: data,
  };

  return details;
};

const CURRENT_CHAIN = {
    name: 'mainnet-beta',
    endpoint: 'https://solana-api.projectserum.com',
    chainID: ChainID.MainnetBeta,
};
const connection = new Connection(CURRENT_CHAIN.endpoint, 'recent');

window.SolanaWallet = {

  getConnection: function () {
    return connection;
  },

  _walletKey: undefined,
  _connected: false,
  _listenerId: undefined,
  _tokenMap: undefined,
  _tokens: [],
  _mintInfos: undefined,

  setWalletAddress: function(key) {
    this._walletKey = key;
  },
  getWalletAddress: function() {
    return  this._walletKey;
  },

  setConnected: function(connected) {
    this._connected = connected;
  },
  isConnected: function () {
    return this._connected;
  },

  setTokenAccounts: function(accounts) {
    this._tokens = accounts;
    console.log('Updating Solana Wallet Balance');
    EventManager.emitEvent('walletUpdated', 1);
  },

  getAccountByMint: function(mint) {
    const index = this._tokens.findIndex((acc) => acc.info.mint.toBase58() === mint);
    if (index !== -1) {
      return this._tokens[index].info;
    }
    return null;
  }
};

export default window.SolanaWallet;

/*
fetch('https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json')
  .then(function (response) {
    return response.json()
  })
  .then(function (myJson) {
    const tokens: any[] = []
    myJson.tokens.forEach((itemToken: any) => {
      tokens.push({
        address: itemToken.address,
        chainId: 0,
        decimals: itemToken.decimals,
        logoURI: itemToken.logoURI,
        name: itemToken.name,
        symbol: itemToken.symbol
      })
    })
    console.log(tokens)
  })
*/