import React, { Component } from 'react';
import _ from "underscore";
import classnames from 'classnames';
import BN from 'bignumber.js';
import * as Sentry from "@sentry/react";

import TokenIconBalanceGroupView from './TokenIconBalanceGroupView';
import TokenSwapDistribution from './TokenSwapDistribution';
import MarketLimitToggle from './MarketLimitToggle';
import NetworkDropdown from './NetworkDropdown';

import Wallet from '../../../utils/wallet';
import Metrics from '../../../utils/metrics';
import EventManager from '../../../utils/events';
import SwapFn from '../../../utils/swapFn';
import Nxtp from '../../../utils/nxtp';
import TokenListManager from '../../../utils/tokenList';

export default class SwapOrderSlide extends Component {
  constructor(props) {
    super(props);
    this.state = {
      calculatingSwap: false,
      errored: false
    };

    this.calculatingSwapTimestamp = Date.now();

    this.handleTokenAmountChange = this.handleTokenAmountChange.bind(this);
    this.validateOrderForm = this.validateOrderForm.bind(this);
    this.fetchSwapEstimate = this.fetchSwapEstimate.bind(this);
    this.debounced_fetchSwapEstimate = _.debounce(this.fetchSwapEstimate, 600, true);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleMax = this.handleMax.bind(this);
    this.handleTokenSwap = this.handleTokenSwap.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.from.address !== prevProps.from.address ||
      this.props.to.address !== prevProps.to.address ||
      this.props.refresh !== prevProps.refresh ||
      (this.props.fromAmount !== prevProps.fromAmount && !this.state.calculatingSwap)) {
      if (this.props.fromAmount) {
        this.fetchSwapEstimate(this.props.fromAmount);
      }
    }
  }

  fetchSwapEstimate(origFromAmount, timeNow, attempt, cb) {

    var fromAmount = origFromAmount;

    if (!attempt) {
      attempt = 0;
    } else if (attempt > window.MAX_RETRIES) {
      this.setState({
        calculatingSwap: false,
        errored: true
      });
      console.error("Swap Failure: MAX RETRIES REACHED");
      return;
    }

    this.props.onSwapEstimateComplete(
      origFromAmount,
      this.props.toAmount,
      this.props.swapDistribution
    )

    if (!fromAmount || fromAmount.length === 0) {
      fromAmount = '0';
    } else {
      fromAmount = SwapFn.validateEthValue(this.props.from, fromAmount);
    }

    if (!timeNow) {
      timeNow = Date.now();
    }

    this.calculatingSwapTimestamp = timeNow;

    this.setState({
      errored: false,
      calculatingSwap: true
    }, function(_timeNow, _attempt, _cb) {

      var fromAmountBN = window.ethers.utils.parseUnits(
        fromAmount,
        this.props.from.decimals
      );

      // add delay to slow down UI snappiness
      _.delay(function(_timeNow2, _attempt2, _cb2) {
        if (this.calculatingSwapTimestamp !== _timeNow2) {
          return;
        }

        if (this.props.crossChainEnabled) {
          this.fetchCrossChainEstimate(origFromAmount, fromAmountBN, _timeNow2, _attempt2, _cb2)
        } else {
          this.fetchSingleChainSwapEstimate(origFromAmount, fromAmountBN, _timeNow2, _attempt2, _cb2)
        }

      }.bind(this), 500, _timeNow, _attempt, _cb);
    }.bind(this, timeNow, attempt, cb));
  }

  fetchSingleChainSwapEstimate(origFromAmount, fromAmountBN, _timeNow2, _attempt2, _cb2) {
    return SwapFn.getExpectedReturn(
      this.props.from,
      this.props.to,
      fromAmountBN
    ).then(function(_timeNow3, _cb3, result) {
      if (this.calculatingSwapTimestamp !== _timeNow3) {
        return;
      }

      var dist = _.map(result.distribution, function(e) {
        return e.toNumber();
      });

      Wallet.getBalance(this.props.from).then((bal) => {
        return SwapFn.getApproveStatus(
          this.props.from,
          fromAmountBN
        ).then((status) => {
          console.log('Approval Status', status)
          this.props.onSwapEstimateComplete(
            origFromAmount,
            window.ethers.utils.formatUnits(result.returnAmount, this.props.to.decimals),
            dist,
            window.ethers.utils.formatUnits(bal, this.props.from.decimals),
            status
          )

          this.setState({
            calculatingSwap: false
          }, () => {
            if (_cb3) {
              _cb3();
            }

            Metrics.track("swap-estimate-result", {
              from: this.props.from,
              to: this.props.to,
              fromAmont: fromAmountBN.toString(),
              toAmount: this.props.toAmount,
              swapDistribution: this.props.swapDistribution
            });
          });
        });
      }).catch((e) => {
        console.error("Failed to get swap estimate: ", e);
      });
    }.bind(this, _timeNow2, _cb2))
    .catch(function(_timeNow3, _attempt3, _cb3, e) {
      console.error("Failed to get swap estimate: ", e);

      if (this.calculatingSwapTimestamp !== _timeNow3) {
        return;
      }

      // try again
      this.fetchSwapEstimate(origFromAmount, _timeNow3, _attempt3 + 1, _cb3);
    }.bind(this, _timeNow2, _attempt2, _cb2));
  }

  fetchCrossChainEstimate(origFromAmount, fromAmountBN, _timeNow2, _attempt2, _cb2) {
    if (!Wallet.isConnected()) {
      // not supported in cross-chain mode
      console.log("SwapOrderSlide: Wallet not connected, skipping crossChainEstimate");
      return false;
    }

    Nxtp.getTransferQuoteV2(
      +this.props.fromChain.chainId,
      this.props.from.address,
      +this.props.toChain.chainId,
      this.props.to.address,
      fromAmountBN,
      Wallet.currentAddress()
    ).then(function(_timeNow3, _cb3, response) {
      if (this.calculatingSwapTimestamp !== _timeNow3) {
        return;
      }

      Wallet.getBalance(this.props.from).then((bal) => {
        this.props.onSwapEstimateComplete(
          origFromAmount,
          window.ethers.utils.formatUnits(response?.returnAmount ?? constants.Zero, this.props.to.decimals),
          false,
          window.ethers.utils.formatUnits(bal, this.props.from.decimals),
          status
        )

        this.props.onCrossChainEstimateComplete(response.id);

        this.setState({
          calculatingSwap: false
        }, () => {
          if (_cb3) {
            _cb3();
          }

          Metrics.track("swap-estimate-result", {
            from: this.props.from,
            to: this.props.to,
            fromAmont: fromAmountBN.toString(),
            toAmount: this.props.toAmount,
            swapDistribution: this.props.swapDistribution
          });
        });
      }).catch((e) => {
        console.error("Failed to get swap estimate: ", e);
      });
    }.bind(this, _timeNow2, _cb2))
    .catch(function(_timeNow3, _attempt3, _cb3, e) {
      console.error(e);
      console.error("Failed to get swap estimate: ", e);

      if (this.calculatingSwapTimestamp !== _timeNow3) {
        return;
      }

      // try again
      this.fetchSwapEstimate(origFromAmount, _timeNow3, _attempt3 + 1, _cb3);
    }.bind(this, _timeNow2, _attempt2, _cb2));
  }

  handleTokenAmountChange(e) {
    if(!isNaN(+e.target.value)) {
      var targetAmount = e.target.value;

      // if input is in exponential format, convert to decimal.
      // we do this because all of our logic does not like the exponential format
      // when converting to BigNumber.
      // Otherwise we take the raw number as is, otherwise you get funky
      // input behaviour (i.e disappearing trailing zeros in decimals)
      if (targetAmount.toLowerCase().includes("e")) {
        targetAmount = SwapFn.validateEthValue(this.props.from, targetAmount);
      }

      if (!SwapFn.isValidParseValue(this.props.from, targetAmount)) {
        // do nothing for now.
        // we don't want to interrupt the INPUT experience,
        // as it moves the cursor around. we correct the value at the Submit step,
        // in the higher-order component SwapWidget.jsx
      }

      Metrics.track("swap-token-value", {
        value: targetAmount,
        from: this.props.from,
        to: this.props.to
      });

      this.fetchSwapEstimate(targetAmount);
    }
  }

  validateOrderForm() {
    return (this.props.from && this.props.to &&
      this.props.fromAmount && this.props.fromAmount.length > 0 &&
      this.props.toAmount && this.props.toAmount.length > 0 &&
      !this.state.calculatingSwap);
  }

  hasSufficientBalance() {
    if (Wallet.isConnected() &&
      this.props.availableBalance &&
      this.props.fromAmount && this.props.from) {

      var balBN = BN(this.props.availableBalance);
      var fromBN = BN(this.props.fromAmount);
      return fromBN.lte(balBN);
    } else {
      return true;
    }
  }

  handleSubmit(e) {
    if (!Wallet.isConnected()) {
      EventManager.emitEvent('promptWalletConnect', 1);
    }

    else if (!SwapFn.isValidParseValue(this.props.from, this.props.fromAmount)) {
      var correctAmt = SwapFn.validateEthValue(this.props.from, this.props.fromAmount);
      this.fetchSwapEstimate(correctAmt, undefined, undefined, this.props.handleSubmit);
    }

    else if (this.validateOrderForm()) {
      EventManager.emitEvent('networkHoverableUpdated', {hoverable: false});
      this.props.handleSubmit();
    }
  }

  handleTokenSwap(e) {
    if (!this.state.calculatingSwap) {
      this.props.onSwapTokens(e);
    }
  }

  handleNetworkDropdownChange(isFrom) {
    return function (network) {
      if (network.enabled) {
        Sentry.addBreadcrumb({
          message: "Action: Network Changed: " + network.name
        });

        this.props.handleCrossChainChange(isFrom, network);
      }
    }.bind(this);
  }

  handleMax() {
    if (Wallet.isConnected() && this.props.from.address) {
      Wallet.getBalance(this.props.from)
        .then(function(bal) {
          _.defer(function() {
            // balance is in WEI and is a BigNumber
            this.fetchSwapEstimate(
              window.ethers.utils.formatUnits(bal, this.props.from.decimals)
            )
          }.bind(this))
        }.bind(this))
        .catch(function(e) {
          console.error("Failed to get balance for MAX", e);
          // try again
          this.handleMax();
        }.bind(this));
    }
  }

  renderTokenInput(target, token) {
    if (!token) {
      return (<div />);
    }

    var isFrom = (target === "from");

    return (
      <div className="level is-mobile">
        <div className={classnames("level is-mobile is-narrow my-0 mr-2", {
          "is-hidden": !this.props.crossChainEnabled
        })}>
        <NetworkDropdown
          crossChain={true}
          selected={isFrom ? this.props.fromChain : this.props.toChain}
          className={classnames({ "is-up": !isFrom })}
          handleDropdownClick={this.handleNetworkDropdownChange(isFrom).bind(this)}
          compact={true} />
      </div>
      <div className="level is-mobile is-narrow my-0 token-dropdown"
        onClick={this.props.handleSearchToggle(target)}>
        <TokenIconBalanceGroupView
          network={isFrom ? this.props.fromChain : this.props.toChain}
          token={token}
          refresh={this.props.refresh}
        />
        <div className="level-item">
          <span className="icon-down">
            <ion-icon name="chevron-down"></ion-icon>
          </span>
        </div>
      </div>
      <div className="level-item is-flex-grow-1 is-flex-shrink-1 is-flex-direction-column is-align-items-flex-end">
        <div className="field" style={{ width: "100%", maxWidth: "250px" }}>
          <div
            className={classnames("control", {
              "is-loading": !isFrom && this.state.calculatingSwap
            })}
            style={{ width: "100%" }}
          >
            <input
              onChange={this.handleTokenAmountChange}
              value={
                (!isFrom && this.state.errored) ?
                  "" :
                  (this.props[`${target}Amount`] || "")
              }
              type="number"
              min="0"
              lang="en"
              step="0.000000000000000001"
              className={classnames("input is-medium", {
                "is-danger": isFrom && !this.hasSufficientBalance(),
                "is-to": !isFrom,
                "is-from": isFrom,
                "is-danger": !isFrom && this.state.errored
              })}
              placeholder="0.0"
              disabled={!isFrom}
            />

          {isFrom &&
              (<div className="max-btn" onClick={this.handleMax}>Max</div>)}

              {isFrom && !this.hasSufficientBalance() &&
                  (<div className="warning-funds">
                    Insufficient funds
                  </div>)}

                  {!isFrom && this.state.errored &&
                      (<div className="warning-funds">
                        Estimate failed. Try again
                      </div>)}
                    </div>
                  </div>
                </div>
              </div>
    );
  }

  render() {
    return (
      <div className="page page-view-order">
        <div className="page-inner">
          <div className="level is-mobile">
            <div className="level-left is-flex-grow-1">
            </div>

            <div className="level-right">
              <div className="level-item">
                <span
                  className="icon clickable settings-icon"
                  onClick={this.props.handleSettingsToggle}>
                  <ion-icon name="settings-outline"></ion-icon>
                </span>
              </div>
            </div>
          </div>

          <div className="notification is-white my-0">
            <div className="text-gray-stylized">
              <span>You Pay</span>
            </div>
            {this.renderTokenInput("from", this.props.from)}
          </div>

          <div className="swap-icon-wrapper">
            <div className="swap-icon-v2 icon" onClick={this.handleTokenSwap}>
              <ion-icon name="swap-vertical-outline"></ion-icon>
            </div>

            <div className="swap-icon is-hidden" onClick={this.handleTokenSwap}>
              <i className="fas fa-long-arrow-alt-up"></i>
              <i className="fas fa-long-arrow-alt-down"></i>
            </div>
          </div>

          <div className="notification is-white bottom">
            <div className="text-gray-stylized">
              <span>You Receive</span>
            </div>
            {this.renderTokenInput("to", this.props.to)}
          </div>

          <div
            className={classnames("hint--large", "token-dist-expand-wrapper", {
              "hint--top": this.props.swapDistribution,
              "expand": this.props.swapDistribution
            })}
            aria-label="We have queried multiple exchanges to find the best possible pricing for this swap. The below routing chart shows which exchanges we used to achieve the best swap."
          >
            <div className="token-dist-hint-text">
              <span>Routing Distribution</span>
              <span className="hint-icon">?</span>
            </div>
            <TokenSwapDistribution
              parts={this.props.swapDistribution}/>
          </div>

          <div>
            <button
              disabled={Wallet.isConnected() && !this.validateOrderForm()}
              className="button is-primary is-fullwidth is-medium custom-btn"
              onClick={this.handleSubmit}
            >
              {Wallet.isConnected() ? "Review Order" : "Connect Wallet"}
            </button>
          </div>
        </div>
      </div>
    );
  }

}

