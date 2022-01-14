import { Connection, PublicKey } from "@solana/web3.js";
import {
  CHAIN_ID_ETH,
  CHAIN_ID_SOLANA,
} from "@certusone/wormhole-sdk";
import { zeroPad } from "@ethersproject/bytes";
import { uint8ArrayToHex, hexToUint8Array } from "./wormhole/array";
import {crossTransfer, redeemToken} from './wormhole' ;
import { TokenAmount } from "./safe-math";
import Wallet from './wallet';

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

export const NATIVE_SOL = {
  symbol: "SOL",
  name: "Native Solana",
  mintAddress: "11111111111111111111111111111111",
  decimals: 9,
  tags: ["raydium"],
};


export async function findProgramAddress(seeds, programId) {
  const [publicKey, nonce] = await PublicKey.findProgramAddress(seeds, programId)
  return { publicKey, nonce }
}

export async function findAssociatedTokenAddress(walletAddress, tokenMintAddress) {
  const { publicKey } = await findProgramAddress(
    [walletAddress.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), tokenMintAddress.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )
  return publicKey
}

export async function getSolanaTokenAccounts(conn, wallet){
    if (wallet && wallet.connected) {
        const parsedTokenAccounts = await conn.getParsedTokenAccountsByOwner(
          wallet.publicKey,
          {
            programId: TOKEN_PROGRAM_ID,
          },
          "confirmed"
        );
    
        const tokenAccounts = {};
        const auxiliaryTokenAccounts = [];
    
        for (const tokenAccountInfo of parsedTokenAccounts.value) {
          const tokenAccountPubkey = tokenAccountInfo.pubkey;
          const tokenAccountAddress = tokenAccountPubkey.toBase58();
          const parsedInfo = tokenAccountInfo.account.data.parsed.info;
          const mintAddress = parsedInfo.mint;
          const balance = new TokenAmount(
            parsedInfo.tokenAmount.amount,
            parsedInfo.tokenAmount.decimals
          );
    
          const ata = await findAssociatedTokenAddress(
            wallet.publicKey,
            new PublicKey(mintAddress)
          );
    
          if (ata.equals(tokenAccountPubkey)) {
            tokenAccounts[mintAddress] = {
              tokenAccountAddress,
              balance: balance.fixed(),
              parsedInfo,
            };
          } else if (parsedInfo.tokenAmount.uiAmount > 0) {
            auxiliaryTokenAccounts.push(tokenAccountInfo);
          }
        }
    
        const solBalance = await conn.getBalance(wallet.publicKey, "confirmed");
        tokenAccounts[NATIVE_SOL.mintAddress] = {
          tokenAccountAddress: wallet.publicKey.toBase58(),
          balance: new TokenAmount(solBalance, NATIVE_SOL.decimals).fixed(),
        };

        return tokenAccounts;

    } // end of if
}

export async function transferFromSOL2ETH(solanaWallet){
  
  var connection = new Connection('https://solana-api.projectserum.com');
  var splWeUSDT = new PublicKey('Dn4noZ5jgGfkntzcQSUZ8czkreiZ1ForXYoV2H8Dm7S1');

  var tokenAccounts = await getSolanaTokenAccounts(connection, solanaWallet);
  var usdtToken = tokenAccounts[splWeUSDT];
  console.log(usdtToken);

  usdtToken.publicKey = usdtToken.tokenAccountAddress;
  var erc20USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  usdtToken.decimals = 6;

  var sourceChain = CHAIN_ID_SOLANA; // source chain
  var sourceAsset = splWeUSDT; // source asset
  
  // from SPL wUSDTv2 ->ERC20 USDT
  var originChain = CHAIN_ID_ETH; 
  var originAsset = uint8ArrayToHex(zeroPad(hexToUint8Array(erc20USDT.slice(2)), 32)) // origin asset  will be changed by the token mint

  var amount = '0.5'; // amount
  var targetChain = CHAIN_ID_ETH; // target chain
  
  var targetAddress = zeroPad(hexToUint8Array(Wallet.currentAddress().slice(2)), 32) // target address
  
  var signer = Wallet.getProvider().getSigner(); // signer 
  var terraWallet = null; // terra wallet
  var sourceParsedTokenAccount = usdtToken; // source parsed token account

  var singedVAA = await crossTransfer(
    sourceChain, // source chain
    
    sourceAsset, // source asset
    originChain, // origin chain
    
    originAsset, // origin asset
    amount, // amount
    targetChain, // target chain
    
    targetAddress, // target address
    signer, // signer 
    solanaWallet, // solana wallet
    terraWallet, // terra wallet
    sourceParsedTokenAccount // source parsed token account
  );
}

export async function transferFromETH2SOL(){
    
}