import { Connection, Message, PublicKey, Keypair, Transaction, TransactionInstruction } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ENV as ChainID } from '@solana/spl-token-registry';
import bs58 from 'bs58';
import EventManager from './events';

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

const COMMITMENT = 'confirmed';

const CURRENT_CHAIN = {
    name: 'mainnet-beta',
    endpoint: 'https://solana-api.projectserum.com',
    chainID: ChainID.MainnetBeta,
};
const connection = new Connection(CURRENT_CHAIN.endpoint, COMMITMENT);

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
  currentAddress: function() {
    return  this._walletKey;
  },
  ataAddress: function(mint) {
    const [ata] = PublicKey.findProgramAddressSync(
      [new PublicKey(this.currentAddress()).toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), new PublicKey(mint).toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return ata.toString();
  },
  setConnected: function(connected) {
    this._connected = connected;
  },
  isConnected: function () {
    return this._connected;
  },

  setTokenAccounts: function(accounts) {
    this._tokens = accounts;
    console.log('Updating Solana Wallet Balance', accounts);
    EventManager.emitEvent('walletUpdated', 1);
  },

  getAccountByMint: function(mint) {
    const index = this._tokens.findIndex((acc) => acc.info.mint.toBase58() === mint);
    if (index !== -1) {
      return this._tokens[index].info;
    }
    return null;
  },
  buildTransactionFromMessage: function (msgData) {
    const msg = Message.from(Buffer.from(msgData, 'hex'));
    const tx = new Transaction();

    msg.instructions.forEach((ix) => {
      tx.add(
        new TransactionInstruction({
          keys: ix.accounts.map((acc_index) => {
            return { 
              pubkey: msg.accountKeys[acc_index],
              isSigner: msg.isAccountSigner(acc_index),
              isWritable: msg.isAccountWritable(acc_index)
            };
          }),
          data: bs58.decode(ix.data),
          programId:  msg.accountKeys[ix.programIdIndex]
        })
      )
    })
    return tx;
  },

  signAndSendTransactionWithRetry: async function(tx, signers, maxRetries = 3) {
    let txId ;
  
    let currentRetries = 0;
    while (currentRetries < maxRetries) {
      try {
        tx.feePayer = new PublicKey(this.currentAddress());
        tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    
        tx.setSigners(new PublicKey(this.currentAddress()), ...signers.map((s) => s.publicKey));
        if(signers.length > 0)
          tx.partialSign(...signers);
    
        const signedTx = await window.solana.signTransaction(tx);
        const rawTransaction = signedTx.serialize();
    
        txId = await connection.sendRawTransaction(rawTransaction, {
          skipPreflight: true,
          preflightCommitment: COMMITMENT,
        });
        console.log(txId);
        await connection.confirmTransaction(txId, COMMITMENT);

        break;
      } catch (e) {
        console.error(e);
        currentRetries++;
      }
    }
    return txId;
  },

  sendTransactionMessage: async function(datas) {
    const txIds = []

    for(const data of datas){
      const txData = data.txData;
      const tx = this.buildTransactionFromMessage(txData);

      const signers = data.signers.map((signerStr) => {
        const keypair = signerStr.split(',').map((item) => +item);
        return Keypair.fromSecretKey(new Uint8Array(keypair))
      });
      const txId = await this.signAndSendTransactionWithRetry(tx, signers);
      txIds.push(txId);
    }

    return txIds.join('-');
  }
};

export default window.SolanaWallet;