import React, { Component } from 'react';
import _ from "underscore";
import classnames from 'classnames';

import Wallet from '../../utils/wallet';
import Metrics from '../../utils/metrics';
import EventManager from '../../utils/events';
import TokenListManager from '../../utils/tokenList';
import Nxtp from '../../utils/nxtp';

import TxExplorerLink from './TxExplorerLink';
import TxStatusView from './TxStatusView';

export default class ConnextTxTrackerView extends Component {
  constructor(props) {
    super(props);
    this.state = { refresh: Date.now(), open: false };
    this.handleUpdate = this.handleUpdate.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
  }

  componentDidMount() {
    this.subUpdate = EventManager.listenFor(
      'connextTxQueueUpdated', this.handleUpdate
    );
  }

  componentWillUnmount() {
    this.subUpdate.unsubscribe();
  }

  handleUpdate() {
    this.setState({ refresh: Date.now() });
  }

  render() {
    var queue = Nxtp.getQueue();

    return (
      <div>
        {_.keys(queue).length < 1 && (
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

        {_.map(queue, function(item, i) {
          return (
            <TxStatusView key={i} data={item} />
          );
        })}
      </div>
    );
  }
}

