import React from 'react';
import classnames from 'classnames';
import Wallet from '../../../utils/wallet';
import RouteItemWrapper from './RouteItemWrapper';
import {ALLOWED_BRIDGES} from '../../../constants'
export default function AvailableRoutes(props) {
  const GENERIC_SUPPORTED_BRIDGE_TOKENS = ['USDC', 'USDT', 'DAI'];
  const routes = props.routes.map((v, i) => {
    let route = [];

    const bridgeType = v.bridge.route[0].bridge;
    let targetBridgeToken = 'USDC';

    // value being displayed to the users => return amount -  desinationTxFee - bridgeFee
    const { estimatedReturnAmountDeductedByFees, totalFeeWithoutGas } =
      Wallet.returnEstimatedReturnAmountDeductedByFees(v);

    route.push({
      type: 'token-network',
      token: props.from,
      amount: props.fromAmount,
      network: props.fromChain,
    });

    route.push({
      type: 'bridge',
      data: {
        name: v.bridge.route[0].bridge,
        fee: 0.05,
      },
    });

    // if (bridgeType === 'connext' && targetBridgeToken != props.to.symbol.toUpperCase()) {
    //   route.push({
    //     type: 'swap',
    //     data: {
    //       fee: bridgeFee,
    //     },
    //   });
    // }

    route = route.concat([
      {
        type: 'token-network',
        amount: estimatedReturnAmountDeductedByFees,
        token: props.to,
        network: props.toChain,
      },
      {
        type: 'additional',
        fee: totalFeeWithoutGas.toFixed(6),
        duration: v.bridge?.duration ? v.bridge?.duration : 'high',
      },
    ]);

    return {
      transactionId: v.estimate?.id,
      route,
      bridgeType,
    };
  });

  return (
    <div
      className={classnames('available-routes-wrapper control', {
        'is-hidden': !props.showRoutes && !props.fromAmount,
      })}
      aria-label="Available routes for the swap"
    >
      <div
        className={classnames('loader-wrapper', {
          'is-active': props.loading,
        })}
      >
        <div className="loader is-loading" />
      </div>
      <div
        className={classnames('unavailable-warning-wrapper', {
          'is-hidden': !props.showUnavailable,
        })}
      >
        <div className="centered-view">
          <div className="icon">
            <ion-icon name="alert-circle-outline" />
          </div>
          <div className="details">No routes available at this time</div>
        </div>
      </div>
      {routes
        ?.filter((item) => ALLOWED_BRIDGES.includes(item.bridgeType))
        .map((item, i) => (
          <RouteItemWrapper handleChange={props.handleChange} key={i} data={item} index={i} />
        ))}
    </div>
  );
}
