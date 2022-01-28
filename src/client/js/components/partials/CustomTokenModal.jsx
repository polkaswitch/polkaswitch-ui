import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';
import * as ethers from 'ethers';
import EventManager from '../../utils/events';
import Wallet from '../../utils/wallet';
import TokenListManager from '../../utils/tokenList';
import CustomTokenDetails from './swap/CustomTokenDetails';
import CustomTokenWarning from './swap/CustomTokenWarning';

const Utils = ethers.utils;

export default class CustomTokenModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fetchingTokenInfo: false,
      errored: true,
      errorMsg: '',
      open: false,
      customTokenAddr: '',
      symbol: '',
      name: '',
      decimals: 0,
    };
    this.addedToken = null;
    this.handleClose = this.handleClose.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.onTokenAddrChange = this.onTokenAddrChange.bind(this);
    this.fetchDecimals = this.fetchDecimals.bind(this);
    this.fetchSymbol = this.fetchSymbol.bind(this);
    this.fetchName = this.fetchName.bind(this);
  }

  componentDidMount() {
    this.customTokenPrompt = EventManager.listenFor(
      'addCustomToken',
      this.handleOpen,
    );
  }

  componentWillUnmount() {
    this.customTokenPrompt.unsubscribe();
  }

  handleOpen(e) {
    this.setState({
      open: true,
    });
  }

  handleClose(e) {
    if (!_.isNull(this.addedToken)) {
      this.props.handleTokenChange(this.addedToken);
    }
    this.setState({
      open: false,
      customTokenAddr: '',
      errorMsg: '',
      errored: true,
      fetchingTokenInfo: false,
    });
  }

  handleCustomBtn = (e) => {
    const {
      symbol, name, decimals, customTokenAddr
    } = this.state;
    const customToken = {
      symbol,
      name,
      decimals,
      isCustomAddr: true,
      address: customTokenAddr,
    };

    TokenListManager.addCustomToken(customToken);
    this.addedToken = customToken;
    this.handleClose();
  };

  onTokenAddrChange(e) {
    this.setState({
      customTokenAddr: e.target.value,
      fetchingTokenInfo: true,
    });
    const network = TokenListManager.getCurrentNetworkConfig();
    const _query = e.target.value.toLowerCase().trim();
    let filteredTokens = [];

    if (_query.length > 0) {
      // Check vaildation of address
      if (Utils.isAddress(_query)) {
        filteredTokens = _.first(
          _.filter(
            TokenListManager.getTokenListForNetwork(network),
            (t) => t.address && t.address.toLowerCase().includes(_query),
          ),
          1,
        );

        if (filteredTokens.length > 0) {
          this.setState({
            fetchingTokenInfo: false,
            errored: true,
            errorMsg: 'Token with this address already added',
          });
          this.addedToken = filteredTokens[0];
        } else {
          // fetch
          if (Wallet.isConnected()) {
            this.fetchSymbol(0, _query);
          } else {
            console.log('is not connected');
          }
        }
      } else {
        this.setState({
          fetchingTokenInfo: false,
          errored: true,
          errorMsg: 'Invalid token address',
        });
      }
    } else {
      this.setState({
        fetchingTokenInfo: false,
        errored: true,
        errorMsg: '',
      });
    }
  }

  fetchSymbol(attempt, tokenAddr) {
    if (!attempt) {
      attempt = 0;
    } else if (attempt > 2) {
      this.setState({
        fetchingTokenInfo: false,
        errored: true,
        errorMsg: 'Can not find token with symbol at the given address',
      });
      return;
    }
    Wallet.getSymbol(tokenAddr)
      .then(
        (symbol) => {
          this.setState({ symbol });
          this.fetchName(0, tokenAddr);
        },
      )
      .catch(
        (e) => {
          // try again
          console.error('Failed to fetch symbol', e);
          _.defer(
            () => {
              this.fetchSymbol(attempt + 1, tokenAddr);
            },
          );
        },
      );
  }

  fetchName(attempt, tokenAddr) {
    if (!attempt) {
      attempt = 0;
    } else if (attempt > 2) {
      this.setState({
        fetchingTokenInfo: false,
        errored: true,
        errorMsg: 'Can not find token with name at the given address',
      });
      return;
    }
    Wallet.getName(tokenAddr)
      .then(
        (name) => {
          this.setState({ name });
          this.fetchDecimals(0, tokenAddr);
        },
      )
      .catch(
        (e) => {
          // try again
          console.error('Failed to fetch name', e);
          _.defer(
            () => {
              this.fetchName(attempt + 1, tokenAddr);
            },
          );
        },
      );
  }

  fetchDecimals(attempt, tokenAddr) {
    if (!attempt) {
      attempt = 0;
    } else if (attempt > 2) {
      this.setState({
        fetchingTokenInfo: false,
        errored: true,
        errorMsg: 'Can not find token with decimals at the given address',
      });
      return;
    }
    Wallet.getDecimals(tokenAddr)
      .then(
        (decimals) => {
          this.setState({
            fetchingTokenInfo: false,
            decimals,
            errored: false,
          });
        },
      )
      .catch(
        (e) => {
          // try again
          console.error('Failed to fetch decimals', e);
          _.defer(
            () => {
              this.fetchDecimals(attempt + 1, tokenAddr);
            },
          );
        },
      );
  }

  render() {
    const {
      open,
      errored,
      customTokenAddr,
      symbol,
      name,
      decimals,
      errorMsg,
      fetchingTokenInfo,
    } = this.state;
    return (
      <div className={classnames('modal', { 'is-active': open })}>
        <div onClick={this.handleClose} className="modal-background" />
        <div className="modal-content">
          <div className="modal-dropdown-options box">
            <div className="level is-mobile">
              <div className="level-left">
                <div className="level-item">
                  <span
                    className="icon ion-icon clickable is-medium"
                    onClick={this.handleClose}
                  >
                    <ion-icon name="close-outline" />
                  </span>
                </div>
                <div className="level-item">
                  <b className="widget-title">Add Custom Token</b>
                </div>
              </div>
            </div>
            <hr />
            <CustomTokenWarning />
            <div className="text-gray-stylized" style={{ marginBottom: 10 }}>
              <span>Token address</span>
            </div>
            <div className="level is-mobile control">
              <input
                className="input is-medium"
                value={customTokenAddr}
                placeholder="0x000...."
                onChange={this.onTokenAddrChange}
              />
            </div>
            <div
              className={classnames('warning-funds-view', {
                'is-hidden': !errored,
              })}
            >
              {errorMsg}
            </div>
            <CustomTokenDetails
              errored={errored}
              symbol={symbol}
              name={name}
              decimals={decimals}
            />
            <div>
              <button
                className={classnames(
                  'button is-primary is-fullwidth is-medium',
                  {
                    'is-loading': fetchingTokenInfo,
                  },
                )}
                disabled={!Wallet.isConnected() || errored}
                onClick={this.handleCustomBtn.bind(this)}
              >
                Add Custom Token
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
