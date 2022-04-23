import React, { Component } from 'react';
import classnames from 'classnames';
import BN from 'bignumber.js';
import { NxtpSdkEvents } from '@connext/nxtp-sdk';
import TokenIconBalanceGroupView from '../TokenIconBalanceGroupView';
import TokenIconImg from '../TokenIconImg';
import Metrics from '../../../utils/metrics';
import EventManager from '../../../utils/events';
import TxBridgeManager from '../../../utils/txBridgeManager';
import Nxtp from '../../../utils/nxtp';

export default class CrossSwapProcessSlide extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      finishable: false,
      complete: false,
    };

    this.handleTransfer = this.handleTransfer.bind(this);
    this.handleFinish = this.handleFinish.bind(this);
    this.handleBack = this.handleBack.bind(this);
  }

  componentDidMount() {
    this.subNxtpUpdated = EventManager.listenFor(
      'nxtpEventUpdated',
      this.handleNxtpEvent.bind(this),
    );
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.crossChainTransactionId !== this.props.crossChainTransactionId
    ) {
      this.setState({
        loading: false,
        finishable: false,
        complete: false,
      });
    }
  }

  componentWillUnmount() {
    this.subNxtpUpdated.unsubscribe();
  }

  completeProcess(hash) {
    this.setState({
      complete: true,
    });
    this.props.handleTransactionComplete(true, hash);
  }

  handleBack(e) {
    if (!this.state.loading) {
      this.props.handleBackOnConfirm();
    }
  }

  async handleCbridgeEvent(transferId) {
    if (this.state.complete) {
      return;
    }

    TxBridgeManager.transferStepTwo(
      this.props.crossChainTransactionId,
      transferId,
    ).then((resp) => {
      console.log('cBridge getTransferStatus polling', resp);

      const { data } = resp;

      if (data.src_block_tx_link) {
        this.setState({
          finishable: true,
        });
      }

      if (data.dst_block_tx_link) {
        const dstChainTxHash = data.dst_block_tx_link.split('tx/');

        this.completeProcess(dstChainTxHash[1]);

        this.stopPollingCbridge();
      }

      if (data.status === 6 || data.status === 2) {
        this.stopPollingCbridge();

        this.props.handleTransactionComplete(false, undefined);

        this.setState({
          loading: false,
        });
      }
    });
  }

  async stopPollingCbridge() {
    window.clearInterval(this.cbridgePolling);
  }

  handleNxtpEvent(status) {
    if (this.state.complete) {
      return;
    }

    if (
      status !== NxtpSdkEvents.ReceiverTransactionPrepared &&
      status !== NxtpSdkEvents.ReceiverTransactionFulfilled
    ) {
      return;
    }

    if (
      this.state.finishable &&
      Nxtp.isActiveTxFinished(this.props.crossChainTransactionId)
    ) {
      this.completeProcess(
        Nxtp.getHistoricalTx(this.props.crossChainTransactionId)
          .fulfilledTxHash,
      );
    } else if (
      !this.state.finishable &&
      Nxtp.isActiveTxFinishable(this.props.crossChainTransactionId)
    ) {
      this.setState({
        loading: false,
        finishable: true,
      });
    }
  }

  handleTransfer() {
    this.setState(
      {
        loading: true,
      },
      () => {
        TxBridgeManager.transferStepOne(this.props.crossChainTransactionId)
          .then((data) => {
            Metrics.track('bridge-started', {
              toChain: this.props.toChain,
              fromChain: this.props.fromChain,
              from: this.props.from,
              to: this.props.to,
              fromAmont: this.props.fromAmount,
            });

            if (
              TxBridgeManager.twoStepTransferRequired(
                this.props.crossChainTransactionId,
              )
            ) {
              if (data.cbridge) {
                this.cbridgePolling = window.setInterval(
                  () => this.handleCbridgeEvent(data.transferId),
                  60000,
                );
              }
              // do nothing.
              // Waiting for events to indicate ready for Step2
            } else {
              this.completeProcess(data.transactionHash);
            }
          })
          .catch((e) => {
            console.error('#### swap failed from catch ####', e);

            this.props.handleTransactionComplete(false, undefined);

            this.setState({
              loading: false,
            });
          });
      },
    );
  }

  handleFinish() {
    this.setState(
      {
        loading: true,
      },
      () => {
        TxBridgeManager.transferStepTwo(this.props.crossChainTransactionId)
          .then(() => {
            Metrics.track('bridge-complete', {
              toChain: this.props.toChain,
              fromChain: this.props.fromChain,
              from: this.props.from,
              to: this.props.to,
              fromAmont: this.props.fromAmount,
            });

            this.setState({
              loading: false,
            });
          })
          .catch((e) => {
            console.error('#### swap failed from catch ####', e);

            this.props.handleTransactionComplete(false, undefined);

            this.setState({
              loading: false,
            });
          });
      },
    );
  }

  displayValue(amount) {
    return BN(BN(amount).toPrecision(18)).toString();
  }

  hasSufficientBalance() {
    if (this.props.availableBalance) {
      const balBN = BN(this.props.availableBalance);
      const fromBN = BN(this.props.fromAmount);
      return fromBN.lte(balBN);
    }
    return false;
  }

  allowSwap() {
    return !this.state.loading && this.hasSufficientBalance();
  }

  renderReview() {
    return (
      <div>
        <div className="text-gray-stylized">
          <span>You Pay</span>
        </div>

        <div className="level is-mobile">
          <div className="level-left">
            <div className="level-item chain-icon">
              <TokenIconImg size="35" imgSrc={this.props.fromChain.logoURI} />
            </div>
            <TokenIconBalanceGroupView
              network={this.props.fromChain}
              token={this.props.from}
              refresh={this.props.refresh}
            />
          </div>

          <div className="level-right">
            <div className="level-item">
              <div>
                <div className="currency-text">
                  {this.displayValue(this.props.from, this.props.fromAmount)}
                </div>
                <div
                  className={classnames(
                    'fund-warning has-text-danger has-text-right',
                    {
                      'is-hidden': this.hasSufficientBalance(),
                    },
                  )}
                >
                  <span className="icon">
                    <ion-icon name="warning-outline" />
                  </span>
                  <span>Insufficient funds</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr />

        <div className="text-gray-stylized">
          <span>You Receive</span>
        </div>

        <div className="level is-mobile">
          <div className="level-left">
            <div className="level-item chain-icon">
              <TokenIconImg size="35" imgSrc={this.props.toChain.logoURI} />
            </div>
            <TokenIconBalanceGroupView
              network={this.props.toChain}
              token={this.props.to}
              refresh={this.props.refresh}
            />
          </div>

          <div className="level-right">
            <div className="level-item">
              <div className="currency-text">{this.props?.toAmount}</div>
            </div>
          </div>
        </div>

        <hr />
      </div>
    );
  }

  renderLoading() {
    return (
      <div className={classnames('centered-view')}>
        <div className="icon">
          <ion-icon name="hourglass-outline" />
        </div>
        <div className="title">
          {this.state.finishable ? 'Finalizing Transfer' : 'Starting Transfer'}
        </div>
        <div className="details">
          <div>
            {this.state.finishable
              ? 'We are depositing funds into the receiving chain.'
              : 'We are moving funds from the sending chain.'}
            <br />
            This step normally takes 2-3 minutes.
            <br />
            Please do not refresh browser.
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (!this.props.toAmount || !this.props.fromAmount) {
      return <div />;
    }

    let bodyContent;

    if (this.state.loading) {
      bodyContent = this.renderLoading();
    } else {
      bodyContent = this.renderReview();
    }

    return (
      <div className="page page-stack page-view-cross-process">
        <div className="page-inner">
          <div className="level is-mobile">
            <div className="level-left">
              <div className="level-item">
                <div className="level-item">
                  <span
                    className="icon ion-icon clickable"
                    onClick={this.handleBack}
                  >
                    <ion-icon name="arrow-back-outline" />
                  </span>
                </div>
              </div>
              <div className="level-item">
                <b className="widget-title">Review &amp; Submit Transfer</b>
              </div>
            </div>
          </div>

          <hr />

          {bodyContent}

          <div>
            <button
              type="button"
              className={classnames(
                'button is-primary is-fullwidth is-medium',
                {
                  'is-loading': this.state.loading,
                },
              )}
              disabled={!this.allowSwap()}
              onClick={
                this.state.finishable ? this.handleFinish : this.handleTransfer
              }
            >
              {this.state.finishable ? 'Finish Transfer' : 'Start Transfer'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
