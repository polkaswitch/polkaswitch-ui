import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import classnames from 'classnames';
import BN from 'bignumber.js';
import * as Sentry from '@sentry/react';
import TokenIconBalanceGroupView from '../TokenIconBalanceGroupView';
import TokenSwapDistribution from './TokenSwapDistribution';
import Wallet from '../../../utils/wallet';
import Metrics from '../../../utils/metrics';
import EventManager from '../../../utils/events';
import SwapFn from '../../../utils/swapFn';

export default class SwapOrderSlide extends Component {
  constructor(props) {
    super(props);
    this.state = {
      calculatingSwap: false,
      errored: false,
      errorMsg: false,
    };

    this.calculatingSwapTimestamp = Date.now();

    this.handleTokenAmountChange = this.handleTokenAmountChange.bind(this);
    this.validateOrderForm = this.validateOrderForm.bind(this);
    this.fetchSwapEstimate = this.fetchSwapEstimate.bind(this);
    this.fetchSingleChainSwapEstimate = this.fetchSingleChainSwapEstimate.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleMax = this.handleMax.bind(this);
    this.handleTokenSwap = this.handleTokenSwap.bind(this);
  }

  componentDidUpdate(prevProps) {
    const { from, to, refresh, fromAmount } = this.props;
    const { calculatingSwap } = this.state;
    if (
      from?.address !== prevProps.from?.address ||
      to?.address !== prevProps.to?.address ||
      refresh !== prevProps.refresh ||
      (this.props.fromAmount !== prevProps.fromAmount && !calculatingSwap)
    ) {
      if (fromAmount) {
        this.fetchSwapEstimate(fromAmount);
      }
    }
  }

  handleTokenAmountChange(e) {
    const { from, to } = this.props;

    if (!Number.isNaN(+e.target.value)) {
      let targetAmount = e.target.value;

      // if input is in exponential format, convert to decimal.
      // we do this because all of our logic does not like the exponential format
      // when converting to BigNumber.
      // Otherwise we take the raw number as is, otherwise you get funky
      // input behaviour (i.e disappearing trailing zeros in decimals)
      if (targetAmount.toLowerCase().includes('e')) {
        targetAmount = SwapFn.validateEthValue(from, targetAmount);
      }

      if (!SwapFn.isValidParseValue(from, targetAmount)) {
        // do nothing for now.
        // we don't want to interrupt the INPUT experience,
        // as it moves the cursor around. we correct the value at the Submit step,
        // in the higher-order component SwapWidget.jsx
      }

      Metrics.track('swap-token-value', {
        value: targetAmount,
        from,
        to,
      });

      this.fetchSwapEstimate(targetAmount);
    }
  }

  handleSubmit() {
    const { handleSubmit, from, fromAmount } = this.props;

    if (!Wallet.isConnected()) {
      EventManager.emitEvent('promptWalletConnect', 1);
    } else if (!SwapFn.isValidParseValue(from, fromAmount)) {
      const correctAmt = SwapFn.validateEthValue(from, fromAmount);
      this.fetchSwapEstimate(correctAmt, undefined, undefined, handleSubmit);
    } else if (this.validateOrderForm()) {
      EventManager.emitEvent('networkHoverableUpdated', { hoverable: false });
      handleSubmit();
    }
  }

  handleTokenSwap(e) {
    const { onSwapTokens } = this.props;
    const { calculatingSwap } = this.state;

    if (!calculatingSwap) {
      onSwapTokens(e);
    }
  }

  handleNetworkDropdownChange(isFrom) {
    const { handleCrossChainChange } = this.props;

    const func = (network) => {
      if (network.enabled) {
        Sentry.addBreadcrumb({
          message: `Action: Network Changed: ${network.name}`,
        });

        handleCrossChainChange(isFrom, network);
      }
    };

    return func;
  }

  handleMax() {
    const { from } = this.props;

    if (Wallet.isConnected() && from.address) {
      Wallet.getBalance(from)
        .then((bal) => {
          _.defer(() => {
            // balance is in WEI and is a BigNumber
            this.fetchSwapEstimate(window.ethers.utils.formatUnits(bal, from.decimals));
          });
        })
        .catch((e) => {
          console.error('Failed to get balance for MAX', e);
          // try again
          this.handleMax();
        });
    }
  }

