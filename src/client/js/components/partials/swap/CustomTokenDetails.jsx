import React, { Component } from 'react';
import classnames from 'classnames';

export default class CustomTokenDetails extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      errored, symbol, name, decimals
    } = this.props;
    return (
      <div
        style={{ marginTop: 10 }}
        className={classnames('swap-trans-details', {
          'is-hidden': errored,
        })}
      >
        <div className="level is-mobile detail">
          <div className="level-left">
            <div className="level-item">
              <div className="detail-title">
                <span>Token Name</span>
              </div>
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <div className="detail-value">{name}</div>
            </div>
          </div>
        </div>
        <div className={classnames('level is-mobile detail')}>
          <div className="level-left">
            <div className="level-item">
              <div className="detail-title">
                <span>Token Symbol</span>
              </div>
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <div className="detail-value">{symbol}</div>
            </div>
          </div>
        </div>
        <div className={classnames('level is-mobile detail')}>
          <div className="level-left">
            <div className="level-item">
              <div className="detail-title">
                <span>Token Decimals</span>
              </div>
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <div>
                <div className="detail-value">{decimals}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
