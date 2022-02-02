import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';
import numeral from 'numeral';
import * as ethers from 'ethers';
import Wallet from '../../../utils/wallet';
import EventManager from '../../../utils/events';

const Utils = ethers.utils;

export default class SwapTransactionDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      minReturn: '--',
      priceImpact: '--',
      transactionEstimate: '--',
      highSlippage: false,
    };
    this.subscribers = [];
    this.handleSettingsChange = this.handleSettingsChange.bind(this);
  }

  componentDidMount() {
    this.subscribers.push(EventManager.listenFor('walletUpdated', this.handleSettingsChange));
    this.updateValues();
  }

  componentWillUnmount() {
    this.subscribers.forEach((v) => {
      EventManager.unsubscribe(v);
    });
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.fromAmount !== this.props.fromAmount ||
      prevProps.from.symbol !== this.props.from.symbol ||
      prevProps.to.symbol !== this.props.to.symbol
    ) {
      this.updateValues();
    }
  }

  handleSettingsChange() {
    this.initState();
    this.updateValues();
  }

  initState() {
    this.setState({
      minReturn: '--',
      priceImpact: '--',
      transactionEstimate: '--',
      highSlippage: false,
    });
  }

  async updateValues() {
    if (Wallet.isConnected()) {
      console.log('## updateValues ### ', 'called');
      const fromAmount = SwapFn.validateEthValue(this.props.from, this.props.fromAmount);

      await SwapFn.calculateMinReturn(
        this.props.from,
        this.props.to,
        Utils.parseUnits(fromAmount, this.props.from.decimals),
      )
        .then(({ minReturn }) => {
          _.defer(() => {
            this.setState({ minReturn });
          });
        })
        .catch((r) => {
          _.defer(() => {
            this.setState({ minReturn: '--' });
          });
        });

      await SwapFn.calculatePriceImpact(
        this.props.from,
        this.props.to,
        Utils.parseUnits(fromAmount, this.props.from.decimals),
      )
        .then((priceImpact) => {
          _.defer(() => {
            this.setState({
              highSlippage: priceImpact * 100.0 > SwapFn.getSetting().slippage,
              priceImpact: (priceImpact * 100.0).toFixed(5),
            });
          });
        })
        .catch((r) => {
          _.defer(() => {
            this.setState({
              priceImpact: '--',
              highSlippage: false,
            });
          });
        });

      const distBN = _.map(this.props.swapDistribution, (e) => window.ethers.utils.parseUnits(`${e}`, 'wei'));

      await SwapFn.calculateEstimatedTransactionCost(
        this.props.from,
        this.props.to,
        Utils.parseUnits(fromAmount, this.props.from.decimals),
        distBN,
      )
        .then((v) => {
          _.defer(() => {
            this.setState({ transactionEstimate: v });
          });
        })
        .catch((r) => {
          _.defer(() => {
            this.setState({ transactionEstimate: '--' });
          });
        });
    }
  }

  render() {
    return (
      <div className="swap-trans-details">
        <div
          className="level is-mobile is-narrow detail hint--bottom hint--medium"
          aria-label="The calculated exchange rate for this transaction"
        >
          <div className="level-left">
            <div className="level-item">
              <div className="detail-title">
                <span>Rate</span>
                <span className="hint-icon">?</span>
              </div>
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <div className="detail-value">
                1 {this.props.from.symbol} &asymp;{' '}
                {numeral(this.props.toAmount / this.props.fromAmount).format('0.0[0000000000000]')}{' '}
                {this.props.to.symbol}
              </div>
            </div>
          </div>
        </div>
        <div
          className={classnames('level is-mobile is-narrow detail hint--bottom hint--medium')}
          aria-label="Calculated based on the Slippage Tolerance. If the return amount is below this minimum threshold, the transaction is reverted"
        >
          <div className="level-left">
            <div className="level-item">
              <div className="detail-title">
                <span>Minimum Return</span>
                <span className="hint-icon">?</span>
              </div>
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <div className="detail-value">
                {this.state.minReturn} {this.props.to.symbol}
              </div>
            </div>
          </div>
        </div>
        <div
          className={classnames('level is-mobile is-narrow detail hint--bottom hint--medium', {
            'is-danger': this.state.highSlippage,
          })}
          aria-label="Expected slippage in price on swap. The difference between the current market price and the price you will actually pay when performing this swap"
        >
          <div className="level-left">
            <div className="level-item">
              <div className="detail-title">
                <span>Price Impact</span>
                <span className="hint-icon">?</span>
              </div>
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <div>
                <div className="detail-value">
                  <span
                    className={classnames('has-text-danger has-text-right', {
                      'is-hidden': true,
                    })}
                  >
                    (
                    <span className="icon">
                      <ion-icon name="warning-outline" />
                    </span>
                    <span>High Slippage)&nbsp;&nbsp;</span>
                  </span>
                  <span>-{this.state.priceImpact}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className={classnames('level is-mobile is-narrow detail hint--bottom hint--medium')}
          aria-label="Press back button and modify your slippage tolerance in the top-right settings on the main order form"
        >
          <div className="level-left">
            <div className="level-item">
              <div className="detail-title">
                <span>Slippage Tolerance</span>
                <span className="hint-icon">?</span>
              </div>
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <div>
                <div className="detail-value">
                  <span>{SwapFn.getSetting().slippage}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className="level is-mobile is-narrow detail hint--bottom hint--medium"
          aria-label="Total transaction cost for this swap which includes Gas fees and Liquidity Provider Fees"
        >
          <div className="level-left">
            <div className="level-item">
              <div className="detail-title">
                <span>Transaction Cost</span>
                <span className="hint-icon">?</span>
              </div>
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <div className="detail-value">
                {this.state.transactionEstimate} {window.NATIVE_TOKEN.symbol}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
