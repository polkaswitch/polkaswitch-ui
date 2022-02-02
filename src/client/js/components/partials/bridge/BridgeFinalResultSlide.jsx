import React, { Component } from 'react';
import classnames from 'classnames';
import TxExplorerLink from '../TxExplorerLink';

export default class BridgeFinalResultSlide extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="page page-stack page-view-results">
        <div className="page-inner">
          <div className="level is-mobile">
            <div className="level-left">
              <div className="level-item">
                <span className="icon ion-icon clickable" onClick={this.props.handleDismiss}>
                  <ion-icon name="arrow-back-outline" />
                </span>
              </div>
            </div>
          </div>

          <div
            className={classnames('centered-view', {
              failed: !this.props.transactionSuccess,
            })}
          >
            <div className="icon">
              {this.props.transactionSuccess ? (
                <ion-icon name="rocket-outline" />
              ) : (
                <ion-icon name="alert-circle-outline" />
              )}
            </div>
            <div className="title">
              {this.props.transactionSuccess ? 'Transaction Submitted' : 'Transaction Failed'}
            </div>
            <div className="details">
              <div>
                {this.props.transactionSuccess && (
                  <div>
                    <div>
                      Sent to the blockchain and pending confirmation.
                      <br />
                      Check notifications drawer for more updates.
                    </div>

                    <br />
                    <TxExplorerLink network={this.props.toChain} hash={this.props.transactionHash}>
                      View on Explorer <ion-icon name="open-outline" />
                    </TxExplorerLink>
                  </div>
                )}
                {!this.props.transactionSuccess && <div>Please try again</div>}
              </div>
            </div>
          </div>

          <div>
            <button className="button is-primary is-fullwidth is-medium" onClick={this.props.handleDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }
}
