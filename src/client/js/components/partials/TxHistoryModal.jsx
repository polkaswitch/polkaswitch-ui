import React, { Component } from 'react';
import _ from "underscore";
import classnames from 'classnames';

import Wallet from '../../utils/wallet';
import Metrics from '../../utils/metrics';
import EventManager from '../../utils/events';
import TokenListManager from '../../utils/tokenList';
import TxQueue from '../../utils/txQueue';
import Nxtp from '../../utils/nxtp';

import TxExplorerLink from './TxExplorerLink';
import TxStatusView from './TxStatusView'
import TxCrossChainHistoricalStatusView from './TxCrossChainHistoricalStatusView'
import CrossChainToggle from './swap/CrossChainToggle';

export default class TxHistoryModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      refresh: Date.now(),
      open: false,
      loading: false,
      showSingleChain: !TokenListManager.isCrossChainEnabled()
    };

    this.fetchCrossChainHistory = this.fetchCrossChainHistory.bind(this);
    this.handleUpdate = this.handleUpdate.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleCrossChainChange = this.handleCrossChainChange.bind(this);
  }

  componentDidMount() {
    this.subUpdate = EventManager.listenFor(
      'txQueueUpdated', this.handleUpdate
    );
    this.subPrompt = EventManager.listenFor(
      'promptTxHistory', this.handleOpen
    );
  }

  componentWillUnmount() {
    this.subUpdate.unsubscribe();
  }

  handleUpdate() {
    this.setState({ refresh: Date.now() });
  }

  handleOpen(e) {
    this.setState({
      open: true
    });

    if (!this.state.showSingleChain) {
      this.fetchCrossChainHistory();
    }
  }

  handleClose(e) {
    this.setState({
      open: false
    });
  }

  handleCrossChainChange(checked) {
    this.setState({
      showSingleChain: checked
    });

    if (!checked) {
      this.fetchCrossChainHistory();
    }
  }

  fetchCrossChainHistory() {
    this.setState({
      loading: true
    }, () => {
      Nxtp.fetchActiveTxs().then(() => {
        return Nxtp.fetchHistoricalTxs();
      }).then(() => {
        this.setState({
          loading: false,
          refresh: Date.now()
        });
      });
    });
  }

  render() {
    var singleChainQueue = TxQueue.getQueue();
    var xChainActiveQueue = Nxtp.getAllActiveTxs();
    var xChainHistoricalQueue = _.first(
      Nxtp.getAllHistoricalTxs().sort((first, second) => {
        return second.preparedTimestamp - first.preparedTimestamp;
      }),
    5);

    var emptyQueue = (this.state.showSingleChain && _.keys(singleChainQueue).length < 1) ||
      (!this.state.showSingleChain && xChainActiveQueue.length < 1 && xChainHistoricalQueue.length < 1);

    return (
      <div className={classnames("modal", { "is-active": this.state.open })}>
        <div onClick={this.handleClose} className="modal-background"></div>
        <div className="modal-content">
          <div className="tx-history-modal box">
            <div className="level header is-mobile">
              <div className="level-left">
                <div className="level-item">
                  <span
                    className="icon ion-icon clickable is-medium"
                    onClick={this.handleClose}
                  >
                    <ion-icon name="close-outline"></ion-icon>
                  </span>
                </div>
                <div className="level-item">
                  <b className="widget-title">Transactions</b>
                </div>
              </div>
              <div className="level-right">
                <div className="level-item">
                  <CrossChainToggle
                    checked={this.state.showSingleChain}
                    handleChange={this.handleCrossChainChange} />
                </div>
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <div className={classnames("loader-wrapper", { "is-active": this.state.loading })}>
                <div className="loader is-loading"></div>
              </div>

            {emptyQueue && (
              <div className="empty-state">
                <div>
                  <div className="empty-text has-text-info">
                    No recent transactions
                  </div>
                  <div className="icon has-text-info-light">
                    <ion-icon name="file-tray-outline"></ion-icon>
                  </div>
                </div>
                </div>
              )}

              {this.state.showSingleChain && _.map(singleChainQueue, function(item, i) {
                return (
                  <TxStatusView key={i} data={item} />
                );
              })}
              {this.state.showSingleChain && _.keys(singleChainQueue).length > 0 && (
                <div className="footer-note">Only showing transactions in the last 72 hours.</div>
              )}

              {!this.state.showSingleChain && xChainActiveQueue.map(function(item, i) {
                return (
                  <TxStatusView key={i} data={item} />
                );
              })}

              {!this.state.showSingleChain && xChainHistoricalQueue.length > 0 && (
                <div className="footer-note mb-2">
                  Past historical transactions
                </div>
              )}

              {!this.state.showSingleChain && xChainHistoricalQueue.map(function(item, i) {
                return (
                  <TxCrossChainHistoricalStatusView key={i} data={item} />
                );
              })}

              {!this.state.showSingleChain && xChainHistoricalQueue.length > 0 && (
                <div className="footer-note">Only showing last five completed transactions.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

