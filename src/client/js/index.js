import React from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import _ from 'underscore';
import { ethers } from 'ethers';
import BN from 'bignumber.js';
import { Integrations } from '@sentry/tracing';

const IS_MAIN_NETWORK = (window.IS_MAIN_NETWORK = process.env.IS_MAIN_NETWORK === 'true');
window.IS_PRODUCTION = process.env.IS_PRODUCTION;

if (process.env.IS_PRODUCTION) {
  Sentry.init({
    dsn: process.env.SENTRY_JS_DSN,
    environment: IS_MAIN_NETWORK ? 'production' : 'development',
    integrations: [new Integrations.BrowserTracing()],
    release: `${process.env.HEROKU_APP_NAME}-${process.env.HEROKU_RELEASE_VERSION}`,

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
  });
}

window.ethers = ethers;
window._ = _;
window.BN = BN;
window.BigNumber = ethers.BigNumber;

if (IS_MAIN_NETWORK) {
  console.log('Loading MAIN config...');
} else {
  console.log('Loading TEST config...');
}

const config = await fetch(IS_MAIN_NETWORK ? '/config/main.config.json' : '/config/test.config.json');
window.NETWORK_CONFIGS = await config.json();
window.MAX_RETRIES = process.env.IS_PRODUCTION ? 3 : 1;

// import after NETWORK_CONFIGs is initialized
import Wallet from './utils/wallet';
import TokenClaim from './utils/tokenClaim';
import TokenListManager from './utils/tokenList';
import GlobalStateManager from './utils/global';
import SwapFn from './utils/swapFn';
import Nxtp from './utils/nxtp';
import HopUtils from './utils/hop';
import TxQueue from './utils/txQueue';
import Storage from './utils/storage';
import App from './components/App';

// pre-load and collase/parallelize all our external JSON config loading
// to reduce initial app load times
await Promise.all([
  Wallet.initializeAbis(),
  TokenListManager.initializeTokenLists(),
  TokenClaim.initializeAbi(),
  TokenClaim.initializeAddr(),
]);

await Storage.initialize();
await TokenListManager.initialize();
await TokenListManager.updateTokenList();
await GlobalStateManager.initialize();
await Wallet.initialize();
await TokenClaim.initialize();
await SwapFn.initialize();
await Nxtp.initalize();
await HopUtils.initalize();
TxQueue.initialize();

if (Wallet.isMetamaskSupported()) {
  console.log('MetaMask is installed!');
} else {
  console.error('Metamask not installed!');
}

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(<App />);
