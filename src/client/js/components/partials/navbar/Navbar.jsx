import React, { Component } from 'react';
import NavMenu from './NavMenu';
import ConnectWalletButton from '../ConnectWalletButton';
import SolanaWalletConnect from '../SolanaWalletConnect';
import NotificationButton from '../NotificationButton';
import BridgeButton from '../BridgeButton';
import Settings from '../Settings';

export default class Navbar extends Component {
  render() {
    return (
      <nav id="nav" className="level is-mobile">
        <div className="level-left is-flex-grow-1">
          <div className="level-item is-narrow">
            <span className="logo-icon icon is-left is-hidden-mobile">
              <img src="/images/swing_beta_logo.svg" />
            </span>
            <span className="logo-icon icon is-left is-hidden-tablet">
              <img src="/images/swing_beta_logo.svg" />
            </span>
          </div>
          <div className="level-item is-flex-grow-3 is-justify-content-left is-hidden-touch">
            {/* <TokenSearchBar width={"75%"} /> */}
          </div>
        </div>
        <NavMenu />
        <div className="level-right">
          <div className="level-item is-narrow">
            <BridgeButton />
          </div>
          <div className="level-item is-narrow">
            <NotificationButton />
          </div>
          <div className="level-item is-narrow">
            <ConnectWalletButton />
          </div>
          <div className="level-item is-narrow">
            <SolanaWalletConnect />
          </div>
          {/*<div className="level-item"><Settings /></div>*/}
        </div>
      </nav>
    );
  }
}
