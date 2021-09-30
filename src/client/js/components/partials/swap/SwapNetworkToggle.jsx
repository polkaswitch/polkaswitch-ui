import React, { Component } from 'react';
import _ from "underscore";
import classnames from 'classnames';
import * as Sentry from "@sentry/react";

import Wallet from '../../../utils/wallet';
import Metrics from '../../../utils/metrics';
import EventManager from '../../../utils/events';
import TokenListManager from '../../../utils/tokenList';
import TokenIconImg from './../TokenIconImg';

import CrossChainToggle from './CrossChainToggle';
import NetworkDropdown from './NetworkDropdown';

export default class SwapNetworkToggle extends Component {
  constructor(props) {
    super(props);

    this.handleDropdownClick = this.handleDropdownClick.bind(this);

    this.state = {
      selected: TokenListManager.getCurrentNetworkConfig(),
      active: false,
      singleChain: !TokenListManager.isCrossChainEnabled(),
      hoverable: true,
    };
    this.subscribers = [];
    this.handleNetworkHoverable = this.handleNetworkHoverable.bind(this);
    this.handleCrossChainChange = this.handleCrossChainChange.bind(this);
  }

  componentDidMount() {
    this.subscribers.push(EventManager.listenFor('networkHoverableUpdated', this.handleNetworkHoverable));
  }

  componentWillUnmount() {
    this.subscribers.forEach(function(v) {
      EventManager.unsubscribe(v);
    });
  }

  handleCrossChainChange(checked) {
    this.setState({
      singleChain: checked
    });
    TokenListManager.toggleCrossChain(!checked);
  }

  handleNetworkHoverable(event) {
    if (event && (event.hoverable !== this.state.hoverable)) {
      this.setState({
        hoverable: event.hoverable
      });
    }
  }

  handleDropdownClick(network) {
    if (network.enabled) {
      Sentry.addBreadcrumb({
        message: "Action: Network Changed: " + network.name
      });
      this.setState({
        selected: network
      });
      let connectStrategy = Wallet.isConnectedToAnyNetwork() &&
        Wallet.getConnectionStrategy();
      TokenListManager.updateNetwork(network, connectStrategy);
    }
  }

  render() {
    var networkList = _.map(this.NETWORKS, function(v, i) {
      return (
        <a href="#"
          key={i}
          onClick={this.handleDropdownClick(v)}
          className={classnames("dropdown-item level is-mobile", {
            "disabled": !v.enabled
          })}
        >
          <span className="level-left my-2">
            <span className="level-item">
              <TokenIconImg
                size={32}
                imgSrc={v.logoURI} />
            </span>
            <span className="level-item">{v.name} {!v.enabled && "(Coming Soon)"}</span>
          </span>
        </a>
      );
    }.bind(this));

    return (
      <div className="swap-network-toggle box notification">
        <div className="level is-mobile option">
          <div className="level-left">
            <div className="level-item">
              <CrossChainToggle
                checked={this.state.singleChain}
                handleChange={this.handleCrossChainChange} />
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <NetworkDropdown
                className={classnames("is-right", {
                "is-hoverable": this.state.hoverable,
                "is-hidden": !this.state.singleChain
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

