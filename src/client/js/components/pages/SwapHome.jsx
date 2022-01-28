import React, { Component } from 'react';
import TokenPairChartOverview from '../partials/swap/TokenPairChartOverview';
import Navbar from '../partials/navbar/Navbar';
import SwapWidget from '../partials/swap/SwapWidget';
import AlphaOnboardingCard from '../partials/swap/AlphaOnboardingCard';
import SwapNetworkToggle from '../partials/swap/SwapNetworkToggle';
import ConnectWalletModal from '../partials/ConnectWalletModal';
import TxHistoryModal from '../partials/TxHistoryModal';
import NotificationSystem from '../partials/NotificationSystem';
import MobileMenu from '../partials/navbar/MobileMenu';
import TxnHistory from '../partials/swap/TxnHistory';
import Search from '../partials/swap/Search';

export default class Home extends Component {
  render() {
    return (
      <div className="container">
        <Navbar />
        <MobileMenu />
        <NotificationSystem />
        <ConnectWalletModal />
        <TxHistoryModal />
        <div className="columns">
          <div className="column trading-view-column" style={{ minWidth: 0 }}>
            {/* <Search /> */}
            <div className="box trading-view-wrapper">
              <TokenPairChartOverview />
            </div>
            <div>
              <TxnHistory />
            </div>
          </div>
          <div className="column swap-column" style={{ margin: '0 auto' }}>
            <SwapNetworkToggle />
            <SwapWidget />
            <AlphaOnboardingCard />
          </div>
        </div>
      </div>
    );
  }
}
