import React, { Component } from 'react';
import _ from "underscore";
import classnames from 'classnames';
import * as Sentry from "@sentry/react";

import Wallet from '../../../utils/wallet';
import Metrics from '../../../utils/metrics';
import EventManager from '../../../utils/events';
import TokenListManager from '../../../utils/tokenList';
import TokenIconImg from './../TokenIconImg';
import {switchToDarkMode, switchToLightMode} from "../../../stores/darkModeSlice";
import {connect} from "react-redux";

class SwapNetworkToggle extends Component {
  constructor(props) {
    super(props);

    this.handleDropdownClick = this.handleDropdownClick.bind(this);
    this.NETWORKS = window.NETWORK_CONFIGS;
    this.state = {
      isDarkMode:false,
      selected: TokenListManager.getCurrentNetworkConfig(),
      active: false,
      hoverable: true,
    };
    this.subscribers = [];
    this.handleNetworkHoverable = this.handleNetworkHoverable.bind(this);
  }

  componentDidMount() {
    this.subscribers.push(EventManager.listenFor('networkHoverableUpdated', this.handleNetworkHoverable));
  }

  componentWillUnmount() {
    this.subscribers.forEach(function(v) {
      EventManager.unsubscribe(v);
    });
  }

  handleNetworkHoverable(event) {
    if (event && (event.hoverable !== this.state.hoverable)) {
      this.setState({
        hoverable: event.hoverable
      });
    }
  }

  handleDropdownClick(network) {
    return function handleClick(e) {
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
    }.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.isDarkMode !== this.props.isDarkMode) {
      this.setState({ isDarkMode: nextProps.isDarkMode });
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
                size={30}
                imgSrc={v.logoURI} />
            </span>
            <span className="level-item">{v.name} {!v.enabled && "(Coming Soon)"}</span>
          </span>
        </a>
      );
    }.bind(this));

    return (
      <div className={"swap-network-toggle box notification ".concat( this.state.isDarkMode ? "dark-bg": "")}>
        <div className="level is-mobile option">
          <div className="level-left">
            <div className="level-item">
              <span>
                <span className={"option-title ".concat(this.state.isDarkMode ? "text-white-color" : "")}>Network</span>
                <span
                  className="is-hidden hint-icon hint--top hint--medium"
                  aria-label="Change Network"
                >?</span>
              </span>
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <div className={classnames("dropdown is-right ", {
                  "is-hoverable": this.state.hoverable
              })}>
                <div className="dropdown-trigger">
                  <button className={"button is-info is-light ".concat(this.state.isDarkMode ? "dark-dropdown" : "")} aria-haspopup="true" aria-controls="dropdown-menu">
                    <span className="level">
                      <span className="level-left my-2">
                        <span className="level-item">
                          <TokenIconImg
                            size={30}
                            imgSrc={this.state.selected.logoURI} />
                        </span>
                        <span className="level-item">{this.state.selected.name}</span>
                      </span>
                    </span>
                    <span className="icon is-small">
                      <ion-icon name="chevron-down"></ion-icon>
                    </span>
                  </button>
                </div>
                <div
                    className="dropdown-menu"
                    id="dropdown-menu"
                    role="menu">
                  <div className={"dropdown-content ".concat(this.state.isDarkMode ? "dropdown-content-dark" : "")} >
                    {networkList}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  isDarkMode: state.darkMode.isDarkMode
});

const mapDispatchToProps = { switchToLightMode, switchToDarkMode };

export default connect(mapStateToProps, mapDispatchToProps)(SwapNetworkToggle);