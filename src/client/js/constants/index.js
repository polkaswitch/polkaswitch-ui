export const approvalState = {
  UNKNOWN: 'UNKNOWN',
  NOT_APPROVED: 'NOT_APPROVED',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
};

export const wrapTokens = {
  MATIC: {
    137: '0x0000000000000000000000000000000000001010',
  },
  BNB: {
    56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  },
  AVAX: {
    43114: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
  },
  xDai: {
    100: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
  },
  FTM: {
    250: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
  },
  MOVR: {
    1285: '0x98878B06940aE243284CA214f92Bb71a2b032B8A',
  },
  ETH: {
    1313161554: '0xc9bdeed33cd01541e1eed10f90519d2c06fe3feb',
    1: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  ONE: {
    1666600000: '0xcf664087a5bb0237a0bad6742852ec6c8d69a27a'
  }
};

export const ALLOWED_BRIDGES = ['celer', 'nxtp', 'anyswap', 'wormhole'];