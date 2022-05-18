import React, { useState, useEffect, useRef } from 'react';
import { CSSTransition } from 'react-transition-group';
import _ from 'underscore';
import classnames from 'classnames';
import BN from 'bignumber.js';
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
import TxBridgeManager from '../../../utils/txBridgeManager';

const BridgeWidget = () => {
  const box = useRef(null);
  const orderPage = useRef(null);
  const CROSS_CHAIN_NETWORKS = _.filter(window.NETWORK_CONFIGS, (v) => v.enabled && v.crossChainSupported);

  const localStorageBridgeConfig = GlobalStateManager.bridge;

  const {
    from: fromLocalStorage,
    to: toLocalStorage,
    fromChain: fromChainLocalStorage,
    toChain: toChainLocalStorage,
  } = localStorageBridgeConfig;

  const [fromAmount, setFromAmount] = useState(undefined);
  const [toAmount, setToAmount] = useState(undefined);
  const [crossChainEnabled, setCrossChainEnabled] = useState(undefined);
  const [from, setFrom] = useState(fromLocalStorage);
  const [to, setTo] = useState(toLocalStorage);
  const [fromChain, setFromChain] = useState(fromChainLocalStorage);
  const [toChain, setToChain] = useState(toChainLocalStorage);
  const [availableBalance, setAvailableBalance] = useState(undefined);
  const [swapDistribution, setSwapDistribution] = useState(undefined);
  const [approveStatus, setApproveStatus] = useState(approvalState.UNKNOWN);
  const [searchTarget, setSearchTarget] = useState('');
  const [transactionSuccess, setTransactionSuccess] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [crossChainTransactionId, setCrossChainTransactionId] = useState(false);
  const [refresh, setRefresh] = useState(Date.now());

  const subscribers = [];

  useEffect(() => {
    subscribers.push(EventManager.listenFor('walletUpdated', handleWalletChange));
    subscribers.push(EventManager.listenFor('networkUpdated', handleNetworkChange));
    subscribers.push(EventManager.listenFor('networkPendingUpdate', handleNetworkPreUpdate));
    subscribers.push(EventManager.listenFor('txQueueUpdated', handleWalletChange));
    window.addEventListener('resize', updateBoxHeight);
    updateBoxHeight();

    // trigger a network change if needed, if current network is not supported.
    // 'networkUpdated' event will be triggered.
    Wallet.changeNetworkForSwapOrBridge(false);

    return () => {
      window.removeEventListener('resize', updateBoxHeight);
      subscribers.forEach((v) => {
        EventManager.unsubscribe(v);
      });
    };
  }, []);

  const handleNetworkPreUpdate = (e) => {
    setLoading(true);
  };

  const handleNetworkChange = (e) => {
    const network = TokenListManager.getCurrentNetworkConfig();
    const toChainNetworkChange =
      toChain?.chainId == network.chainId ? CROSS_CHAIN_NETWORKS.find((v) => v.chainId != network.chainId) : toChain;

    const fromChainNetworkChange = network;
    const toNetworkChange = TokenListManager.findTokenById(toChain.supportedCrossChainTokens[0], toChain);
    const fromNetworkChange = TokenListManager.findTokenById(network.supportedCrossChainTokens[0]);

    GlobalStateManager.updateBridgeConfig({
      to: toChainNetworkChange,
      from: fromChainNetworkChange,
      toChain: toNetworkChange,
      fromChain: fromNetworkChange,
    });

    const defaultTo = TokenListManager.findTokenById(network.defaultPair.to);
    const defaultFrom = TokenListManager.findTokenById(network.defaultPair.from);

    GlobalStateManager.updateSwapConfig({
      to: defaultTo,
      from: defaultFrom,
      toChain: network.name,
      fromChain: network.name,
    });

    setLoading(false);
    setCrossChainEnabled(true);
    setTo(toNetworkChange);
    setFrom(fromNetworkChange);
    setToChain(toChainNetworkChange);
    setFromChain(fromChainNetworkChange);
    setAvailableBalance(undefined);
  };

  const handleWalletChange = (e) => {
    setRefresh(Date.now());
  };

  const updateBoxHeight = () => {
    if (!box.current) {
      return;
    }

    box.current.style.height = '';
    _.defer(() => {
      box.current.style.height = `${box.current.offsetHeight}px`;
    });
  };

  const triggerHeightResize = (node, isAppearing) => {
    box.current.style.height = `${node.offsetHeight}px`;
  };

  const onCrossChainEstimateComplete = (transactionId, toAmount) => {
    setCrossChainTransactionId(transactionId);
    setToAmount(toAmount);
  };

  const onSwapEstimateComplete = (fromAmountVal, toAmountVal, dist, availBalBN, approveStatus) => {
    if (fromAmount === fromAmountVal && availableBalance === availBalBN && toAmount === toAmountVal) {
      return;
    }

    box.current.style.height = '';

    setFromAmount(fromAmountVal);
    setToAmount(toAmountVal);
    setSwapDistribution(dist);
    setAvailableBalance(availBalBN);
    setApproveStatus(approveStatus);

    _.delay(() => {
      // put back height after dist expand anim
      updateBoxHeight();
    }, 301);
  };

  const onSwapTokens = () => {
    Sentry.addBreadcrumb({
      message: 'Action: Swap Tokens',
    });

    Metrics.track('swap-flipped-tokens');

    GlobalStateManager.updateBridgeConfig({
      to: from,
      from: to,
    });

    setTo(from);
    setFrom(to);
    setFromAmount(toAmount ? SwapFn.validateEthValue(to, toAmount) : undefined);
    setToChain(fromChain);
    setFromChain(toChain);
    setAvailableBalance(undefined);
    setToAmount(undefined);
    setRefresh(Date.now());
    setShowSearch(false);

    const connectStrategy = Wallet.isConnectedToAnyNetwork() && Wallet.getConnectionStrategy();
    TokenListManager.updateNetwork(fromChain, connectStrategy);
  };

  const handleCrossChainChange = (isFrom, network) => {
    const alt = isFrom ? 'to' : 'from';
    const target = isFrom ? 'from' : 'to';
    const bridgeChainKey = isFrom ? 'fromChain' : 'toChain';

    // if you select the same network as other, swap
    if ([`${alt}Chain`].chainId === network.chainId) {
      onSwapTokens();
      // don't need to do anything else
      return;
    }

    const _s = {
      availableBalance: undefined,
      refresh: Date.now(),
    };

    // try to find the current token on the new network if available
    const parallelToken = TokenListManager.findTokenById([target].symbol, network);

    if (parallelToken) {
      _s[target] = parallelToken;
    } else {
      // default to any available token
      _s[target] = TokenListManager.findTokenById(network.supportedCrossChainTokens[0], network);
    }

    _s[`${target}Chain`] = network;

    _s.to && setTo(_s.to);
    _s.from && setFrom(_s.from);
    _s.toChain && setToChain(_s.toChain);
    _s.fromChain && setFromChain(_s.fromChain);
    setRefresh(_s.refresh);
    setAvailableBalance(_s.availableBalance);

    if (isFrom) {
      const connectStrategy = Wallet.isConnectedToAnyNetwork() && Wallet.getConnectionStrategy();
      TokenListManager.updateNetwork(network, connectStrategy);
    }

    // update bridgeConfig
    GlobalStateManager.updateBridgeConfig({
      [bridgeChainKey]: network,
    });
  };

  const handleSearchToggle = (target) => {
    Sentry.addBreadcrumb({
      message: `Page: Search Token: ${target}`,
    });

    Metrics.track('bridge-search-view', { closing: showSearch });

    setSearchTarget(target);
    setShowSearch(!showSearch);
  };

  const handleSettingsToggle = (e) => {
    Sentry.addBreadcrumb({
      message: 'Page: Settings',
    });

    Metrics.track('bridge-settings-view', { closing: showSettings });

    setShowSettings(!showSettings);
  };

  const checkAllowance = async ({ bridge = 'celer', fromAddress, fromChain, from, to, toChain }) => {
    setRequiresApproval(false);

    const { allowanceFormatted, allowance } = await TxBridgeManager.checkAllowance({
      bridge,
      fromAddress,
      fromChain,
      from,
    });

    if (BN(fromAmount).gt(BN(allowanceFormatted))) {
      setRequiresApproval(true);
    }

    return;
  };

  const handleConfirm = async (e) => {
    Sentry.addBreadcrumb({
      message: 'Page: Review',
      data: {
        to,
        from,
        fromAmount,
        toAmount,
      },
    });

    const isNativeToken = from.symbol === fromChain.chain.nativeCurrency.symbol;
    const selectedTx = TxBridgeManager.getTx(crossChainTransactionId);
    const bridge = selectedTx?.bridge?.route[0].bridge || 'celer';

    if (isNativeToken) {
      // go straight to transfer
    } else {
      await checkAllowance({
        bridge,
        fromAddress: Wallet.currentAddress(),
        fromChain: fromChain.name,
        fromAmount,
        from,
        toChain: toChain.name,
        to,
      });
    }

    Metrics.track('bridge-review-step', { closing: showConfirm });
    setShowConfirm(true);
  };

  const handleResults = (success, hash) => {
    EventManager.emitEvent('networkHoverableUpdated', { hoverable: true });

    setTransactionHash(hash);
    setShowConfirm(false);
    setShowResults(true);
    setTransactionSuccess(success);
    setRefresh(Date.now());
  };

  const handleBackOnConfirm = (e) => {
    EventManager.emitEvent('networkHoverableUpdated', { hoverable: true });
    setShowConfirm(false);
  };

  const handleBackOnResults = (e) => {
    EventManager.emitEvent('networkHoverableUpdated', { hoverable: true });

    setShowConfirm(false);
    setShowResults(false);
    setFinished(false);
    setToAmount('');
    setFromAmount('');
    setSwapDistribution(undefined);
    setRefresh(Date.now());
  };

  const handleTokenChange = (token) => {
    //redo !!

    const alt = searchTarget === 'from' ? 'to' : 'from';

    // if you select the same token pair, do a swap instead
    // TODO disable this for now.
    //if (this.state[alt].address === token.address) {
    //return t();
    //}

    const _s = {
      showSearch: false,
      availableBalance: undefined,
      refresh: Date.now(),
    };

    const bridgeConfig = {};

    _s[searchTarget] = token;
    bridgeConfig[searchTarget] = token;

    // TODO temporarily match the same token pair on the opposite network for the reduced
    // stable coin token list
    let foundToken = TokenListManager.findTokenById(token.symbol, [alt + 'Chain']);
    if (foundToken) {
      _s[alt] = foundToken;
      bridgeConfig[alt] = foundToken;
    }

    if (searchTarget === 'from') {
      _s.fromAmount = SwapFn.validateEthValue(token, fromAmount);
    }

    GlobalStateManager.updateBridgeConfig({ ...bridgeConfig });

    searchTarget === 'from' ? setFrom(_s[searchTarget]) : setTo(_s[searchTarget]);

    setShowResults(_s.showSearch);
    setAvailableBalance(_s.availableBalance);
    setRefresh(_s.refresh);

    Metrics.track('swap-token-changed', {
      changed: searchTarget,
      from: from,
      to: to,
    });
  };

  const handleFinishedResult = (finished) => {
    setFinished(finished);
  };

  const handleFinishedAllowance = () => {
    setRequiresApproval(false);
  };

  const animTiming = 300;
  const isStack = !(showSettings || showConfirm || showSearch || showResults);

  return (
    <div ref={box} className="box bridge-widget">
      <div
        className={classnames('loader-wrapper', {
          'is-active': loading,
        })}
      >
        <div className="loader is-loading" />
      </div>
      <CSSTransition in={isStack} timeout={animTiming} onEntering={triggerHeightResize} classNames="fade">
        <BridgeOrderSlide
          refs={orderPage}
          toChain={toChain}
          fromChain={fromChain}
          to={to}
          from={from}
          fromAmount={fromAmount}
          toAmount={toAmount}
          availableBalance={availableBalance}
          approveStatus={approveStatus}
          refresh={refresh}
          handleCrossChainChange={handleCrossChainChange}
          handleSearchToggle={handleSearchToggle}
          handleSettingsToggle={handleSettingsToggle}
          swapDistribution={swapDistribution}
          onCrossChainEstimateComplete={onCrossChainEstimateComplete}
          onSwapEstimateComplete={onSwapEstimateComplete}
          onSwapTokens={onSwapTokens}
          handleSubmit={handleConfirm}
        />
      </CSSTransition>
      <CSSTransition in={showSearch} timeout={animTiming} onEntering={triggerHeightResize} classNames="slidein">
        <TokenSearchSlide
          isFrom={searchTarget === 'from'}
          network={searchTarget === 'to' ? toChain : fromChain}
          showSearch={showSearch}
          handleSearchToggle={handleSearchToggle}
          handleTokenChange={handleTokenChange}
        />
      </CSSTransition>
      <CSSTransition in={showSettings} timeout={animTiming} onEntering={triggerHeightResize} classNames="slidein">
        <AdvancedSettingsSlide handleBackOnSettings={handleSettingsToggle} />
      </CSSTransition>
      <CSSTransition in={showConfirm} timeout={animTiming} onEntering={triggerHeightResize} classNames="slidein">
        <CSSTransition in={!showResults && !finished} timeout={animTiming} classNames="fade">
          <CrossSwapProcessSlide
            to={to}
            from={from}
            handleFinishedAllowance={handleFinishedAllowance}
            requiresTokenApproval={requiresApproval}
            handleFinishedResult={handleFinishedResult}
            fromChain={fromChain}
            toChain={toChain}
            fromAmount={fromAmount}
            toAmount={toAmount}
            crossChainTransactionId={crossChainTransactionId}
            availableBalance={availableBalance}
            approveStatus={approveStatus}
            refresh={refresh}
            handleTransactionComplete={handleResults}
            handleBackOnConfirm={handleBackOnConfirm}
          />
        </CSSTransition>
      </CSSTransition>
      <CSSTransition in={showResults} timeout={animTiming} onEntering={triggerHeightResize} classNames="slidein">
        <BridgeFinalResultSlide
          to={to}
          from={from}
          toChain={toChain}
          fromChain={fromChain}
          fromAmount={fromAmount}
          toAmount={toAmount}
          transactionSuccess={transactionSuccess}
          transactionHash={transactionHash}
          handleDismiss={handleBackOnResults}
        />
      </CSSTransition>
    </div>
  );
};

export default BridgeWidget;
