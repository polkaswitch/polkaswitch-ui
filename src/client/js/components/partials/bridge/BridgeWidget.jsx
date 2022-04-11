import React, { Component } from 'react';
import { CSSTransition } from 'react-transition-group';
import _ from 'underscore';
import classnames from 'classnames';
import * as Sentry from '@sentry/react';

import BridgeOrderSlide from './BridgeOrderSlide';
import TokenSearchSlide from '../TokenSearchSlide';
import CrossSwapProcessSlide from './CrossSwapProcessSlide';
import AdvancedSettingsSlide from '../AdvancedSettingsSlide';
import BridgeFinalResultSlide from './BridgeFinalResultSlide';
import TokenListManager from '../../../utils/tokenList';
import GlobalStateManager from '../../../utils/global';
import Metrics from '../../../utils/metrics';
import Wallet from '../../../utils/wallet';
import EventManager from '../../../utils/events';
import { approvalState } from '../../../constants';

export default class BridgeWidget extends Component {
  constructor(props) {
    super(props);

    this.box = React.createRef();
    this.orderPage = React.createRef();
    this.CROSS_CHAIN_NETWORKS = _.filter(
      window.NETWORK_CONFIGS,
      (v) => v.enabled && v.crossChainSupported,
    );

    const localStorageBridgeConfig = GlobalStateManager.bridge;

    const { from, to, fromChain, toChain } = localStorageBridgeConfig;

    this.state = {
      fromAmount: undefined,
      toAmount: undefined,
      from,
      to,
      fromChain,
      toChain,
      availableBalance: undefined,
      swapDistribution: undefined,
      approveStatus: approvalState.UNKNOWN,
      searchTarget: '',
      showSettings: false,
      showConfirm: false,
      showSearch: false,
      showResults: false,
      finished: false,
      loading: false,
      transactionHash: '',
      crossChainTransactionId: false,
      refresh: Date.now(),
    };

    this.subscribers = [];
    this.onSwapTokens = this.onSwapTokens.bind(this);
    this.handleTokenChange = this.handleTokenChange.bind(this);
    this.handleSearchToggle = this.handleSearchToggle.bind(this);
    this.handleSettingsToggle = this.handleSettingsToggle.bind(this);
    this.handleConfirm = this.handleConfirm.bind(this);
    this.handleResults = this.handleResults.bind(this);
    this.handleBackOnConfirm = this.handleBackOnConfirm.bind(this);
    this.handleBackOnResults = this.handleBackOnResults.bind(this);
    this.triggerHeightResize = this.triggerHeightResize.bind(this);
    this.updateBoxHeight = _.debounce(this.updateBoxHeight.bind(this), 20);
    this.handleWalletChange = this.handleWalletChange.bind(this);
    this.handleNetworkChange = this.handleNetworkChange.bind(this);
    this.handleFinishedResult = this.handleFinishedResult.bind(this);
    this.handleNetworkPreUpdate = this.handleNetworkPreUpdate.bind(this);
    this.onCrossChainEstimateComplete =
      this.onCrossChainEstimateComplete.bind(this);
    this.onSwapEstimateComplete = this.onSwapEstimateComplete.bind(this);
    this.onApproveComplete = this.onApproveComplete.bind(this);

    this.handleCrossChainChange = this.handleCrossChainChange.bind(this);
  }

