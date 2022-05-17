// 'https://api.dev.swing.xyz'
// nxtp swap https://crosschain-swap-api-web-swap.dev.swing.xyz/

// Temporary baseUrl until merge /transfer and /claim
// const baseUrl = 'https://swap.prod.swing.xyz';
const baseUrl = 'http://localhost:3000';

const chainNameHandler = (chain) => (chain === 'BNB Chain' ? 'bsc' : chain.toLowerCase());

const STATUS_NAME = {
  submitted: 'submitted',
  pendingSource: 'pending source chain',
  pendingDestination: 'pending destination chain',
  completed: 'completed',
  refundRequired: 'refund required',
  refunded: 'refunded',
  failedSourceChain: 'failed source chain',
  failedDestinationChain: 'failed destination chain',
};

/**
 * Encode an object as url query string parameters
 * - includes the leading "?" prefix
 * - example input — {key: "value", alpha: "beta"}
 * - example output — output "?key=value&alpha=beta"
 * - returns empty string when given an empty object
 */
function encodeQueryString(params) {
  const keys = Object.keys(params);
  return keys.length
    ? '?' + keys.map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(params[key])).join('&')
    : '';
}

// encodeQueryString({key: "value", alpha: "beta"})
//> "?key=value&alpha=beta"

export { baseUrl, chainNameHandler, STATUS_NAME, encodeQueryString };
