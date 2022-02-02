import _ from 'underscore';
import React, { Component } from 'react';
import * as ethers from 'ethers';
import SwapSlippageControl from './SwapSlippageControl';
import GasPriceControl from './GasPriceControl';
import SwapFn from '../../utils/swapFn';
import EventManager from '../../utils/events';

export default class AdvancedSettingsSlide extends Component {
  constructor(props) {
    super(props);

    this.state = {
      refresh: Date.now(),
    };
    this.handleSlippage = this.handleSlippage.bind(this);
    this.handleSettingsChange = this.handleSettingsChange.bind(this);

    this.subscribers = [];
    this.subscribers.push(EventManager.listenFor('swapSettingsUpdated', this.handleSettingsChange));
  }

  componentWillUnmount() {
    this.subscribers.forEach((v) => {
      EventManager.unsubscribe(v);
    });
  }

  handleSettingsChange(e) {
    this.setState({
      refresh: Date.now(),
    });
  }

  handleSlippage(v) {
    SwapFn.updateSettings({
      slippage: v,
    });
  }

  render() {
    return (
      <div className="page page-stack page-view-settings">
        <div className="page-inner">
          <div className="level is-mobile">
            <div className="level-left">
              <div className="level-item">
                <span className="icon ion-icon clickable" onClick={this.props.handleBackOnSettings}>
                  <ion-icon name="arrow-back-outline" />
                </span>
              </div>
              <div className="level-item">
                <b className="widget-title">Advanced Settings</b>
              </div>
            </div>
          </div>

          <hr className="theme-hr" />

          <div className="option">
            <div>
              <span>
                <b className="setting-input-title">Gas Price</b>
                <span
                  className="hint-icon hint--bottom hint--medium"
                  aria-label="You can expedite your transaction by paying more Gas Fees. You can choose between either faster transactions or cheaper fees (in GWei)"
                >
                  ?
                </span>
              </span>
            </div>

            <GasPriceControl refresh={this.state.refresh} />
          </div>

          <div className="option">
            <div>
              <span>
                <b className="setting-input-title">Slippage Tolerance</b>
                <span
                  className="hint-icon hint--bottom hint--medium"
                  aria-label="Your transaction will revert if the price changes unfavorably by more than this percentage"
                >
                  ?
                </span>
              </span>
            </div>

            <SwapSlippageControl handleSlippage={this.handleSlippage} />
          </div>

          <div className="level is-mobile option">
            <div className="level-left">
              <div className="level-item">
                <span>
                  <b className="setting-input-title">Liquidity Sources</b>
                  <span
                    className="hint-icon hint--top hint--medium"
                    aria-label="Coming Soon! Customize which sources to route your swap through"
                  >
                    ?
                  </span>
                </span>
              </div>
            </div>

            <div className="level-right">
              <div className="level-item">
                <div className="select">
                  <select disabled>
                    <option>10</option>
                    <option>2</option>
                    <option>1</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="level is-hidden is-mobile option">
            <div className="level-left">
              <div className="level-item">
                <span>
                  <b>Custom Tokens</b>
                  <span className="hint-icon hint--top" aria-label="Coming Soon">
                    ?
                  </span>
                </span>
              </div>
            </div>

            <div className="level-right">
              <div className="level-item">
                <span className="icon ion-icon disabled is-medium">
                  <ion-icon name="add-circle-outline" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