  componentDidMount() {
    this.subscribers.push(
      EventManager.listenFor('walletUpdated', this.handleWalletChange),
    );
    this.subscribers.push(
      EventManager.listenFor('networkUpdated', this.handleNetworkChange),
    );
    this.subscribers.push(
      EventManager.listenFor(
        'networkPendingUpdate',
        this.handleNetworkPreUpdate,
      ),
    );
    this.subscribers.push(
      EventManager.listenFor('txQueueUpdated', this.handleWalletChange),
    );
    window.addEventListener('resize', this.updateBoxHeight);
    this.updateBoxHeight();

    // trigger a network change if needed, if current network is not supported.
    // 'networkUpdated' event will be triggered.
    Wallet.changeNetworkForSwapOrBridge(false);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateBoxHeight);
    this.subscribers.forEach((v) => {
      EventManager.unsubscribe(v);
    });
  }

  handleNetworkPreUpdate(e) {
    this.setState({
      loading: true,
    });
  }

  handleNetworkChange(e) {
    const network = TokenListManager.getCurrentNetworkConfig();
    const toChain = this.state.toChain?.chainId == network.chainId ?
      this.CROSS_CHAIN_NETWORKS.find(v => v.chainId != network.chainId) :
      this.state.toChain;
    const fromChain = network;
    const to = TokenListManager.findTokenById(
      toChain.supportedCrossChainTokens[0],
      toChain,
    );
    const from = TokenListManager.findTokenById(
      network.supportedCrossChainTokens[0],
    )

    GlobalStateManager.updateBridgeConfig({
      toChain,
      fromChain,
      to,
      from,
    });
    const defaultTo = TokenListManager.findTokenById(network.defaultPair.to);
    const defaultFrom = TokenListManager.findTokenById(network.defaultPair.from);
    GlobalStateManager.updateSwapConfig({
      to: defaultTo,
      from: defaultFrom,
      toChain: network.name,
      fromChain: network.name
    });

    this.setState({
      loading: false,
      crossChainEnabled: true,
      to,
      from,
      toChain,
      fromChain,
      availableBalance: undefined,
    });
  }

  handleWalletChange(e) {
    this.setState({
      refresh: Date.now(),
    });
  }

  updateBoxHeight() {
    if (!this.box.current) {
      return;
    }

    this.box.current.style.height = '';
    _.defer(() => {
      this.box.current.style.height = `${this.box.current.offsetHeight}px`;
    });
  }

  triggerHeightResize(node, isAppearing) {
    this.box.current.style.height = `${node.offsetHeight}px`;
  }

  onCrossChainEstimateComplete(transactionId, toAmount) {
    this.setState({
      crossChainTransactionId: transactionId,
      toAmount,
    });
  }

  onSwapEstimateComplete(
    fromAmount,
    toAmount,
    dist,
    availBalBN,
    approveStatus,
  ) {
    if (
      this.state.fromAmount === fromAmount &&
      this.state.availableBalance === availBalBN &&
      this.state.toAmount === toAmount
    ) {
      return;
    }

    this.box.current.style.height = '';
    this.setState(
      {
        fromAmount,
        toAmount,
        swapDistribution: dist,
        availableBalance: availBalBN,
        approveStatus,
      },
      () => {
        _.delay(() => {
          // put back height after dist expand anim
          this.updateBoxHeight();
        }, 301);
      },
    );
  }

  onApproveComplete(approveStatus) {
    if (this.state.approveStatus === approveStatus) {
      return;
    }
    this.setState({
      approveStatus,
    });
  }

  onSwapTokens() {
    Sentry.addBreadcrumb({
      message: 'Action: Swap Tokens',
    });
    Metrics.track('swap-flipped-tokens');

    GlobalStateManager.updateBridgeConfig({
      to: this.state.from,
      from: this.state.to,
    });
    this.setState(
      {
        to: this.state.from,
        fromAmount: this.state.toAmount
          ? SwapFn.validateEthValue(this.state.to, this.state.toAmount)
          : undefined,
        from: this.state.to,
        toChain: this.state.fromChain,
        fromChain: this.state.toChain,
        availableBalance: undefined,
        toAmount: undefined,
        refresh: Date.now(),
        // make it easy coming from token-selection
        showSearch: false,
      },
      () => {
        const connectStrategy =
          Wallet.isConnectedToAnyNetwork() && Wallet.getConnectionStrategy();
        TokenListManager.updateNetwork(this.state.fromChain, connectStrategy);
      },
    );
  }

  handleCrossChainChange(isFrom, network) {
    const alt = isFrom ? 'to' : 'from';
    const target = isFrom ? 'from' : 'to';
    const bridgeChainKey = isFrom ? 'fromChain' : 'toChain';

    // if you select the same network as other, swap
    if (this.state[`${alt}Chain`].chainId === network.chainId) {
      this.onSwapTokens();
      // don't need to do anything else
      return;
    }

    const _s = {
      availableBalance: undefined,
      refresh: Date.now(),
    };

    // try to find the current token on the new network if available
    const parallelToken = TokenListManager.findTokenById(
      this.state[target].symbol,
      network,
    );

    if (parallelToken) {
      _s[target] = parallelToken;
    } else {
      // default to any available token
      _s[target] = TokenListManager.findTokenById(
        network.supportedCrossChainTokens[0],
        network,
      );
    }

    _s[`${target}Chain`] = network;

    this.setState(_s);

    if (isFrom) {
      const connectStrategy =
        Wallet.isConnectedToAnyNetwork() && Wallet.getConnectionStrategy();
      TokenListManager.updateNetwork(network, connectStrategy);
    }

    // update bridgeConfig
    GlobalStateManager.updateBridgeConfig({
      [bridgeChainKey]: network
    })
  }

  handleSearchToggle(target) {
    // TODO handle cross-chain swap
    return function (e) {
      Sentry.addBreadcrumb({
        message: `Page: Search Token: ${target}`,
      });

      Metrics.track('bridge-search-view', { closing: this.state.showSearch });
      this.setState({
        searchTarget: target,
        showSearch: !this.state.showSearch,
      });
    }.bind(this);
  }

  handleSettingsToggle(e) {
    Sentry.addBreadcrumb({
      message: 'Page: Settings',
    });

    Metrics.track('bridge-settings-view', { closing: this.state.showSettings });
    this.setState({
      showSettings: !this.state.showSettings,
    });
  }

  handleConfirm(e) {
    Sentry.addBreadcrumb({
      message: 'Page: Review',
      data: {
        to: this.state.to,
        from: this.state.from,
        fromAmount: this.state.fromAmount,
        toAmount: this.state.toAmount,
      },
    });

    Metrics.track('bridge-review-step', { closing: this.state.showConfirm });
    this.setState({
      showConfirm: true,
    });
  }

  handleResults(success, hash) {
    EventManager.emitEvent('networkHoverableUpdated', { hoverable: true });
    this.setState({
      transactionHash: hash,
      showConfirm: false,
      showResults: true,
      transactionSuccess: success,
      refresh: Date.now(), // refresh Balances
    });
  }

  handleBackOnConfirm(e) {
    EventManager.emitEvent('networkHoverableUpdated', { hoverable: true });
    this.setState({ showConfirm: false });
  }

  handleBackOnResults(e) {
    EventManager.emitEvent('networkHoverableUpdated', { hoverable: true });
    this.setState({
      showConfirm: false,
      showResults: false,
      finished: false,
      toAmount: undefined,
      fromAmount: undefined,
      swapDistribution: undefined,
      refresh: Date.now(), // refresh Balances
    });
  }

  handleTokenChange(token) {
    const alt = this.state.searchTarget === 'from' ? 'to' : 'from';

    // if you select the same token pair, do a swap instead
    // TODO disable this for now.
    //if (this.state[alt].address === token.address) {
    //return this.onSwapTokens();
    //}

    const _s = {
      showSearch: false,
      availableBalance: undefined,
      refresh: Date.now(),
    };
    const bridgeConfig = {};

    _s[this.state.searchTarget] = token;
    bridgeConfig[this.state.searchTarget] = token;

    // TODO temporarily match the same token pair on the opposite network for the reduced
    // stable coin token list
    let foundToken = TokenListManager.findTokenById(token.symbol, this.state[alt + 'Chain']);
    if (foundToken) {
      _s[alt] = foundToken;
      bridgeConfig[alt] = foundToken;
    }

    if (this.state.searchTarget === 'from') {
      _s.fromAmount = SwapFn.validateEthValue(token, this.state.fromAmount);
    }
    GlobalStateManager.updateBridgeConfig({ ...bridgeConfig });
    this.setState(_s, () => {
      Metrics.track('swap-token-changed', {
        changed: this.state.searchTarget,
        from: this.state.from,
        to: this.state.to,
      });
    });
  }

  handleFinishedResult(finished) {
    this.setState({
      finished,
      fromAmount: undefined,
      toAmount: undefined,
    });
  }

  render() {
    const animTiming = 300;
    const isStack = !(
      this.state.showSettings ||
      this.state.showConfirm ||
      this.state.showSearch ||
      this.state.showResults
    );

    return (
      <div ref={this.box} className="box bridge-widget">
        <div
          className={classnames('loader-wrapper', {
            'is-active': this.state.loading,
          })}
        >
          <div className="loader is-loading" />
        </div>
        <CSSTransition
          in={isStack}
          timeout={animTiming}
          onEntering={this.triggerHeightResize}
          classNames="fade"
        >
          <BridgeOrderSlide
            ref={this.orderPage}
            toChain={this.state.toChain}
            fromChain={this.state.fromChain}
            to={this.state.to}
            from={this.state.from}
            fromAmount={this.state.fromAmount}
            toAmount={this.state.toAmount}
            availableBalance={this.state.availableBalance}
            approveStatus={this.state.approveStatus}
            refresh={this.state.refresh}
            handleCrossChainChange={this.handleCrossChainChange}
            handleSearchToggle={this.handleSearchToggle}
            handleSettingsToggle={this.handleSettingsToggle}
            swapDistribution={this.state.swapDistribution}
            onCrossChainEstimateComplete={this.onCrossChainEstimateComplete}
            onSwapEstimateComplete={this.onSwapEstimateComplete}
            onSwapTokens={this.onSwapTokens}
            handleSubmit={this.handleConfirm}
          />
        </CSSTransition>
        <CSSTransition
          in={this.state.showSearch}
          timeout={animTiming}
          onEntering={this.triggerHeightResize}
          classNames="slidein"
        >
          <TokenSearchSlide
            isCrossChain
            isFrom={this.state.searchTarget === 'from'}
            network={
              this.state.searchTarget === 'to'
                ? this.state.toChain
                : this.state.fromChain
            }
            showSearch={this.state.showSearch}
            handleSearchToggle={this.handleSearchToggle}
            handleTokenChange={this.handleTokenChange}
          />
        </CSSTransition>
        <CSSTransition
          in={this.state.showSettings}
          timeout={animTiming}
          onEntering={this.triggerHeightResize}
          classNames="slidein"
        >
          <AdvancedSettingsSlide
            handleBackOnSettings={this.handleSettingsToggle}
          />
        </CSSTransition>
        <CSSTransition
          in={this.state.showConfirm}
          timeout={animTiming}
          onEntering={this.triggerHeightResize}
          classNames="slidein"
        >
          <CSSTransition in={!this.state.showResults && !this.state.finished} timeout={animTiming} classNames="fade">
            <CrossSwapProcessSlide
              to={this.state.to}
              from={this.state.from}
              handleFinishedResult={this.handleFinishedResult}
              fromChain={this.state.fromChain}
              toChain={this.state.toChain}
              fromAmount={this.state.fromAmount}
              toAmount={this.state.toAmount}
              crossChainTransactionId={this.state.crossChainTransactionId}
              availableBalance={this.state.availableBalance}
              approveStatus={this.state.approveStatus}
              refresh={this.state.refresh}
              handleTransactionComplete={this.handleResults}
              handleBackOnConfirm={this.handleBackOnConfirm}
            />
          </CSSTransition>
        </CSSTransition>
        <CSSTransition
          in={this.state.showResults}
          timeout={animTiming}
          onEntering={this.triggerHeightResize}
          classNames="slidein"
        >
          <BridgeFinalResultSlide
            to={this.state.to}
            from={this.state.from}
            toChain={this.state.toChain}
            fromChain={this.state.fromChain}
            fromAmount={this.state.fromAmount}
            toAmount={this.state.toAmount}
            transactionSuccess={this.state.transactionSuccess}
            transactionHash={this.state.transactionHash}
            handleDismiss={this.handleBackOnResults}
          />
        </CSSTransition>
      </div>
    );
  }
}
