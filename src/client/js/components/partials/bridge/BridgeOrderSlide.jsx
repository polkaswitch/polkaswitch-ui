/* eslint-disable react/prop-types */
/* eslint-disable react/destructuring-assignment */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import _ from 'underscore';
import classnames from 'classnames';
import BN from 'bignumber.js';
import { BigNumber, constants, Signer, utils } from 'ethers';
import * as Sentry from '@sentry/react';
import TokenIconBalanceGroupView from '../TokenIconBalanceGroupView';
import NetworkDropdown from '../NetworkDropdown';
import Wallet from '../../../utils/wallet';
import EventManager from '../../../utils/events';
import SwapFn from '../../../utils/swapFn';
import AvailableRoutes from './AvailableRoutes';

import TxBridgeManager from '../../../utils/txBridgeManager';
import {ALLOWED_BRIDGES} from '../../../constants'
import SolWallet from '../../../utils/solanaWallet'
const BridgeOrderSlide = (props) => {
  const [calculatingSwap, setCalculatingSwap] = useState(false);
  const [callDebounce, setCallDebounce] = useState(false);
  const [errored, setErrored] = useState(false);
  const [nextStepLoading, setNextStepLoading] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(false);
  const [errorMsg, setErrorMsg] = useState(false);

  let calculatingSwapTimestamp = Date.now();

  const debounceLoadCrossChainData = useCallback(
    _.debounce((props) => fetchCrossChainEstimate(props), 4000),
    [],
  );

  useEffect(() => {
    if (callDebounce) {
      debounceLoadCrossChainData(props);
      setCallDebounce(false);
    }
  }, [props]);

  useEffect(() => {
    if (props.fromAmount && !calculatingSwap) {
      fetchSwapEstimate(props.fromAmount, Date.now());
      setShowRoutes(false);
    }
  }, [props.from.address, props.to.address, props.refresh, props.fromAmount]);

  const fetchCrossChainEstimate = async (props) => {
    const origFromAmount = props.fromAmount;

    const fromAmountBN = window.ethers.utils.parseUnits(origFromAmount?? '0', props.from.decimals);

    const { to, toChain, from, fromChain } = props;

    if ( ([fromChain.name, toChain.name].includes('Solana') && !SolWallet.isConnected()) || !Wallet.isConnected()) {
      // not supported in cross-chain mode
      console.error('SwapOrderSlide: Wallet not connected, skipping crossChainEstimate');

      setCalculatingSwap(false);
      setErrored(true);
      setErrorMsg('Please connect wallet first');

      return false;
    }


    const successfullEstimatesNew = await TxBridgeManager.buildNewAllEstimates({
      to,
      toChain,
      from,
      fromChain,
      fromUserAddress: TxBridgeManager.walletAddress(fromChain.name),
      fromAmountBN,
    });

    Wallet.getBalance(props.from)
      .then((bal) => {
        // temp hard check nxtp or cbridge until integrate the whole process
        // after make available all the bridges use the values from the first index result to format

        const tempPreSelectedBridge = successfullEstimatesNew.filter(
          (item) => ALLOWED_BRIDGES.includes(item.bridge.route[0].bridge)
        );

        //delete tempPreSelectedBridge after integration

        const { estimatedReturnAmountDeductedByFees } = Wallet.returnEstimatedReturnAmountDeductedByFees(
          tempPreSelectedBridge[0],
        );

        props.onSwapEstimateComplete(
          origFromAmount,
          window.ethers.utils.formatUnits(
            tempPreSelectedBridge[0].estimate?.returnAmount ?? constants.Zero,
            props.to.decimals,
          ),
          false,
          window.ethers.utils.formatUnits(bal, props.from.decimals),
        );

        props.onCrossChainEstimateComplete(
          tempPreSelectedBridge[0].estimate?.id,
          estimatedReturnAmountDeductedByFees.toFixed(6),
        );

        setAvailableRoutes(successfullEstimatesNew);
        setShowRoutes(true);
        setCalculatingSwap(false);
      })
      .catch((e) => {
        fetchSwapEstimate(origFromAmount, Date.now(), 5);
        console.error('Failed to get swap estimate: ', e);
      });
  };

  const fetchSwapEstimate = (origFromAmount, timeNow, attempt) => {
    let fromAmount = origFromAmount;

    if (!attempt) {
      attempt = 0;
    } else if (attempt > window.MAX_RETRIES) {
      setCalculatingSwap(false);
      setErrored(true);
      setErrorMsg(false);
      setShowRoutes(true);
      console.error('Swap Failure: MAX RETRIES REACHED');
      return;
    }

    props.onSwapEstimateComplete(origFromAmount, props.toAmount, props.swapDistribution);

    if (!fromAmount || fromAmount.length === 0) {
      fromAmount = '0';
    } else {
      fromAmount = SwapFn.validateEthValue(props.from, fromAmount);
    }

    if (!timeNow) {
      timeNow = Date.now();
    }

    calculatingSwapTimestamp = timeNow;

    // important to make the calculations

    setErrored(false);
    setCalculatingSwap(true);
    setCallDebounce(true);
  };

  const handleTokenAmountChange = (e) => {
    if (!isNaN(+e.target.value)) {
      let targetAmount = e.target.value;
      // if input is in exponential format, convert to decimal.
      // we do this because all of our logic does not like the exponential format
      // when converting to BigNumber.
      // Otherwise we take the raw number as is, otherwise you get funky
      // input behaviour (i.e disappearing trailing zeros in decimals)
      if (targetAmount.toLowerCase().includes('e')) {
        targetAmount = SwapFn.validateEthValue(props.from, targetAmount);
      }

      if (!SwapFn.isValidParseValue(props.from, targetAmount)) {
        // do nothing for now.
        // we don't want to interrupt the INPUT experience,
        // as it moves the cursor around. we correct the value at the Submit step,
        // in the higher-order component SwapWidget.jsx
      }

      fetchSwapEstimate(targetAmount);
    }
  };

  const validateOrderForm = () => {
    return (
      props.from &&
      props.to &&
      props.fromAmount &&
      props.fromAmount.length > 0 &&
      props.fromAmount > 0 &&
      props.toAmount &&
      props.toAmount.length > 0 &&
      +props.toAmount > 0 &&
      !calculatingSwap &&
      !errored
    );
  };

  const hasSufficientBalance = () => {
    if (Wallet.isConnected() && props.availableBalance && props.fromAmount && props.from) {
      const balBN = BN(props.availableBalance);
      const fromBN = BN(props.fromAmount);
      return fromBN.lte(balBN);
    }
    return true;
  };

  const handleSubmit = async (e) => {
    setNextStepLoading(true);

    if (!Wallet.isConnected()) {
      EventManager.emitEvent('promptWalletConnect', 1);
    } else if (!SwapFn.isValidParseValue(props.from, props.fromAmount)) {
      const correctAmt = SwapFn.validateEthValue(props.from, props.fromAmount);
      fetchSwapEstimate(correctAmt, undefined, undefined);
      await props.handleSubmit();
    } else if (validateOrderForm()) {
      EventManager.emitEvent('networkHoverableUpdated', { hoverable: false });
      await props.handleSubmit();
    }

    setNextStepLoading(false);
  };

  const handleTokenSwap = (e) => {
    if (!calculatingSwap) {
      props.onSwapTokens(e);
    }
  };

  const handleNetworkDropdownChange = (isFrom) => {
    return function (network) {
      if (network.enabled) {
        Sentry.addBreadcrumb({
          message: `Action: Network Changed: ${network.name}`,
        });

        props.handleCrossChainChange(isFrom, network);
        setCallDebounce(true);
      }
    }.bind(this);
  };

  const handleMax = () => {
    if (Wallet.isConnected() && props.from.address) {
      Wallet.getBalance(props.from)
        .then((bal) => {
          _.defer(() => {
            // balance is in WEI and is a BigNumber
            fetchSwapEstimate(window.ethers.utils.formatUnits(bal, props.from.decimals));
          });
        })
        .catch((e) => {
          console.error('Failed to get balance for MAX', e);
          // try again
          handleMax();
        });
    }
  };

  const handleRouteChange = (e) => {
    const transactionId = e.target.value;
    const estimateTx = TxBridgeManager.getTx(transactionId);

    // value being displayed to the users => return amount -  destinationTxFee - bridgeFee
    const { estimatedReturnAmountDeductedByFees } = Wallet.returnEstimatedReturnAmountDeductedByFees(estimateTx);

    setSelectedRouteId(transactionId);

    props.onSwapEstimateComplete(
      props.fromAmount,
      estimatedReturnAmountDeductedByFees.toFixed(6),
      false,
      props.availableBalance,
    );

    props.onCrossChainEstimateComplete(transactionId, estimatedReturnAmountDeductedByFees.toFixed(6));
  };

  const renderTokenInput = (target, token) => {
    if (!token) {
      return <div />;
    }

    const isFrom = target === 'from';

    return (
      <div className="level">
        <div className="level is-narrow">
          <NetworkDropdown
            crossChain
            selected={isFrom ? props.fromChain : props.toChain}
            className={classnames({ 'is-up': !isFrom })}
            handleDropdownClick={handleNetworkDropdownChange(isFrom)}
            compact
          />
        </div>

        <div className="level-item is-flex-grow-1 is-flex-shrink-1 is-flex-direction-column is-align-items-flex-end">
          <div className="field" style={{ width: '100%' }}>
            <div
              className={classnames('control', {
                'is-loading': !isFrom && calculatingSwap,
              })}
              style={{ width: '100%' }}
            >
              <input
                onChange={handleTokenAmountChange}
                value={!isFrom && errored ? '' : props[`${target}Amount`] || ''}
                type="number"
                min="0"
                lang="en"
                step="0.000000000000000001"
                className={classnames('input is-medium', {
                  'is-danger': isFrom && !hasSufficientBalance(),
                  'is-to': !isFrom,
                  'is-from': isFrom,
                  // "is-danger": !isFrom && errored
                })}
                placeholder="0.0"
                disabled={!isFrom}
              />
              <div className="input-wrapper">
                {isFrom && (
                  <div className="max-btn" onClick={handleMax}>
                    Max
                  </div>
                )}
                {isFrom && !hasSufficientBalance() && <div className="warning-funds">Insufficient funds</div>}

                {!isFrom && errored && <div className="warning-funds">{errorMsg || 'Estimate failed. Try again'}</div>}
                <div
                  className="level is-mobile is-narrow my-0 token-dropdown"
                  onClick={() => props.handleSearchToggle(target)}
                >
                  <TokenIconBalanceGroupView
                    network={isFrom ? props.fromChain : props.toChain}
                    token={token}
                    refresh={props.refresh}
                  />
                  <div className="level-item">
                    <span className="icon-down">
                      <ion-icon name="chevron-down" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page page-view-order">
      <div className="page-inner">
        <div className="level is-mobile" style={{ marginBottom: 10 }}>
          <div className=" level-left">
            <b className="widget-title">Bridge Assets</b>
          </div>
          <div className="level-item level-right">
            <span className="icon clickable settings-icon" onClick={props.handleSettingsToggle}>
              <img src="/images/bridge_setting_white.svg" />
            </span>
          </div>
        </div>

        <div className="notification is-white border-top">
          <div className="text-gray-stylized">
            <span>Send</span>
          </div>
          {renderTokenInput('from', props.from)}
        </div>

        <div className="bridge-icon-wrapper">
          <div className="bridge-icon-v2 icon" onClick={handleTokenSwap}>
            <ion-icon name="swap-vertical-outline" />
          </div>

          <div className="bridge-icon is-hidden" onClick={handleTokenSwap}>
            <i className="fas fa-long-arrow-alt-up" />
            <i className="fas fa-long-arrow-alt-down" />
          </div>
        </div>

        <div className="notification is-white border-top">
          <div className="text-gray-stylized">
            <span>Receive</span>
          </div>
          {renderTokenInput('to', props.to)}
        </div>

        <div
          className={classnames('hint--large', 'available-routes-expand-wrapper', {
            'hint--top': showRoutes,
            expand: showRoutes,
          })}
          aria-label="We have queried multiple bridges to find the best possible routes for this swap. Choose a route that either favours speed or pricing"
        >
          <div className="hint-text">
            <span>Available Routes</span>
            <span className="hint-icon">?</span>
          </div>
          <AvailableRoutes
            showRoutes={showRoutes}
            showUnavailable={errored}
            loading={calculatingSwap}
            to={props.to}
            from={props.from}
            toChain={props.toChain}
            fromChain={props.fromChain}
            fromAmount={props.fromAmount}
            handleChange={handleRouteChange}
            routes={availableRoutes}
          />
        </div>

        <div className="bridge-order-btn-wrapper">
          <button
            disabled={(Wallet.isConnected() && !validateOrderForm()) || nextStepLoading}
            className={classnames("button is-primary bridge-order-btn", {
              'is-loading': nextStepLoading,
            })}
            onClick={handleSubmit}
          >
            {Wallet.isConnected() ? 'Review Bridge Order' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BridgeOrderSlide;
