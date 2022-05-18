import React, { Component } from 'react';
import classnames from 'classnames';
import * as ethers from 'ethers';
import BN from 'bignumber.js';
import { NxtpSdkEvents } from '@connext/nxtp-sdk';
import TokenIconBalanceGroupView from '../TokenIconBalanceGroupView';
import TokenIconImg from '../TokenIconImg';
import Wallet from '../../../utils/wallet';
import Metrics from '../../../utils/metrics';
import EventManager from '../../../utils/events';
import TxBridgeManager from '../../../utils/txBridgeManager';
import Nxtp from '../../../utils/nxtp';
import { STATUS_NAME, chainNameHandler } from '../../../utils/requests/utils';

export default class CrossSwapProcessSlide extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      finishable: false,
      complete: false,
      txId: undefined,
      signed: false,
    };

    this.handleTransfer = this.handleTransfer.bind(this);
    this.handleFinish = this.handleFinish.bind(this);
    this.handleBack = this.handleBack.bind(this);
    this.buttonText = this.buttonText.bind(this);
    this.onClickfn = this.onClickfn.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.crossChainTransactionId !== this.props.crossChainTransactionId) {
      this.setState({
        loading: false,
        finishable: false,
        complete: false,
      });
    }
  }

  componentWillUnmount() {
  }

  completeProcess(hash) {
    this.setState({
      complete: true,
    });
    this.props.handleTransactionComplete(true, hash);
  }

  handleTransactionFailure() {
    this.props.handleTransactionComplete(false, undefined);
    this.setState({
      loading: false,
    });
  }

  handleBack(e) {
    if (!this.state.loading) {
      this.props.handleBackOnConfirm();
    }
  }

  async handlePollingEvent(data, bridge) {
    const getStatusTransfer = await TxBridgeManager.getTransferStatus({
      id: data,
      userAddress: TxBridgeManager.walletAddress(this.props.fromChain.name),
      toChain: this.props.toChain.name,
      fromChain: this.props.fromChain.name,
      to: this.props.to,
      fromAmount: this.props.fromAmount,
      from: this.props.from,
      bridge,
    });

    console.log('handlePollingEvent', getStatusTransfer);

    if (!getStatusTransfer) {
      // keep polling for now, sometimes NXTP takes a moment for the TXID to appear
      return;
    }

    // setup for nxtp
    if (STATUS_NAME.pendingDestination === getStatusTransfer?.status.toLowerCase() && getStatusTransfer.needClaim) {
      this.setState({
        finishable: true,
        txId: data,
      });

      if (!this.state.signed) {
        this.setState({
          signed: true,
          loading: false,
        });
      }
    }

    if (!getStatusTransfer.needClaim) {
      if (STATUS_NAME.pendingDestination === getStatusTransfer?.status.toLowerCase()) {
        this.setState({
          finishable: true,
        });
      }
      if (STATUS_NAME.completed === getStatusTransfer?.status.toLowerCase()) {
        this.completeProcess(getStatusTransfer?.toChainTxHash);
        this.stopPollingStatus();
      }
    }
  }

  async stopPollingStatus() {
    window.clearInterval(this.statusPolling);
  }

  async handleTransfer() {
    const selectedTx = TxBridgeManager.getTx(this.props.crossChainTransactionId);
    const route = selectedTx?.bridge?.route[0];
    const bridge = selectedTx?.bridge?.route[0].bridge || 'celer';

    this.setState(
      {
        loading: true,
      },
      async () => {
        try {
          const fromChainName = this.props.fromChain.name;
          const toChainName = this.props.toChain.name;
          const { tx, txHash, fromNxtpTemp, toNxtpTemp } = await TxBridgeManager.sendTransfer({
            fromChain: fromChainName,
            from: this.props.from,
            toChain: toChainName,
            to: this.props.to,
            fromAmount: this.props.fromAmount,
            fromAddress: TxBridgeManager.walletAddress(fromChainName),
            fromTokenAccountAddress: TxBridgeManager.ataAddress(fromChainName, this.props.from.address),
            toAddress: TxBridgeManager.walletAddress(toChainName),
            toTokenAccountAddress: TxBridgeManager.ataAddress(toChainName, route.bridgeTokenAddress),
            route,
          });

          const { data, txId } = tx;
          const txIdToStatus = txId ? txId : txHash;
          this.statusPolling = window.setInterval(() => this.handlePollingEvent(txIdToStatus, bridge), 10000);
        } catch (e) {
          console.error(e);
          this.handleTransactionFailure();
        }
      },
    );
  }

  handleFinish({ txId, account }) {
    const selectedTx = TxBridgeManager.getTx(this.props.crossChainTransactionId);
    const route = selectedTx?.bridge?.route[0];
    const bridge = selectedTx?.bridge?.route[0].bridge || 'celer';

    this.setState(
      {
        loading: true,
        finishable: true,
      },
      async () => {
        let signTransactionResp = {};
        if (bridge != 'wormhole') {
          try {
            const { hash, relayerFee, useNativeTokenToClaim, signature } = await TxBridgeManager.signTransaction({
              txId,
              userAddress: Wallet.currentAddress(),
              bridge,
              account,
            });
  
            console.log('signTransctionResp', { hash, relayerFee, useNativeTokenToClaim, signature });
  
            signTransactionResp = { hash, relayerFee, useNativeTokenToClaim, signature };
          } catch (e) {
            this.handleTransactionFailure();
          }
        }

        const toChainSlug = chainNameHandler(this.props.toChain.name);
        const fromChainSlug = chainNameHandler(this.props.fromChain.name);

        try {
          const { relayerFee, useNativeTokenToClaim, signature } = signTransactionResp;

          const { claimTokensResp, txHash } = await TxBridgeManager.claimTokens({
            fromChain: { slug: fromChainSlug, chainId: this.props.fromChain.chainId },
            toChain: { slug: toChainSlug, chainId: this.props.toChain.chainId },
            userAddress: TxBridgeManager.walletAddress(toChainSlug),
            txId,
            relayerFee,
            useNativeTokenToClaim,
            signature: signature,
            bridge,
          }, this.stopPollingStatus);

          if (!claimTokensResp) {
            this.setState({
              signed: false,
            });
          }
          else if(bridge == 'wormhole') {
            this.completeProcess(txHash);
          }
        } catch (e) {
          console.log('error', e);
          this.handleTransactionFailure();
        }
      },
    );
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
                <div className="currency-text">{this.props?.fromAmount}</div>
                <div
                  className={classnames('fund-warning has-text-danger has-text-right', {
                    'is-hidden': this.hasSufficientBalance(),
                  })}
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
    const getLoadingTitle = () => {
      if (this.props.requiresTokenApproval) {
        return 'Approving Token';
      } else if (this.state.finishable) {
        return 'Finalizing Transfer';
      } else {
        return 'Starting Transfer';
      }
    }

    const getLoadingBody = () => {
      if (this.props.requiresTokenApproval) {
        return 'We are processing your approval for moving your funds.';
      } else if (this.state.finishable) {
        return 'We are depositing funds into the receiving chain.';
      } else {
        return 'We are moving funds from the sending chain.';
      }
    }

    return (
      <div className={classnames('centered-view')}>
        <div className="icon">
          <ion-icon name="hourglass-outline" />
        </div>
        <div className="title">{getLoadingTitle()}</div>
        <div className="details">
          <div>
            {getLoadingBody()}
            <br />
            This step normally takes 2-3 minutes.
            <br />
            Please do not refresh browser.
          </div>
        </div>
      </div>
    );
  }

  async approveToken() {
    this.setState({
      loading: true
    });

    const selectedTx = TxBridgeManager.getTx(this.props.crossChainTransactionId);
    const bridge = selectedTx?.bridge?.route[0].bridge || 'celer';


    const approvedToken = await TxBridgeManager.approveToken({
      fromAddress: TxBridgeManager.walletAddress(this.props.fromChain.name),
      fromChain: this.props.fromChain.name,
      from: this.props.from,
      toChain: this.props.toChain.name,
      to: this.props.to,
      bridge,
      fromAmount: this.props.fromAmount,
    });

    console.log('approvedtoken: ', approvedToken);

    this.setState({
      loading: false
    }, () => {
      if (approvedToken) {
        this.props.handleFinishedAllowance();
      }
    });
  }

  buttonText() {
    switch (true) {
      case this.props.requiresTokenApproval:
        return 'Approve Token';
      case this.state.finishable:
        return 'Finish Transfer';
      case !this.state.finishable:
        return 'Start Transfer';
      default:
        return 'Approve Token';
    }
  }

  async onClickfn() {
    switch (true) {
      case this.props.requiresTokenApproval:
        return await this.approveToken();
      case this.state.finishable:
        return this.handleFinish({ txId: this.state.txId });
      case !this.state.finishable:
        return this.handleTransfer();
      default:
        return this.handleTransfer();
    }
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
                  <span className="icon ion-icon clickable" onClick={this.handleBack}>
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
              className={classnames('button is-primary is-fullwidth is-medium', {
                'is-loading': this.state.loading,
              })}
              disabled={!this.allowSwap()}
              onClick={() => this.onClickfn()}
            >
              {this.buttonText()}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