  hasSufficientBalance() {
    const { availableBalance, fromAmount, from } = this.props;

    if (Wallet.isConnected() && availableBalance && fromAmount && from) {
      const balBN = BN(availableBalance);
      const fromBN = BN(fromAmount);
      return fromBN.lte(balBN);
    }
    return true;
  }

  validateOrderForm() {
    const { from, to, fromAmount, toAmount } = this.props;
    const { calculatingSwap } = this.state;

    return from && to && fromAmount && fromAmount.length > 0 && toAmount && toAmount.length > 0 && !calculatingSwap;
  }

  fetchSingleChainSwapEstimate(origFromAmount, fromAmountBN, _timeNow2, _attempt2, _cb2) {
    const { from, to, toAmount, swapDistribution, onSwapEstimateComplete } = this.props;

    return SwapFn.getExpectedReturn(from, to, fromAmountBN)
      .then((result) => {
        if (this.calculatingSwapTimestamp !== _timeNow2) return;

        const dist = _.map(result.distribution, (e) => (Number.isNaN(e) ? e.toNumber() : e));

        Wallet.getBalance(from)
          .then((bal) =>
            SwapFn.getApproveStatus(from, fromAmountBN).then((status) => {
              onSwapEstimateComplete(
                origFromAmount,
                window.ethers.utils.formatUnits(result.returnAmount, to.decimals),
                dist,
                window.ethers.utils.formatUnits(bal, from.decimals),
                status,
              );

              this.setState(
                {
                  calculatingSwap: false,
                },
                () => {
                  if (_cb2) {
                    _cb2();
                  }

                  Metrics.track('swap-estimate-result', {
                    from,
                    to,
                    fromAmount: fromAmountBN.toString(),
                    toAmount,
                    swapDistribution,
                  });
                },
              );
            }),
          )
          .catch((e) => {
            console.error('Failed to get swap estimate: ', e);
          });
      })
      .catch((e) => {
        console.error('Failed to get swap estimate: ', e);

        if (this.calculatingSwapTimestamp !== _timeNow2) return;

        // try again
        this.fetchSwapEstimate(origFromAmount, _timeNow2, _attempt2 + 1, _cb2);
      });
  }

  fetchSwapEstimate(origFromAmount, timeNow = Date.now(), attempt = 0, cb) {
    const { onSwapEstimateComplete, toAmount, swapDistribution, from } = this.props;
    let fromAmount = origFromAmount;

    if (attempt > window.MAX_RETRIES) {
      this.setState({
        calculatingSwap: false,
        errored: true,
        errorMsg: false,
      });
      console.error('Swap Failure: MAX RETRIES REACHED');
      return;
    }

    onSwapEstimateComplete(origFromAmount, toAmount, swapDistribution);

    if (!fromAmount || fromAmount.length === 0) {
      fromAmount = '0';
    } else {
      fromAmount = SwapFn.validateEthValue(from, fromAmount);
    }

    this.calculatingSwapTimestamp = timeNow;

    this.setState(
      {
        errored: false,
        errorMsg: false,
        calculatingSwap: true,
      },
      () => {
        const fromAmountBN = window.ethers.utils.parseUnits(fromAmount, from.decimals);

        // add delay to slow down UI snappiness
        _.delay(
          (_timeNow2, _attempt2, _cb2) => {
            if (this.calculatingSwapTimestamp !== _timeNow2) {
              return;
            }
            this.fetchSingleChainSwapEstimate(origFromAmount, fromAmountBN, _timeNow2, _attempt2, _cb2);
          },
          500,
          timeNow,
          attempt,
          cb,
        );
      },
    );
  }

