/* eslint-disable require-jsdoc */
import { ChainData } from "@connext/nxtp-utils";
import { BigNumber, constants, Contract, providers, Signer, utils } from "ethers";

const TestTokenABI = [
  // Read-Only Functions
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",

  // Authenticated Functions
  "function transfer(address to, uint amount) returns (boolean)",
  "function mint(address account, uint256 amount)",
];

export const mintTokens = async (signer, assetId) => {
  const signerAddress = await signer.getAddress();
  const contract = new Contract(assetId, TestTokenABI, signer);
  const response = await contract.mint(signerAddress, utils.parseEther("1000"));
  return response;
};

export const getBalance = async (
  address,
  assetId,
  provider,
) => {
  let balance;
  if (assetId === constants.AddressZero) {
    balance = await provider.getBalance(address);
  } else {
    const contract = new Contract(assetId, TestTokenABI, provider);
    balance = await contract.balanceOf(address);
  }
  return balance;
};

export const getChainName = (chainId, chainData) => {
  const chain = chainData.find((chain) => chain?.chainId === chainId);
  return chain?.name ?? chainId.toString();
};

export const getExplorerLinkForTx = (tx, chainId, chainData) => {
  const explorer = chainData.find((data) => data.chainId === chainId)?.explorers[0]?.url;
  return explorer ? `${explorer}/tx/${tx}` : "#";
};

export const getExplorerLinkForAddress = (address, chainId, chainData) => {
  const explorer = chainData.find((data) => data.chainId === chainId)?.explorers[0]?.url;
  return explorer ? `${explorer}/address/${address}` : "#";
};
