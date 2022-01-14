// eslint-disable-next-line camelcase
import {   NFTImplementation,   NFTImplementation__factory,  TokenImplementation,   TokenImplementation__factory, } from "@certusone/wormhole-sdk";
import { ethers } from "ethers";
import { arrayify, formatUnits } from "ethers/lib/utils";
import {
  createNFTParsedTokenAccount,
  createParsedTokenAccount,
} from "./useGetSourceParsedTokenAccounts";

// This is a valuable intermediate step to the parsed token account, as the token has metadata information on it.
export function getEthereumToken(
  tokenAddress,
  provider
) {
  const token = TokenImplementation__factory.connect(tokenAddress, provider);
  return token;
}

export async function ethTokenToParsedTokenAccount(
  token,
  signerAddress
) {
  const decimals = await token.decimals();
  const balance = await token.balanceOf(signerAddress);
  const symbol = await token.symbol();
  const name = await token.name();
  return createParsedTokenAccount(
    signerAddress,
    token.address,
    balance.toString(),
    decimals,
    Number(formatUnits(balance, decimals)),
    formatUnits(balance, decimals),
    symbol,
    name
  );
}

// This is a valuable intermediate step to the parsed token account, as the token has metadata information on it.
export function getEthereumNFT(
  tokenAddress,
  provider
) {
  const token = NFTImplementation__factory.connect(tokenAddress, provider);
  return token;
}

export async function isNFT(token) {
  const erc721 = "0x80ac58cd";
  const erc721metadata = "0x5b5e139f";
  const supportsErc721 = await token.supportsInterface(arrayify(erc721));
  const supportsErc721Metadata = await token.supportsInterface(
    arrayify(erc721metadata)
  );
  return supportsErc721 && supportsErc721Metadata;
}

export async function ethNFTToNFTParsedTokenAccount(
  token,
  tokenId,
  signerAddress
) {
  const decimals = 0;
  const balance = (await token.ownerOf(tokenId)) === signerAddress ? 1 : 0;
  const symbol = await token.symbol();
  const name = await token.name();
  const uri = await token.tokenURI(tokenId);
  return createNFTParsedTokenAccount(
    signerAddress,
    token.address,
    balance.toString(),
    decimals,
    Number(formatUnits(balance, decimals)),
    formatUnits(balance, decimals),
    tokenId,
    symbol,
    name,
    uri
  );
}

export function isValidEthereumAddress(address) {
  return ethers.utils.isAddress(address);
}
