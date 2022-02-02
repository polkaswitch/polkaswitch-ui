import React from 'react';
import _ from 'underscore';
import classnames from 'classnames';
import { BigNumber, constants, providers, Signer, utils } from 'ethers';
import TokenListManager from '../../../utils/tokenList';
import RouteItemWrapper from './RouteItemWrapper';

export default function AvailableRoutes(props) {
  const network = TokenListManager.getCurrentNetworkConfig();
  const GENERIC_SUPPORTED_BRIDGE_TOKENS = ["USDC", "USDT", "DAI"];

  const routes = _.map(props.routes, function(v, i) {
    var route = [];
    var bridgeType = v.bridge;
    var targetBridgeToken = 'USDC';

    route.push({
      type: 'token-network',
      token: props.from,
      amount: props.fromAmount,
      network: props.fromChain
    });

    if (bridgeType === "connext" &&
      !GENERIC_SUPPORTED_BRIDGE_TOKENS.includes(props.from.symbol.toUpperCase())) {
      route = route.concat([
        {
          type: "swap",
          data: {
            fee: 0.39
          }
        },
        {
          type: 'token-network',
          // DEFAULT to using USDC as a the bridge
          token: TokenListManager.findTokenById('USDC', props.fromChain),
          amount: props.fromAmount,
          network: props.fromChain
        }
      ]);
    } else {
      targetBridgeToken = props.from.symbol.toUpperCase();
    }

    route.push({
      type: "bridge",
      data: {
        name: bridgeType[0].toUpperCase() + bridgeType.substring(1),
        fee: 0.05
      }
    });

    if (bridgeType === "connext" &&
      targetBridgeToken != props.to.symbol.toUpperCase()) {
      route.push({
        type: "swap",
        data: {
          fee: 0.39
        }
      });
    }

    route = route.concat([
      {
        type: 'token-network',
        amount: utils.formatUnits(
          v.estimate?.returnAmount ?? constants.Zero,
          props.to.decimals,
        ),
        token: props.to,
        network: props.toChain
      },
      {
        type: 'additional',
        fee: bridgeType === "connext" ? "High" : "Low",
        duration: bridgeType === "connext" ? '~15 Minutes' : '~10 Minutes'
      }
    ]);

    return {
      transactionId: v.estimate?.id,
      route: route,
      bridgeType: bridgeType
    };
  });

  return (
    <div
      className={classnames("available-routes-wrapper control", {
        "is-hidden": !props.showRoutes
      })}
      aria-label="Available routes for the swap"
    >
      <div
        className={classnames('loader-wrapper', {
          'is-active': props.loading,
        })}
      >
        <div className="loader is-loading"></div>
      </div>
      <div
        className={classnames("unavailable-warning-wrapper", {
          "is-hidden": !props.showUnavailable
        })}
      >
        <div className='centered-view'>
          <div className="icon">
            <ion-icon name="alert-circle-outline"></ion-icon>
          </div>
          <div className="details">
            No routes available at this time
          </div>
        </div>
      </div>
      {routes.length > 0 &&
          _.map(routes, function (item, i) {
            return (
              <RouteItemWrapper
                handleChange={props.handleChange}
                key={i} data={item} index={i}
              ></RouteItemWrapper>
            );
          })}
        </div>
  );
}
