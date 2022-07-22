import React, { Component } from 'react';
import Navbar from '../partials/navbar/Navbar';
import ConnectWalletModal from '../partials/ConnectWalletModal';
import NotificationSystem from '../partials/NotificationSystem';
import MobileMenu from '../partials/navbar/MobileMenu';
import BridgeWidget from '../partials/bridge/BridgeWidget';
import TxHistoryModal from '../partials/TxHistoryModal';

export default class Bridge extends Component {
  render() {
    return (
      <div className="container">
        <Navbar bridge = {true}/>
        <MobileMenu />
        <NotificationSystem />
        <ConnectWalletModal />
        <TxHistoryModal />
        <div className="columns">
          <div className="column bridge-column" style={{ margin: '0 auto' }}>
            <BridgeWidget />
          </div>
        </div>
      </div>
    );
  }
}
