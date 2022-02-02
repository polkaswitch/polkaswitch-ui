/* eslint-disable react/button-has-type */
/* eslint-disable no-nested-ternary */
/* eslint-disable react/jsx-indent */
/* eslint-disable react/no-array-index-key */

import React, { useContext, useEffect } from 'react';
import classnames from 'classnames';
import Navbar from '../partials/navbar/Navbar';
import ConnectWalletModal from '../partials/ConnectWalletModal';
import TxHistoryModal from '../partials/TxHistoryModal';
import NotificationSystem from '../partials/NotificationSystem';
import MobileMenu from '../partials/navbar/MobileMenu';
import { balanceContext } from '../../context/balance';
import EventManager from '../../utils/events';

const StatusHome = () => {
  const { networks, loadBalances, loading, setMyApplicationState } =
    useContext(balanceContext);

  let subWalletChange;

  useEffect(() => {
    setMyApplicationState((prevState) => ({
      ...prevState,
      refresh: Date.now(),
      balances: [],
      loading: true,
    }));

    loadBalances();
  }, []);

  const handleWalletChange = () => {
    setMyApplicationState((prevState) => ({
      ...prevState,
      refresh: Date.now(),
      balances: [],
      loading: true,
    }));

    loadBalances();
  };

  useEffect(() => {
    subWalletChange = EventManager.listenFor(
      'walletUpdated',
      handleWalletChange,
    );

    return () => subWalletChange.unsubscribe();
  }, []);

  const handleConnect = () => {
    EventManager.emitEvent('promptWalletConnect', 1);
  };

  return (
    <div className="container">
      <Navbar />
      <MobileMenu />
      <NotificationSystem />
      <ConnectWalletModal />
      <TxHistoryModal />

      <div className="columns is-centered">
        <div className="column card-container">
          <div className="card wallets-page-card">
            <div className="tokens-table-title-container status-title">
              <span className="tokens-table-title-container__main status-main">
                Status
              </span>
            </div>

            <div className="wallets-page-tokens-table">
              {networks?.length > 1 && (
                <div className="columns wallets-page-tokens-table__header is-mobile">
                  <>
                    <div className="column is-half-mobile">
                      <span>Node</span>
                    </div>
                    <div className="column is-half-mobile">
                      <span>Status</span>
                    </div>
                  </>
                </div>
              )}
              {loading ? (
                <div
                  className={classnames('wallets-page-loader', {
                    'is-hidden': !loading,
                  })}
                >
                  <div className="loader-text">Loading nodes</div>
                  <div className="loader is-loading" />
                </div>
              ) : networks.length > 1 ? (
                networks.map((node) => (
                  <div
                    key={`network-${node.name}`}
                    className="columns wallets-page-tokens-table__row is-mobile"
                  >
                    <div className="column is-half">
                      <span>{node.name}</span>
                    </div>
                    <div className="column align-right">
                      <h4 className="wallets-page-tokens-table__title">
                        {node.isRPCNodeActive ? (
                          <span className="network-status-online"> Online</span>
                        ) : (
                          <span className="network-status-offline">
                            {' '}
                            Offline
                          </span>
                        )}
                      </h4>
                    </div>
                  </div>
                ))
              ) : (
                <div className="column data-na-container">
                  <h2 className="status-main-description">
                    Please reconnect the RPC's
                  </h2>

                  <button onClick={handleConnect} className="button is-success">
                    Connect Wallet
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusHome;
