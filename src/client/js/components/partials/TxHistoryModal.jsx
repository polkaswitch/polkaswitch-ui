import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';

import Wallet from '../../utils/wallet';
import Metrics from '../../utils/metrics';
import EventManager from '../../utils/events';
import TokenListManager from '../../utils/tokenList';
import TxQueue from '../../utils/txQueue';
import Nxtp from '../../utils/nxtp';

import TxExplorerLink from './TxExplorerLink';
import TxStatusView from './TxStatusView';
import TxCrossChainHistoricalStatusView from './TxCrossChainHistoricalStatusView';
import TxCrossChainActiveStatusView from './TxCrossChainActiveStatusView';
import CrossChainToggle from './swap/CrossChainToggle';

export default class TxHistoryModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      refresh: Date.now(),
      open: false,
      loading: false,
      showSingleChain: false,
    };

    this.fetchCrossChainHistory = this.fetchCrossChainHistory.bind(this);
    this.handleUpdate = this.handleUpdate.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleCrossChainChange = this.handleCrossChainChange.bind(this);
    this.handleFinishAction = this.handleFinishAction.bind(this);
  }

  componentDidMount() {
    this.subUpdate = EventManager.listenFor(
      'txQueueUpdated',
      this.handleUpdate,
    );
    this.subNxtp = EventManager.listenFor(
      'nxtpEventUpdated',
      this.handleUpdate,
    );
    this.subPrompt = EventManager.listenFor('promptTxHistory', this.handleOpen);
  }

  componentWillUnmount() {
    this.subUpdate.unsubscribe();
  }

  handleUpdate() {
    this.setState({ refresh: Date.now() });
  }

  handleOpen(e) {
    this.setState({
      open: true,
    });

    if (!this.state.showSingleChain) {
      this.fetchCrossChainHistory();
    }
  }

  handleClose(e) {
    this.setState({
      open: false,
    });
  }

  handleCrossChainChange(checked) {
    this.setState({
      showSingleChain: checked,
    });

    if (!checked) {
      this.fetchCrossChainHistory();
    }
  }

  handleFinishAction(transactionId) {
    if (!Wallet.isConnected()) {
      console.error('TxHistoryModal: Wallet not connected');
      return;
    }

    Nxtp.transferStepTwo(transactionId);
  }

  fetchCrossChainHistory() {
    if (!Wallet.isConnected()) {
      return;
    }

    this.setState(
      {
        loading: true,
      },
      async () => {
        if (Nxtp.isSdkInitalized()) {
          await Nxtp.initalizeSdk();
        }

        Nxtp.fetchActiveTxs()
          .then(() => Nxtp.fetchHistoricalTxs())
          .then(() => {
            this.setState({
              loading: false,
              refresh: Date.now(),
            });
          });
      },
    );
  }

  render() {
    const singleChainQueue = TxQueue.getQueue();
    const xActiveQueue = Nxtp.getAllActiveTxs();
    const xAllHistQueue = Nxtp.getAllHistoricalTxs().sort((first, second) => second.preparedTimestamp - first.preparedTimestamp);
    const xHistQueue = _.first(xAllHistQueue, 5);

    const emptyQueue = (this.state.showSingleChain && _.keys(singleChainQueue).length < 1)
      || (!this.state.showSingleChain
        && xActiveQueue.length < 1
        && xHistQueue.length < 1);

    return (
      <div className={classnames('modal', { 'is-active': this.state.open })}>
        <div onClick={this.handleClose} className="modal-background" />
        <div className="modal-content">
          <div className="tx-history-modal box">
            <div className="level is-mobile">
              <div className="level-left">
                <div className="level-item">
                  <span
                    className="icon ion-icon clickable is-medium"
                    onClick={this.handleClose}
                  >
                    <ion-icon name="close-outline" />
                  </span>
                </div>
                <div className="level-item">
                  <b className="widget-title">Transaction History</b>
                </div>
              </div>
              <div className="level-right">
                <div className="level-item">
                  <CrossChainToggle
                    checked={this.state.showSingleChain}
                    handleChange={this.handleCrossChainChange}
                  />
                </div>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <div
                className={classnames('loader-wrapper', {
                  'is-active': this.state.loading,
                })}
              >
                <div className="loader is-loading" />
              </div>

              {emptyQueue && (
                <div className="empty-state">
                  <div>
                    <div className="empty-text has-text-info">
                      No recent transactions
                    </div>
                    <div className="icon has-text-info-light">
                      <ion-icon name="file-tray-outline" />
                    </div>
                  </div>
                </div>
              )}

              {this.state.showSingleChain
                && _.map(singleChainQueue, (item, i) => <TxStatusView key={i} data={item} />)}
              {this.state.showSingleChain
                && _.keys(singleChainQueue).length > 0 && (
                  <div className="footer-note">
                    Only showing transactions in the last 72 hours.
                  </div>
              )}

              {!this.state.showSingleChain && (
                <div className="footer-note mb-2">
                  {xActiveQueue.length > 0
                    ? 'Current active transactions'
                    : 'No active transactions'}
                  {' '}
                  (
                  {xActiveQueue.length}
                  )
                </div>
              )}

              {!this.state.showSingleChain
                && xActiveQueue.map((item, i) => (
                  <TxCrossChainActiveStatusView
                    key={i}
                    data={item}
                    handleFinishAction={this.handleFinishAction}
                  />
                ))}

              {!this.state.showSingleChain && xHistQueue.length > 0 && (
                <div className="footer-note mb-2">
                  Last five historical transactions (
                  {xHistQueue.length}
                  /
                  {xAllHistQueue.length}
                  )
                </div>
              )}

              {!this.state.showSingleChain
                && xHistQueue.map((item, i) => (
                  <TxCrossChainHistoricalStatusView key={i} data={item} />
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
