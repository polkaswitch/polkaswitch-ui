export function createParsedTokenAccount(
  publicKey,
  mintKey,
  amount,
  decimals,
  uiAmount,
  uiAmountString,
  symbol,
  name,
  logo,
  isNativeAsset
) {
  return {
    publicKey,
    mintKey,
    amount,
    decimals,
    uiAmount,
    uiAmountString,
    symbol,
    name,
    logo,
    isNativeAsset,
  };
}

export function createNFTParsedTokenAccount(
  publicKey,
  mintKey,
  amount,
  decimals,
  uiAmount,
  uiAmountString,
  tokenId,
  symbol,
  name,
  uri,
  animationUrl,
  externalUrl,
  image,
  image256,
  nftName,
  description
) {
  return {
    publicKey,
    mintKey,
    amount,
    decimals,
    uiAmount,
    uiAmountString,
    tokenId,
    uri,
    animation_url:animationUrl,
    external_url:externalUrl,
    image,
    image_256:image256,
    symbol,
    name,
    nftName,
    description,
  };
}