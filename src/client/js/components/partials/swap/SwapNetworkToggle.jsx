import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';
import * as Sentry from '@sentry/react';
import Wallet from '../../../utils/wallet';
import EventManager from '../../../utils/events';
import TokenListManager from '../../../utils/tokenList';
import NetworkDropdown from '../NetworkDropdown';

export default class SwapNetworkToggle extends Component {
  constructor(props) {
    super(props);

    this.handleDropdownClick = this.handleDropdownClick.bind(this);

    this.state = {
      selected: TokenListManager.getCurrentNetworkConfig(),
      active: false,
      hoverable: true,
    };

    this.subscribers = [];
    this.handleNetworkHoverable = this.handleNetworkHoverable.bind(this);
    this.handleNetworkChange = this.handleNetworkChange.bind(this);
  }

  componentDidMount() {
    this.subscribers.push(EventManager.listenFor('networkHoverableUpdated', this.handleNetworkHoverable));

    this.subscribers.push(EventManager.listenFor('networkUpdated', this.handleNetworkChange));
  }

  componentWillUnmount() {
    this.subscribers.forEach((v) => {
      EventManager.unsubscribe(v);
    });
  }

  // if a network change occured outside of this component, we need to reflect
  // the change in the dropdown
  handleNetworkChange(event) {
    var network = TokenListManager.getCurrentNetworkConfig();
    this.setState({
      selected: network,
    });
  }

  handleNetworkHoverable(event) {
    if (event && event.hoverable !== this.state.hoverable) {
      this.setState({
        hoverable: event.hoverable,
      });
    }
  }

  handleDropdownClick(network) {
    if (network.enabled) {
      Sentry.addBreadcrumb({
        message: `Action: Network Changed: ${network.name}`,
      });
      this.setState({
        selected: network,
      });
      const connectStrategy = Wallet.isConnectedToAnyNetwork() && Wallet.getConnectionStrategy();
      TokenListManager.updateNetwork(network, connectStrategy);
    }
  }

  render() {
    return (
      <div className="swap-network-toggle box notification">
        <div className="level is-mobile option is-justify-content-flex-end">
          <div className="level-right">
            <div className="level-item">
              <NetworkDropdown
                className={classnames('is-right', {
                  'is-hoverable': this.state.hoverable,
                })}
                selected={this.state.selected}
                handleDropdownClick={this.handleDropdownClick}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
