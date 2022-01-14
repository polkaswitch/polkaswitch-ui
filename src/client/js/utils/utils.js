/* eslint-disable no-bitwise */
/* eslint-disable no-restricted-properties */
/* eslint-disable no-nested-ternary */
import { useCallback, useState } from 'react';
import { MintInfo } from '@solana/spl-token';

import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { TokenInfo } from '@solana/spl-token-registry';
import { WAD, ZERO } from '../constants';

// export KnownTokenMap = Map<string, TokenInfo>;

export const formatPriceNumber = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 8,
});
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function useLocalStorageState(key, defaultState) {
  const [state, setState] = useState(() => {
    // NOTE: Not sure if this is ok
    const storedState = localStorage.getItem(key);
    if (storedState) {
      return JSON.parse(storedState);
    }
    return defaultState;
  });

  const setLocalStorageState = useCallback(
    (newState) => {
      const changed = state !== newState;
      if (!changed) {
        return;
      }
      setState(newState);
      if (newState === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(newState));
      }
    },
    [state, key]
  );

  return [state, setLocalStorageState];
}

// shorten the checksummed version of the input address to have 4 characters at start and end
export function shortenAddress(address, chars = 4) {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getTokenName(map, mint, shorten = true) {
  const mintAddress = typeof mint === 'string' ? mint : mint?.toBase58();

  if (!mintAddress) {
    return 'N/A';
  }

  const knownSymbol = map.get(mintAddress)?.symbol;
  if (knownSymbol) {
    return knownSymbol;
  }

  return shorten ? `${mintAddress.substring(0, 5)}...` : mintAddress;
}

export function getTokenByName(tokenMap, name) {
  let token = null;
  for (const val of tokenMap.values()) {
    if (val.symbol === name) {
      token = val;
      break;
    }
  }
  return token;
}

export function getTokenIcon(map, mintAddress) {
  const address = typeof mintAddress === 'string' ? mintAddress : mintAddress?.toBase58();
  if (!address) {
    return;
  }

  return map.get(address)?.logoURI;
}

export function isKnownMint(map, mintAddress) {
  return !!map.get(mintAddress);
}

export const STABLE_COINS = new Set(['USDC', 'wUSDC', 'USDT']);

export function chunks(array, size) {
  return Array.apply(0, new Array(Math.ceil(array.length / size))).map((_, index) =>
    array.slice(index * size, (index + 1) * size)
  );
}

export function toLamports(account, mint) {
  if (!account) {
    return 0;
  }

  const amount = typeof account === 'number' ? account : account.info.amount?.toNumber();

  const precision = Math.pow(10, mint?.decimals || 0);
  return Math.floor(amount * precision);
}

export function wadToLamports(amount) {
  return amount?.div(WAD) || ZERO;
}

export function fromLamports(account, mint, rate = 1.0) {
  if (!account) {
    return 0;
  }

  const amount = Math.floor(
    typeof account === 'number' ? account : BN.isBN(account) ? account.toNumber() : account.info.amount.toNumber()
  );

  const precision = Math.pow(10, mint?.decimals || 0);
  return (amount / precision) * rate;
}

const SI_SYMBOL = ['', 'k', 'M', 'G', 'T', 'P', 'E'];

const abbreviateNumber = (number, precision) => {
  const tier = (Math.log10(number) / 3) | 0;
  let scaled = number;
  const suffix = SI_SYMBOL[tier];
  if (tier !== 0) {
    const scale = Math.pow(10, tier * 3);
    scaled = number / scale;
  }

  return scaled.toFixed(precision) + suffix;
};

export const formatAmount = (val, precision = 6, abbr = true) =>
  abbr ? abbreviateNumber(val, precision) : val.toFixed(precision);

export function formatTokenAmount(
  account,
  mint,
  rate = 1.0,
  prefix = '',
  suffix = '',
  precision = 6,
  abbr = false
) {
  if (!account) {
    return '';
  }

  return `${[prefix]}${formatAmount(fromLamports(account, mint, rate), precision, abbr)}${suffix}`;
}

export const formatUSD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export const numberFormatter = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const isSmallNumber = (val) => {
  return val < 0.001 && val > 0;
};

export const formatNumber = {
  format: (val, useSmall) => {
    if (!val) {
      return '--';
    }
    if (useSmall && isSmallNumber(val)) {
      return 0.001;
    }

    return numberFormatter.format(val);
  },
};

export const feeFormatter = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 9,
});

export const formatPct = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function convert(account, mint, rate = 1.0) {
  if (!account) {
    return 0;
  }

  const amount = typeof account === 'number' ? account : account.info.amount?.toNumber();

  const precision = Math.pow(10, mint?.decimals || 0);
  const result = (amount / precision) * rate;

  return result;
}
