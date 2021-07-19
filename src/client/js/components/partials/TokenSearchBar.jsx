import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';

import TokenIconImg from './TokenIconImg';
import CustomScroll from 'react-custom-scroll';

import EventManager from '../../utils/events';
import Wallet from '../../utils/wallet';
import TokenListManager from '../../utils/tokenList';

import * as ethers from 'ethers';
import wallet from '../../utils/wallet';
import numeral from 'numeral';
const BigNumber = ethers.BigNumber;

export default class TokenSearchBar extends Component {
  constructor(props) {
    super(props);
    this.state = { focused: false, value: "", refresh: Date.now(), tokenBalances: {} };

    this.input = React.createRef();

    this.handleChange = this.handleChange.bind(this);
    this.handleNetworkChange = this.handleNetworkChange.bind(this);
    this.handleWalletChange = this.handleWalletChange.bind(this);
    this.handleDropdownClick = this.handleDropdownClick.bind(this);
    this.fetchBalances = this.fetchBalances.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onFocus = this.onFocus.bind(this)

    // init
    this.updateTopTokens();
  }

  componentDidMount() {
    this.mounted = true;
    this.subNetworkUpdate = EventManager.listenFor(
      'networkUpdated', this.handleNetworkChange
    );
    this.subWalletUpdated = EventManager.listenFor(
      'walletUpdated', this.handleWalletChange
    );
    this.fetchBalances();
  }

  componentWillUnmount() {
    this.mounted = false;
    this.subNetworkUpdate.unsubscribe();
    this.subWalletUpdate.unsubscribe();
  }

  componentDidUpdate(prevProps) {
    if (this.props.focused !== prevProps.focused) {
      if (this.props.focused) {
        _.defer(function() {
          window.document.dispatchEvent(new Event('fullScreenOn'));

          // wait for animation to clear;
          _.delay(function() {
            this.input.current.focus();
          }.bind(this), 200);
        }.bind(this));
      } else {
        _.defer(function() {
          window.document.dispatchEvent(new Event('fullScreenOff'));
        });
      }
    }
  }

  updateTopTokens() {
    var network = TokenListManager.getCurrentNetworkConfig();
    this.TOP_TOKENS = _.map(network.topTokens, function(v) {
      return TokenListManager.findTokenById(v)
    });
  }

  fetchBalances() {
    [...this.TOP_TOKENS, ...window.TOKEN_LIST].forEach((token) => {
      if (Wallet.isConnected()) {
        Wallet.getBalance(token)
        .then((bal) => {
          this.mounted && this.setState({tokenBalances: {...this.state.tokenBalances, [token.symbol]: {balance: bal, token: token}}});
        })
        .catch(error => console.log(error))
      }
    })
  }

  handleNetworkChange(e) {
    updateTopTokens();
    this.setState({
      refresh: Date.now()
    });
  }

  handleWalletChange(e) {
    this.setState({tokenBalances: {}});
    this.fetchBalances();
  }

  handleChange(event) {
    this.setState({value: event.target.value});
  }

  onBlur(e) {
    this.setState({ focused: false });
  }

  onFocus(e) {
    this.setState({ focused: true });
  }

  handleDropdownClick(token) {
    return function handleClick(e) {
      if (this.props.handleTokenChange) {
        this.props.handleTokenChange(token);
      }

      // wait for animation to complete
      _.delay(function() {
        this.setState({
          value: ""
        });
      }.bind(this), 400);
    }.bind(this);
  }

  renderTopList() {
    var top3 = _.first(this.TOP_TOKENS, 3);
    var rest = _.rest(this.TOP_TOKENS, 3);

    var top3Content = _.map(top3, function(v, i) {

      const tokenBalance = this.state.tokenBalances[v.symbol];
      let balanceNumber = null;
      if (tokenBalance) {
        if (tokenBalance.balance.isZero()) {
          balanceNumber = '0.0';
        } else if (tokenBalance.balance.lt(window.ethers.utils.parseUnits("0.0001", tokenBalance.token.decimals))) {
          balanceNumber = "< 0.0001";
        } else {
          balanceNumber = numeral(window.ethers.utils.formatUnits(tokenBalance.balance, tokenBalance.token.decimals)).format('0.0000a');
        }
      }

      return (
        <a href="#"
          key={i}
          onClick={this.handleDropdownClick(v)}
          className={classnames("top-item level column is-mobile")}>
          <span className="level-left my-2">
            <span className="level-item">
              <TokenIconImg
                size={35}
                token={v} />
            </span>
            <div className="token-symbol-balance-wrapper">
              <span className="has-text-grey">{v.symbol}</span>
              <span className="has-text-grey">{balanceNumber}</span>
            </div>
          </span>
        </a>
      );
    }.bind(this));

    return (
      <div className="token-top-list">
        <div className="text-gray-stylized">
          <span>Popular</span>
        </div>
        <div className="columns is-mobile">
          {top3Content}
        </div>
        {this.renderDropList(rest)}
    </div>
    );
  }

