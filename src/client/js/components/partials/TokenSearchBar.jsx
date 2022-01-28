import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';
import CustomScroll from 'react-custom-scroll';
import numeral from 'numeral';
import { filterCircle } from 'ionicons/icons';
import TokenIconImg from './TokenIconImg';
import EventManager from '../../utils/events';
import Wallet from '../../utils/wallet';
import TokenListManager from '../../utils/tokenList';
import CustomTokenModal from './CustomTokenModal';
import TokenSearchItem from './swap/TokenSearchItem';

export default class TokenSearchBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      focused: false,
      value: '',
      refresh: Date.now(),
      tokenBalances: {},
      filteredTokens: [],
      topTokens: this.updateTopTokens(),
    };
    this.input = React.createRef();
    this.subscribers = [];
    this.handleChange = this.handleChange.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleNetworkChange = this.handleNetworkChange.bind(this);
    this.handleWalletChange = this.handleWalletChange.bind(this);
    this.handleQueueChange = this.handleQueueChange.bind(this);
    this.handleDropdownClick = this.handleDropdownClick.bind(this);
    this.handleCustomModal = this.handleCustomModal.bind(this);
    this.handleTokenChange = this.handleTokenChange.bind(this);
    this.fetchBalance = this.fetchBalance.bind(this);
    this.fetchBalances = this.fetchBalances.bind(this);
    this.getBalanceNumber = this.getBalanceNumber.bind(this);
    this.updateTokenBalances = this.updateTokenBalances.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onFocus = this.onFocus.bind(this);
  }

  componentDidMount() {
    this.mounted = true;
    this.subscribers.push(
      EventManager.listenFor('txQueueUpdated', this.handleQueueChange),
    );
    this.subscribers.push(
      EventManager.listenFor('walletUpdated', this.handleWalletChange),
    );
    this.subscribers.push(
      EventManager.listenFor('networkUpdated', this.handleNetworkChange),
    );
  }

  componentWillUnmount() {
    this.mounted = false;
    this.subscribers.forEach((v) => {
      EventManager.unsubscribe(v);
    });
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.network?.chainId !== prevProps.network?.chainId
      || _.first(this.props.tokenList) !== _.first(prevProps.tokenList)
      || this.props.tokenList?.length !== prevProps.tokenList?.length
    ) {
      this.setState({
        tokenBalances: {},
        topTokens: this.updateTopTokens(),
        refresh: Date.now(),
      });
    }

    if (this.props.focused !== prevProps.focused) {
      if (this.props.focused) {
        _.defer(
          () => {
            window.document.dispatchEvent(new Event('fullScreenOn'));

            // wait for animation to clear;
            _.delay(
              () => {
                this.input.current.focus();
              },
              200,
            );
          },
        );
      } else {
        _.defer(() => {
          window.document.dispatchEvent(new Event('fullScreenOff'));
        });
      }
    }
  }

  updateTopTokens() {
    let topTokens;

    if (!this.props.tokenList) {
      const network = this.props.network || TokenListManager.getCurrentNetworkConfig();
      topTokens = _.map(network.topTokens, (v) => TokenListManager.findTokenById(v, network));
    } else {
      topTokens = _.first(this.props.tokenList, 5);
    }

    this.fetchBalances(topTokens);
    return topTokens;
  }

  updateTokenBalances(token, bal, refresh) {
    this.mounted
      && this.setState({
        tokenBalances: {
          ...this.state.tokenBalances,
          [token.symbol]: { balance: bal, token, refresh },
        },
      });
  }

  fetchBalance(token, attempt) {
    Wallet.getBalance(token)
      .then(
        (bal) => {
          this.updateTokenBalances(token, bal, false);
        },
      )
      .catch(
        (e) => {
          // try again
          console.error('Failed to fetch balance', e);
          this.updateTokenBalances(token, 0, false);
        },
      );
  }

  fetchBalances(tokenList) {
    if (Wallet.isConnected()) {
      tokenList.forEach((token, index) => {
        _.delay(() => {
          this.fetchBalance(token);
        }, 200);
      });
    }
  }

  getBalanceNumber(token) {
    const tokenBalance = this.state.tokenBalances[token.symbol];
    let balanceNumber = null;
    if (tokenBalance && tokenBalance.balance) {
      if (tokenBalance.balance.isZero()) {
        balanceNumber = '0.0';
      } else if (
        tokenBalance.balance.lt(
          window.ethers.utils.parseUnits('0.0001', tokenBalance.token.decimals),
        )
      ) {
        balanceNumber = '< 0.0001';
      } else {
        balanceNumber = numeral(
          window.ethers.utils.formatUnits(
            tokenBalance.balance,
            tokenBalance.token.decimals,
          ),
        ).format('0.0000a');
      }
    }
    return balanceNumber;
  }

  handleNetworkChange(e) {
    if (this.mounted) {
      this.setState({
        tokenBalances: {},
        topTokens: this.updateTopTokens(),
        refresh: Date.now(),
      });
    }
  }

  handleWalletChange(e) {
    if (this.mounted) {
      this.setState({
        tokenBalances: {},
      });
      this.fetchBalances(this.state.topTokens);
    }
  }

  handleQueueChange(e) {
    if (e.data && Wallet.isConnected()) {
      this.fetchBalance(e.data.from);
      this.fetchBalance(e.data.to);
    }
  }

  handleClose(e) {
    this.props.handleClose();
    this.setState({
      value: '',
    });
  }

  handleTokenChange(token) {
    this.props.handleTokenChange(token);
    this.setState({
      value: '',
    });
  }

  handleChange(event) {
    this.setState({ value: event.target.value });
    const _query = event.target.value.toLowerCase().trim();
    if (_query.length > 0) {
      const network = this.props.network || TokenListManager.getCurrentNetworkConfig();
      const startingTokenIdList = this.props.tokenList
        || TokenListManager.getTokenListForNetwork(network);
      const filteredTokens = _.first(
        _.filter(startingTokenIdList, (t) => (
          t.symbol
            && ((t.symbol && t.symbol.toLowerCase().includes(_query))
              || (t.name && t.name.toLowerCase().includes(_query))
              || (t.address && t.address.toLowerCase().includes(_query)))
        )),
        10,
      );
      this.setState({ filteredTokens });
    }
  }

  onBlur(e) {
    this.setState({ focused: false });
  }

  onFocus(e) {
    this.setState({ focused: true });
  }

  handleCustomModal(e) {
    EventManager.emitEvent('addCustomToken', 1);
  }

  handleDropdownClick(token) {
    return function handleClick(e) {
      if (this.props.handleTokenChange) {
        this.props.handleTokenChange(token);
      }

      // wait for animation to complete
      _.delay(
        () => {
          this.setState({
            value: '',
          });
        },
        400,
      );
    }.bind(this);
  }

  renderTopList() {
    // fetch balances of top tokens

    const top3 = _.first(this.state.topTokens, 3);
    const rest = _.rest(this.state.topTokens, 3);

    const top3Content = _.map(
      top3,
      (v, i) => (
        <a
          href="#"
          key={i}
          onClick={this.handleDropdownClick(v)}
          className={classnames('top-item level column is-mobile')}
        >
          <span className="level-left my-2">
            <span className="level-item">
              <TokenIconImg
                network={this.props.network}
                size={35}
                token={v}
              />
            </span>
            <div className="token-symbol-balance-wrapper">
              <span className="has-text-grey">{v.symbol}</span>
              <span className="has-text-grey">
                {this.getBalanceNumber(v)}
              </span>
            </div>
          </span>
        </a>
      ),
    );

    return (
      <div className="token-top-list">
        <div className="text-gray-stylized">
          <span>Popular</span>
        </div>
        <div className="columns is-mobile">{top3Content}</div>
        {this.renderDropList(rest)}
      </div>
    );
  }

  renderDropList(filteredTokens) {
    return _.map(
      filteredTokens,
      (v, i) => (
        <a
          href="#"
          key={i}
          onClick={this.handleDropdownClick(v)}
          className={classnames('dropdown-item level is-mobile')}
        >
          <TokenSearchItem
            token={v}
            network={this.props.network}
            balances={this.state.tokenBalances}
            getBalanceNumber={this.getBalanceNumber}
            fetchBalance={this.fetchBalance}
            refresh={Date.now()}
          />
        </a>
      ),
    );
  }

  renderEmptyList() {
    return (
      <div className="empty-state">
        <div>
          <div className="empty-text-bold">Token could not be found</div>
          <div className="empty-text">
            Unable to locate the input token. Add a custom token below.
          </div>
          <div>
            <button
              className="button is-primary is-fullwidth is-medium"
              onClick={this.handleCustomModal.bind(this)}
            >
              Add Custom Token
            </button>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { value, focused, filteredTokens } = this.state;
    const _query = value.toLowerCase().trim();
    const showDropdown = _query.length > 0 && focused;
    let dropContent;

    if (_query.length > 0) {
      if (filteredTokens.length > 0) {
        dropContent = this.renderDropList(filteredTokens);
      } else {
        dropContent = this.renderEmptyList();
      }
    } else {
      dropContent = this.renderTopList();
    }

    let dropList;

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
        <div
          className="dropdown-menu"
          id="dropdown-menu"
          role="menu"
          style={{ width: '100%' }}
        >
          <div className="dropdown-content">{dropContent}</div>
        </div>
      );
    }

    return (
      <div>
        <div
          className={classnames('token-search-bar', {
            'is-active': showDropdown,
            dropdown: !this.props.inline,
          })}
          style={{ width: this.props.width || '100%' }}
        >
          <div
            className={classnames({
              'dropdown-trigger': !this.props.inline,
            })}
            style={{ width: '100%' }}
          >
            <div className="field" style={{ width: '100%' }}>
              <div className="control has-icons-left has-icons-right">
                <input
                  ref={this.input}
                  className="input is-medium"
                  onFocus={this.onFocus}
                  onBlur={this.onBlur}
                  value={this.state.value}
                  onChange={this.handleChange}
                  placeholder={
                    this.props.placeholder
                    || 'Search by token name, symbol, or address ...'
                  }
                />
                <span className="icon is-left">
                  <ion-icon name="search-outline" />
                </span>
                {this.props.handleClose && (
                  <span
                    className="icon close-icon is-right"
                    onClick={this.handleClose}
                  >
                    <ion-icon name="close-outline" />
                  </span>
                )}
              </div>
            </div>
          </div>
          {dropList}
        </div>
        <CustomTokenModal handleTokenChange={this.handleTokenChange} />
      </div>
    );
  }
}