  renderTokenInput(target, token) {
    if (!token) {
      return <div />;
    }

    const { fromAmount, toAmount, refresh, fromChain, toChain, handleSearchToggle } = this.props;
    const { calculatingSwap, errored, errorMsg } = this.state;
    const isFrom = target === 'from';
    const targetAmount = target === 'from' ? fromAmount : toAmount;

    return (
      <div className="level is-mobile">
        <div
          className="level is-mobile is-narrow my-0 token-dropdown"
          role="presentation"
          onClick={handleSearchToggle(target)}
        >
          <TokenIconBalanceGroupView network={isFrom ? fromChain : toChain} token={token} refresh={refresh} />
          <div className="level-item">
            <span className="icon-down">
              <ion-icon name="chevron-down" />
            </span>
          </div>
        </div>
        <div className="level-item is-flex-grow-1 is-flex-shrink-1 is-flex-direction-column is-align-items-flex-end">
          <div className="field" style={{ width: '100%', maxWidth: '250px' }}>
            <div
              className={classnames('control', {
                'is-loading': !isFrom && calculatingSwap,
              })}
              style={{ width: '100%' }}
            >
              <input
                onChange={this.handleTokenAmountChange}
                value={!isFrom && errored ? '' : targetAmount || ''}
                type="number"
                min="0"
                lang="en"
                step="0.000000000000000001"
                className={classnames('input is-medium', {
                  // "is-danger": isFrom && !this.hasSufficientBalance(),
                  'is-to': !isFrom,
                  'is-from': isFrom,
                  'is-danger': !isFrom && errored,
                })}
                placeholder="0.0"
                disabled={!isFrom}
              />

              {isFrom && (
                <div className="max-btn" role="presentation" onClick={this.handleMax}>
                  Max
                </div>
              )}

              {isFrom && !this.hasSufficientBalance() && <div className="warning-funds">Insufficient funds</div>}

              {!isFrom && errored && <div className="warning-funds">{errorMsg || 'Estimate failed. Try again'}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { handleSettingsToggle, swapDistribution, from, to } = this.props;

    return (
      <div className="page page-view-order">
        <div className="page-inner">
          <div className="level is-mobile">
            <div className="level-right">
              <div className="level-item">
                <span className="icon clickable settings-icon" role="presentation" onClick={handleSettingsToggle}>
                  <ion-icon name="settings-outline" />
                </span>
              </div>
            </div>
          </div>

          <div className="notification is-white my-0">
            <div className="text-gray-stylized">
              <span>You Pay</span>
            </div>
            {this.renderTokenInput('from', from)}
          </div>

          <div className="swap-icon-wrapper">
            <div className="swap-icon-v2 icon" role="presentation" onClick={this.handleTokenSwap}>
              <ion-icon name="swap-vertical-outline" />
            </div>

            <div className="swap-icon is-hidden" role="presentation" onClick={this.handleTokenSwap}>
              <i className="fas fa-long-arrow-alt-up" />
              <i className="fas fa-long-arrow-alt-down" />
            </div>
          </div>

          <div className="notification is-white bottom">
            <div className="text-gray-stylized">
              <span>You Receive</span>
            </div>
            {this.renderTokenInput('to', to)}
          </div>

          <div
            className={classnames('hint--large', 'token-dist-expand-wrapper', {
              'hint--top': swapDistribution,
              expand: swapDistribution,
            })}
            aria-label="We have queried multiple exchanges to find the best possible pricing for this swap. The below routing chart shows which exchanges we used to achieve the best swap."
          >
            <div className="token-dist-hint-text">
              <span>Routing Distribution</span>
              <span className="hint-icon">?</span>
            </div>
            <TokenSwapDistribution parts={swapDistribution} />
          </div>

          <div>
            <button
              type="button"
              disabled={Wallet.isConnected() && !this.validateOrderForm()}
              className="button is-primary is-fullwidth is-medium"
              onClick={this.handleSubmit}
            >
              {Wallet.isConnected() ? 'Review Order' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

SwapOrderSlide.propTypes = {
  handleCrossChainChange: PropTypes.func,
  handleSearchToggle: PropTypes.func.isRequired,
  handleSettingsToggle: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  swapDistribution: PropTypes.array,
  onSwapTokens: PropTypes.func.isRequired,
  onSwapEstimateComplete: PropTypes.func.isRequired,
  refresh: PropTypes.number.isRequired,
  from: PropTypes.objectOf(PropTypes.any).isRequired,
  to: PropTypes.objectOf(PropTypes.any).isRequired,
  fromChain: PropTypes.objectOf(PropTypes.any).isRequired,
  toChain: PropTypes.objectOf(PropTypes.any).isRequired,
  fromAmount: PropTypes.string,
  toAmount: PropTypes.string,
  availableBalance: PropTypes.string,
};

SwapOrderSlide.defaultProps = {
  fromAmount: '0',
  toAmount: '0',
  availableBalance: undefined,
  handleCrossChainChange: () => undefined,
  swapDistribution: [],
};
