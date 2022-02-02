import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import _ from 'underscore';
import TokenListManager from '../../../utils/tokenList';
import Wallet from '../../../utils/wallet';

export default function NavMenu(props) {
  const CROSS_CHAIN_NETWORKS = _.filter(window.NETWORK_CONFIGS, (v) => v.crossChainSupported);

  const handleClick = async (isSwap) => {
    await Wallet.changeNetworkForSwapOrBridge(isSwap);
  };

  return (
    <div className="nav-menu">
      <NavLink exact className="nav-link" activeClassName="active" to="/swap" onClick={(e) => handleClick(true)}>
        Trade
      </NavLink>
      <NavLink className="nav-link" activeClassName="active" to="/bridge" onClick={(e) => handleClick(false)}>
        Bridge
      </NavLink>
      <NavLink exact className="nav-link" activeClassName="active" to="/wallet">
        Wallet
      </NavLink>
      <NavLink exact className="nav-link" activeClassName="active" to="/status">
        Status
      </NavLink>
      <a
        className="nav-link"
        href="https://buy-staging.moonpay.com?apiKey=pk_test_5ZOE1A7xmiXrfUrnzuVlH4DunwykjRgX&colorCode=%2358b57e"
        target="_blank"
      >
        Buy
      </a>
    </div>
  );
}
