import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import _ from 'underscore';
import TokenListManager from '../../../utils/tokenList';
import Wallet from '../../../utils/wallet';

export default function NavMenu(props) {
  const CROSS_CHAIN_NETWORKS = _.filter(window.NETWORK_CONFIGS, (v) => v.crossChainSupported);

  const handleClick = async (isSwap) => {
    const currNetwork = TokenListManager.getCurrentNetworkConfig();
    const changeNetwork = !isSwap && !currNetwork.crossChainSupported;
    const nextNetwork = !changeNetwork ? currNetwork : _.first(CROSS_CHAIN_NETWORKS);

    if (changeNetwork) {
      const connectStrategy = Wallet.isConnectedToAnyNetwork() && Wallet.getConnectionStrategy();
      TokenListManager.updateNetwork(nextNetwork, connectStrategy);
    }

    await TokenListManager.updateTokenList();
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
