import React, { useEffect, useState } from 'react';

import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from 'react-router-dom';

import classnames from 'classnames';
import SwapHome from './pages/SwapHome';
import TokenClaimHome from './pages/TokenClaimHome';
import BridgeHome from './pages/BridgeHome';
import StatusHome from './pages/StatusHome';
import WalletHome from './pages/WalletHome';
import StakeHome from './pages/StakeHome';
import Footer from './partials/Footer';
import { keepTheme } from '../utils/theme';
import { BalanceProvider } from '../context/balance';
import useLoadBalances from './pages/useLoadBalance';

import { SolanaWalletProvider } from '../context/SolanaWalletContext';
import { SolanaAccountsProvider } from '../context/SolanaAccounts';
import { SolanaConnectionProvider } from '../context/SolanaConnection';
require('../../css/index.scss');

const IS_CLAIM_DOMAIN = process.env.IS_CLAIM_DOMAIN === 'true';

const App = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleFullScreenOn = () => setIsFullScreen(true);

  const handleFullScreenOff = () => setIsFullScreen(false);

  useEffect(() => {
    keepTheme();
    window.document.addEventListener('fullScreenOn', handleFullScreenOn);
    window.document.addEventListener('fullScreenOff', handleFullScreenOff);
  }, []);

  useEffect(
    () => () => {
      window.document.removeEventListener('fullScreenOn', handleFullScreenOn);
      window.document.removeEventListener('fullScreenOff', handleFullScreenOff);
    },
    [],
  );

  const { myApplicationState, setMyApplicationState, loadBalances } =
    useLoadBalances();

  return (
    <SolanaWalletProvider>
      <SolanaConnectionProvider>
        <SolanaAccountsProvider>
          <BalanceProvider
            value={{ ...myApplicationState, setMyApplicationState, loadBalances }}
          >
            {myApplicationState && (
              <Router>
                <div className={classnames({ fullscreen: isFullScreen })}>
                  {!IS_CLAIM_DOMAIN
                    ? <Switch>
                        <Route exact path="/">
                          <Redirect to="/swap" />
                        </Route>
                        <Route path="/swap">
                          <SwapHome />
                        </Route>
                        <Route path="/bridge">
                          <BridgeHome />
                        </Route>
                        <Route path="/stake">
                          <StakeHome />
                        </Route>
                        <Route path="/wallet">
                          <WalletHome />
                        </Route>
                        <Route path="/status">
                          <StatusHome />
                        </Route>
                        <Route path="/claim">
                          <TokenClaimHome />
                        </Route>
                        <Route>
                          <Redirect to="/swap" />
                        </Route>
                      </Switch>
                    : <Switch>
                        <Route exact path="/">
                          <Redirect to="/claim" />
                        </Route>
                        <Route path="/claim">
                          <TokenClaimHome />
                        </Route>
                        <Route>
                          <Redirect to="/claim" />
                        </Route>
                      </Switch>}
                  <Footer />
                </div>
              </Router>
            )}
          </BalanceProvider>
        </SolanaAccountsProvider>
      </SolanaConnectionProvider>
    </SolanaWalletProvider>
  );
};

export default App;
