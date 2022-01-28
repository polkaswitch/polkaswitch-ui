import React, { Component } from 'react';
import _ from 'underscore';
import numeral from 'numeral';
import Wallet from '../../utils/wallet';

export default class TokenSymbolBalance extends Component {
  constructor(props) {
    super(props);
    this.state = {
      balance: false,
      errored: false,
      loading: true,
      timestamp: Date.now(),
    };

    this.log = this.log.bind(this);
    this.fetchBalance = this.fetchBalance.bind(this);
  }

  log(...msg) {
    console.log(
      'TokenSymbolBalance:',
      this.props.token?.symbol,
      this.props.token?.address,
      this.props.network?.name,
      ...msg,
    );
  }

  componentDidMount() {
    this.fetchBalance();
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.token.address !== prevProps.token.address
      || this.props.network?.chainId !== prevProps.network?.chainId
      || this.props.refresh !== prevProps.refresh
    ) {
      this.setState(
        {
          timestamp: Date.now(),
          loading: true,
          balance: false,
          errored: false,
        },
        this.fetchBalance.bind(this),
      );
    }
  }

  fetchBalance(attempt) {
    if (!attempt) {
      attempt = 0;
    } else if (attempt > window.MAX_RETRIES) {
      this.setState({
        errored: true,
        loading: false,
      });
      this.log('Network Failure');
      return;
    }

    if (Wallet.isConnectedToAnyNetwork()) {
      Wallet.getBalance(this.props.token, this.props.network)
        .then(function (_ts, bal) {
          if (this.state.timestamp != _ts) {
            return;
          }

          // balance is in WEI and is a BigNumber
          this.setState({
            balance: bal,
            errored: false,
            loading: false,
          });
        }.bind(this, this.state.timestamp),)
        .catch(
          function (_ts, e) {
            // try again
            this.log('Failed to fetch balance', e);
            if (this.state.timestamp != _ts) {
              return;
            }

            this.fetchBalance(attempt + 1);
          }.bind(this, this.state.timestamp),
        );
    } else {
      this.log('Wallet not connected');
      this.setState({
        errored: true,
        loading: false,
      });
    }
  }

  render() {
    let balOutput;
    let fullOutput;
    const Utils = window.ethers.utils;

    const renderBalFn = function () {
      return numeral(
        Utils.formatUnits(this.state.balance, this.props.token.decimals),
      ).format('0.0000a');
    }.bind(this);

    if (this.state.loading) {
      balOutput = '--';
      fullOutput = '';
    } else if (this.state.errored) {
      if (Wallet.isConnected() && this.state.balance) {
        fullOutput = Utils.formatUnits(
          this.state.balance,
          this.props.token.decimals,
        );
        balOutput = fullOutput;
      } else {
        balOutput = 'N/A';
        fullOutput = '';
      }
    } else if (this.state.balance) {
      if (this.state.balance.isZero()) {
        balOutput = '0.0';
        fullOutput = balOutput;
      } else if (
        this.state.balance.lt(
          Utils.parseUnits('0.0001', this.props.token.decimals),
        )
      ) {
        balOutput = '< 0.0001';
        fullOutput = Utils.formatUnits(
          this.state.balance,
          this.props.token.decimals,
        );
      } else {
        fullOutput = Utils.formatUnits(
          this.state.balance,
          this.props.token.decimals,
        );
        balOutput = fullOutput;
      }
    } else {
      balOutput = '--';
      fullOutput = '';
    }

    return (
      <div
        className="token-symbol-wrapper hint--bottom"
        aria-label={
          fullOutput ? `Balance: ${fullOutput}` : 'Balance unavailable'
        }
      >
        <div className="symbol">{this.props.token.symbol}</div>
        <div className="balance truncate">{balOutput}</div>
      </div>
    );
  }
}
