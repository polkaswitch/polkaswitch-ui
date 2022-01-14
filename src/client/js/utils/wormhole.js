import { Connection } from "@solana/web3.js";

import { Signer } from "ethers";
import { parseUnits, zeroPad } from "ethers/lib/utils";

import {
  ChainId,
  CHAIN_ID_ETH,
  CHAIN_ID_SOLANA,
  CHAIN_ID_TERRA,
  CHAIN_ID_POLYGON,
  
  getEmitterAddressEth,
  getEmitterAddressSolana,
  getEmitterAddressTerra,
  
  parseSequenceFromLogEth,
  parseSequenceFromLogSolana,
  parseSequenceFromLogTerra,
  
  transferFromEth,
  transferFromEthNative,
  transferFromSolana,
  transferFromTerra,

  postVaaSolana,
  redeemOnEth,
  redeemOnEthNative,
  redeemOnSolana,
  redeemOnTerra,

} from "@certusone/wormhole-sdk";

import { hexToUint8Array, uint8ArrayToHex } from "./wormhole/array";
import { signSendAndConfirm } from "./wormhole/solana";
import { waitForTerraExecution } from "./wormhole/terra";

import {
  ETH_BRIDGE_ADDRESS,
  ETH_TOKEN_BRIDGE_ADDRESS,
  SOLANA_HOST,
  SOL_BRIDGE_ADDRESS,
  SOL_TOKEN_BRIDGE_ADDRESS,
  TERRA_TOKEN_BRIDGE_ADDRESS,
} from "./wormhole/consts";
import { getSignedVAAWithRetry } from "./wormhole/getSignedVAAWithRetry";

async function fromEth(
  signer,
  tokenAddress,
  decimals,
  amount,
  recipientChain,
  recipientAddress,
  isNative
) {
  const amountParsed = parseUnits(amount, decimals);
  const receipt = isNative
    ? await transferFromEthNative(
        ETH_TOKEN_BRIDGE_ADDRESS,
        signer,
        amountParsed,
        recipientChain,
        recipientAddress
      )
    : await transferFromEth(
        ETH_TOKEN_BRIDGE_ADDRESS,
        signer,
        tokenAddress,
        amountParsed,
        recipientChain,
        recipientAddress
      );
  const sequence = parseSequenceFromLogEth(receipt, ETH_BRIDGE_ADDRESS);
  const emitterAddress = getEmitterAddressEth(ETH_TOKEN_BRIDGE_ADDRESS);

  const { vaaBytes } = await getSignedVAAWithRetry(
    CHAIN_ID_ETH,
    emitterAddress,
    sequence.toString()
  );

  return uint8ArrayToHex(vaaBytes)

}

async function fromSolana(
  wallet,
  payerAddress, // TODO: we may not need this since we have wallet
  fromAddress,
  mintAddress,
  amount,
  decimals,
  targetChain,
  targetAddress,
  originAddressStr,
  originChain
) {
  const connection = new Connection(SOLANA_HOST, "confirmed");
  const amountParsed = parseUnits(amount, decimals).toBigInt();
  const originAddress = originAddressStr
    ? zeroPad(hexToUint8Array(originAddressStr), 32)
    : undefined;
  const transaction = await transferFromSolana(
    connection,
    SOL_BRIDGE_ADDRESS,
    SOL_TOKEN_BRIDGE_ADDRESS,
    payerAddress,
    fromAddress,
    mintAddress,
    amountParsed,
    targetAddress,
    targetChain,
    originAddress,
    originChain
  );
  const txid = await signSendAndConfirm(wallet, connection, transaction);

  const info = await connection.getTransaction(txid);
  if (!info) {
    throw new Error("An error occurred while fetching the transaction info");
  }
  const sequence = parseSequenceFromLogSolana(info);
  const emitterAddress = await getEmitterAddressSolana(
    SOL_TOKEN_BRIDGE_ADDRESS
  );

  const { vaaBytes } = await getSignedVAAWithRetry(
    CHAIN_ID_SOLANA,
    emitterAddress,
    sequence
  );
  return uint8ArrayToHex(vaaBytes)
}
  
async function fromTerra(
  wallet,
  asset,
  amount,
  decimals,
  targetChain,
  targetAddress
) {
  const amountParsed = parseUnits(amount, decimals).toString();
  const msgs = await transferFromTerra(
    wallet.terraAddress,
    TERRA_TOKEN_BRIDGE_ADDRESS,
    asset,
    amountParsed,
    targetChain,
    targetAddress
  );
  const result = await wallet.post({
    msgs: [...msgs],
    memo: "Wormhole - Initiate Transfer",
  });
  console.log(result);
  const info = await waitForTerraExecution(result);
  console.log(info);

  const sequence = parseSequenceFromLogTerra(info);
  console.log(sequence);
  if (!sequence) {
    throw new Error("Sequence not found");
  }
  const emitterAddress = await getEmitterAddressTerra(
    TERRA_TOKEN_BRIDGE_ADDRESS
  );
  console.log(emitterAddress);

  const { vaaBytes } = await getSignedVAAWithRetry(
    CHAIN_ID_TERRA,
    emitterAddress,
    sequence
  );
  return uint8ArrayToHex(vaaBytes)
}

