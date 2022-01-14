import { MintLayout } from "@solana/spl-token";
// import { WalletContextState } from "@solana/wallet-adapter-react";
import {
  AccountInfo,
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";

export async function signSendAndConfirm(
  wallet,
  connection,
  transaction
) {
  if (!wallet.signTransaction) {
    throw new Error("wallet.signTransaction is undefined");
  }
  const signed = await wallet.signTransaction(transaction);
  const txid = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(txid);
  return txid;
}

export function extractMintAuthorityInfo(
  account
){
  const data = Buffer.from(account.data);
  const mintInfo = MintLayout.decode(data);

  const uintArray = mintInfo?.mintAuthority;
  const pubkey = new PublicKey(uintArray);
  const output = pubkey?.toString();

  return output || null;
}

export function getMultipleAccountsRPC(
  connection,
  pubkeys
){
  return getMultipleAccounts(connection, pubkeys, "confirmed");
}

export const getMultipleAccounts = async (
  connection,
  pubkeys,
  commitment
) => {
  return (
    await Promise.all(
      chunks(pubkeys, 99).map((chunk) =>
        connection.getMultipleAccountsInfo(chunk, commitment)
      )
    )
  ).flat();
};

export function chunks(array, size) {
  return Array.apply(
    0,
    new Array(Math.ceil(array.length / size))
  ).map((_, index) => array.slice(index * size, (index + 1) * size));
}

export function shortenAddress(address) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