  renderDropList(filteredTokens) {
    return _.map(filteredTokens, function(v, i) {
      const tokenBalance = this.state.tokenBalances[v.symbol];
      let balanceNumber = null;
      if (tokenBalance) {
        if (tokenBalance.balance.isZero()) {
          balanceNumber = '0.0';
        } else if (tokenBalance.balance.lt(window.ethers.utils.parseUnits("0.0001", tokenBalance.token.decimals))) {
          balanceNumber = "< 0.0001";
        } else {
          balanceNumber = numeral(window.ethers.utils.formatUnits(tokenBalance.balance, tokenBalance.token.decimals)).format('0.0000a');
        }
      }

      return (
        <a href="#"
          key={i}
          onClick={this.handleDropdownClick(v)}
          className={classnames("dropdown-item level is-mobile")}>
          <span className="level-left my-2">
            <span className="level-item">
              <TokenIconImg
                size={35}
                token={v} />
            </span>
            <span className="level-item">{v.name}</span>
            <div className="token-symbol-balance-wrapper">
              <span className="has-text-grey">{v.symbol}</span>
              <span className="has-text-grey">{balanceNumber}</span>
            </div>

          </span>
        </a>
      )
    }.bind(this));
  }

  renderEmptyList() {
    return (
      <div className="empty-state">
        <div>
          <div className="empty-text has-text-info">Unrecognized Token</div>
          <div className="icon has-text-info-light">
            <ion-icon name="help-outline"></ion-icon>
          </div>
        </div>
      </div>
    )
  }

  render() {
    var filteredTokens = [];
    var _query = this.state.value.toLowerCase().trim();
    var showDropdown = _query.length > 0 && this.state.focused;
    var dropContent;

    if (_query.length > 0) {
      filteredTokens = _.first(_.filter(window.TOKEN_LIST, function(t) {
        return (t.symbol) && (
          (t.symbol && t.symbol.toLowerCase().includes(_query)) ||
          (t.name && t.name.toLowerCase().includes(_query))
        );
      }), 10);

      if (filteredTokens.length > 0) {
        dropContent = this.renderDropList(filteredTokens);
      } else {
        dropContent = this.renderEmptyList();
      }
    } else {
      dropContent = this.renderTopList();
    }

    var dropList;

    if (this.props.inline) {
      dropList = (
        <div className="token-inline-list">
          <CustomScroll heightRelativeToParent="100%">
            {dropContent}
          </CustomScroll>
          <div className="token-inline-list-bottom">&nbsp;</div>
        </div>
      );
    } else {
      dropList = (
        <div className="dropdown-menu" id="dropdown-menu"
          role="menu" style={{ width: "100%" }}>
          <div className="dropdown-content">
            {dropContent}
          </div>
        </div>
      );
    }

    return (
      <div
        className={classnames("token-search-bar", {
          "is-active": showDropdown,
          "dropdown": !this.props.inline
        })}
        style={{ width: this.props.width || "100%" }}>
        <div
          className={classnames({
            "dropdown-trigger": !this.props.inline
          })}
          style={{ width: "100%" }}>
          <div className="field" style={{ width: "100%" }}>
            <div className="control has-icons-left has-icons-right">
              <input
                ref={this.input}
                className="input is-medium"
                onFocus={this.onFocus} onBlur={this.onBlur}
                value={this.state.value} onChange={this.handleChange}
                placeholder={this.props.placeholder || "Search by token name, symbol, or address ..."} />
              <span className="icon is-left">
                <ion-icon name="search-outline"></ion-icon>
              </span>
              {this.props.handleClose && (
                <span className="icon close-icon is-right" onClick={this.props.handleClose}>
                  <ion-icon name="close-outline"></ion-icon>
                </span>
              )}
            </div>
          </div>
        </div>
        {dropList}
      </div>
    );
  }
}

