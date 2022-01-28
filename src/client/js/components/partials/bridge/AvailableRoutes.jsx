import React from 'react';
import _ from 'underscore';
import TokenListManager from '../../../utils/tokenList';
import RouteItemWrapper from './RouteItemWrapper';

export default function AvailableRoutes(props) {
  const network = TokenListManager.getCurrentNetworkConfig();
  // const routes = props.routes

  const routes = [
    [
      {
        type: 'token-network',
        token: {
          amount: 23.9744,
          name: 'AVAX',
          logoURI:
            'https://assets.coingecko.com/coins/images/12559/large/coin-round-red.png',
        },
        network: {
          name: 'Polygon',
        },
      },
      {
        type: 'swap',
        data: {
          fee: 0.39,
        },
      },
      {
        type: 'token-network',
        token: {
          amount: 1475.27,
          name: 'USDC',
          logoURI:
            'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
        },
        network: {
          name: 'Polygon',
        },
      },
      {
        type: 'bridge',
        data: {
          fee: 0.05,
        },
      },
      {
        type: 'token-network',
        token: {
          amount: 12775.271,
          name: 'UNI',
          logoURI:
            'https://cloudflare-ipfs.com/ipfs/QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg/',
        },
        network: {
          name: 'Polygon',
        },
      },
      {
        type: 'additional',
        fee: 0.0051232,
        duration: '-5 Minutes',
      },
    ],
    [
      {
        type: 'token-network',
        token: {
          amount: 23.9744,
          name: 'AVAX',
          logoURI:
            'https://assets.coingecko.com/coins/images/12559/large/coin-round-red.png',
        },
        network: {
          name: 'Polygon',
        },
      },
      {
        type: 'swap',
        data: {
          fee: 0.39,
        },
      },
      {
        type: 'token-network',
        token: {
          amount: 1475.27,
          name: 'USDC',
          logoURI:
            'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
        },
        network: {
          name: 'Polygon',
        },
      },
      {
        type: 'bridge',
        data: {
          fee: 0.05,
        },
      },
      {
        type: 'token-network',
        token: {
          amount: 12775.271,
          name: 'UNI',
          logoURI:
            'https://cloudflare-ipfs.com/ipfs/QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg/',
        },
        network: {
          name: 'Polygon',
        },
      },
      {
        type: 'additional',
        fee: 0.0051232,
        duration: '-5 Minutes',
      },
    ],
  ];

  return (
    <div
      className="token-dist-wrapper control"
      aria-label="Available routes for the swap"
    >
      {routes.length > 0
        && _.map(routes, (item, i) => (
          <RouteItemWrapper key={i} data={item} index={i} />
        ))}
    </div>
  );
}