export async function crossTransfer(
  sourceChain,
  sourceAsset,
  originChain,
  originAsset,
  amount,
  targetChain,
  targetAddress,
  signer,
  solanaWallet,
  terraWallet,
  sourceParsedTokenAccount
){
  console.log("Transfer ", amount)

  const decimals = sourceParsedTokenAccount?.decimals;
  
  const isNative = false;
  const solPK = solanaWallet.publicKey;
  const sourceTokenPublicKey = sourceParsedTokenAccount?.publicKey;
  let vaa = null
  if (
    sourceChain === CHAIN_ID_ETH &&
    !!signer &&
    !!sourceAsset &&
    decimals !== undefined &&
    !!targetAddress
  ) {
    vaa = await fromEth(

      signer,
      sourceAsset,
      decimals,
      amount,
      targetChain,
      targetAddress,
      isNative
    );
  } else if (
    sourceChain === CHAIN_ID_SOLANA &&
    !!solanaWallet &&
    !!solPK &&
    !!sourceAsset &&
    !!sourceTokenPublicKey &&
    !!targetAddress &&
    decimals !== undefined
  ) {
    vaa = await fromSolana(
      solanaWallet,
      solPK.toString(),
      sourceTokenPublicKey,
      sourceAsset,
      amount,
      decimals,
      targetChain,
      targetAddress,
      originAsset,
      originChain
    );
  } else if (
    sourceChain === CHAIN_ID_TERRA &&
    !!terraWallet &&
    !!sourceAsset &&
    decimals !== undefined &&
    !!targetAddress
  ) {
    vaa = await fromTerra(
      terraWallet,
      sourceAsset,
      amount,
      decimals,
      targetChain,
      targetAddress
    );
  } else {
    //   variant: "error",
    // });
  }
  return vaa
}


async function toEth(
  signer,
  signedVAA,
  isNative
) {
  const receipt = isNative
    ? await redeemOnEthNative(ETH_TOKEN_BRIDGE_ADDRESS, signer, signedVAA)
    : await redeemOnEth(ETH_TOKEN_BRIDGE_ADDRESS, signer, signedVAA);
  return { id: receipt.transactionHash, block: receipt.blockNumber }
}

async function toSolana(
  wallet,
  payerAddress, // TODO: we may not need this since we have wallet
  signedVAA
) {
  if (!wallet.signTransaction) {
    throw new Error("wallet.signTransaction is undefined");
  }
  const connection = new Connection(SOLANA_HOST, "confirmed");
  await postVaaSolana(
    connection,
    wallet.signTransaction,
    SOL_BRIDGE_ADDRESS,
    payerAddress,
    Buffer.from(signedVAA)
  );
  // TODO: how do we retry in between these steps
  const transaction = await redeemOnSolana(
    connection,
    SOL_BRIDGE_ADDRESS,
    SOL_TOKEN_BRIDGE_ADDRESS,
    payerAddress,
    signedVAA
  );
  const txid = await signSendAndConfirm(wallet, connection, transaction);
  // TODO: didn't want to make an info call we didn't need, can we get the block without it by modifying the above call?
  return { id: txid, block: 1 }
}

async function toTerra(
  wallet,
  signedVAA
) {
  const msg = await redeemOnTerra(
    TERRA_TOKEN_BRIDGE_ADDRESS,
    wallet.terraAddress,
    signedVAA
  );
  const result = await wallet.post({
    msgs: [msg],
    memo: "Wormhole - Complete Transfer",
  });
    return { id: result.result.txhash, block: result.result.height }
}

export async function redeemToken(
  targetChain,
  signedVAA,
  signer,
  solanaWallet,
  terraWallet,
){
  const solPK = solanaWallet?.publicKey;
  let res = null
  if (targetChain === CHAIN_ID_ETH && !!signer && signedVAA) {
    res = await toEth(signer, signedVAA, false);
  } else if (
    targetChain === CHAIN_ID_SOLANA &&
    !!solanaWallet &&
    !!solPK &&
    signedVAA
  ) {
    res = await toSolana(
      solanaWallet,
      solPK.toString(),
      signedVAA
    );
  } else if (targetChain === CHAIN_ID_TERRA && !!terraWallet && signedVAA) {
    res = await toTerra(terraWallet, signedVAA);
  } else {
    // enqueueSnackbar("Redeeming on this chain is not yet supported", {
    //   variant: "error",
    // });
  }
  return res
}
