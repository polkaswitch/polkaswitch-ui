import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import Wallet from './utils/wallet';
import TokenListManager from './utils/tokenList';
import SwapFn from './utils/swapFn';
import Nxtp from './utils/nxtp';
import TxQueue from './utils/txQueue';
import Storage from './utils/storage';
import _ from 'underscore';
import { ethers } from 'ethers';
import BN from 'bignumber.js';
import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";

import { store } from './store/store'
import { Provider } from 'react-redux'
import { Updater } from './store/tokenList/updater';

const IS_MAIN_NETWORK = (process.env.IS_MAIN_NETWORK === "true");

if (process.env.IS_PRODUCTION) {
  Sentry.init({
    dsn: process.env.SENTRY_JS_DSN,
    environment: IS_MAIN_NETWORK ? 'production' : 'development',
    integrations: [new Integrations.BrowserTracing()],
    release: process.env.HEROKU_APP_NAME + "-" + process.env.HEROKU_RELEASE_VERSION,

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
  console.log("Loading MAIN config...");
} else {
  console.log("Loading TEST config...");
}

var config  = await fetch(
  IS_MAIN_NETWORK ?
    '/config/main.config.json' :
    '/config/test.config.json'
);
window.NETWORK_CONFIGS = await config.json();

// initialize TokenList
window.COINGECKO_TOKEN_LIST = await(await fetch('/tokens/coingecko.list.json')).json();
window.MAX_RETRIES = process.env.IS_PRODUCTION ? 3 : 1;

await Storage.initialize();
await TokenListManager.initialize();
await TokenListManager.updateTokenList();
await Wallet.initialize();
await SwapFn.initialize();
await Nxtp.initalize();
TxQueue.initialize();

if (Wallet.isMetamaskSupported()) {
  console.log('MetaMask is installed!');
} else {
  console.error('Metamask not installed!');
}

ReactDOM.render(
  <Provider store={store}>
    <Updater />
    <App />
  </Provider>, document.getElementById('root'));
