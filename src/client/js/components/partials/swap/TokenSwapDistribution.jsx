import React, { Component } from 'react';
import _ from 'underscore';
import TokenIconImg from './../TokenIconImg';
import TokenListManager from '../../../utils/tokenList';

export default class TokenSwapDistribution extends Component {
  constructor(props) {
    super(props);
  }

  renderPool(key, icon, poolWidth) {
    return (
      <div
        key={key}
        className="token-dist-pool-wrapper"
        style={{ width: `${poolWidth * 100.0}%` }}
      >
        <div className="token-dist-pool">
          <TokenIconImg token={icon} size={25} />
          <span>{Math.round(poolWidth * 100.0)}%</span>
        </div>
      </div>
    );
  }

  render() {
    var pools;
    var network = TokenListManager.getCurrentNetworkConfig();
    var sumOne, sumTwo, sumThree, sumFour, sumFive, parts, totalParts;

    if (network.name === 'Ethereum') {
      parts = this.props.parts || [0, 0, 0, 0, 0, 0, 0];

      /*
        This returns the destToken output amount and the optimized
        list of distributions accross different liquidity pools.
        There are 7 pools: pool 1 and 2 are Uniswap pools,
        pool 3 and 4 are Sushiswap pools, and pool 5 - 7 are
        Balancer pools. For example, the distribution [1, 0, 2, 0, 0, 0, 0]
        means 1/3 of the swap amount will route to Uniswap and 2/3 will
        route to Sushiswap.[1, 0, 0, 0, 0, 1, 1] means 1/3 of amount
        will route to Uniswap and 2/3 will route to Balancer.
      */

      sumOne = parts[0] + parts[1];
      sumTwo = parts[2] + parts[3];
      sumThree = parts[4] + parts[5] + parts[6];
      totalParts = sumOne + sumTwo + sumThree

      var pools = [
        {
          name: 'Uniswap',
          icon: TokenListManager.findTokenById('UNI'),
          size: sumOne / totalParts,
        },
        {
          name: 'Sushiswap',
          icon: TokenListManager.findTokenById('SUSHI'),
          size: sumTwo / totalParts,
        },
        {
          name: 'Balancer',
          icon: TokenListManager.findTokenById('BAL'),
          size: sumThree / totalParts,
        },
      ];
    } else if (network.name === 'Polygon') {
      parts = this.props.parts || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      /*
        This returns the destToken output amount and the optimized list of distributions accross different liquidity pools.
        There are 20 pools: pool 0 - 3 are Quickswap pools, pool 4 - 7 are Sushiswap pools,
        pool 8 - 11 are Dfyn exchange pools, pool 12 - 15 are Dinoswap pools, 16 - 19 are Apeswap pools.
        For example, the distribution [5,"0","0","0","5","0","0","0","10","0","0","0","0","0","0","0","0","0","0",0]
        means 1/4 of the swap amount will route to Quickswap and 1/4 will route to Sushiswap and 1/2 will route to Dyfn.
      */

      sumOne = parts[0] + parts[1] + parts[2] + parts[3]; // Quickswap
      sumTwo = parts[4] + parts[5] + parts[6] + parts[7]; // Sushiswap
      sumThree = parts[8] + parts[9] + parts[10] + parts[11]; // Dfyn
      sumFour = parts[12] + parts[13] + parts[14] + parts[15]; // Dinoswap
      sumFive = parts[16] + parts[17] + parts[18] + parts[19]; // Apeswap
      totalParts = sumOne + sumTwo + sumThree + sumFour + sumFive;

      pools = [{
        name: 'Quickswap',
        icon: TokenListManager.findTokenById('QUICK'),
        size: sumOne / totalParts
      }, {
        name: 'Sushiswap',
        icon: TokenListManager.findTokenById('SUSHI'),
        size: sumTwo / totalParts
      }, {
        name: 'Dfyn',
        icon: TokenListManager.findTokenById('Dfyn'),
        size: sumThree / totalParts
      }, {
        name: 'Dinoswap',
        icon: { logoURI: 'https://dinoswap.exchange/images/dino.png' },
        size: sumFour / totalParts
      }, {
        name: 'Apeswap',
        icon: { logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/8497.png' },
        size: sumFive / totalParts
      }];
    } else if (network.name === 'Smart Chain') {
      parts = this.props.parts || [0, 0, 0, 0, 0, 0, 0, 0, 0];
      /*
        This returns the destToken output amount and the optimized
        list of distributions accross different liquidity pools.
        There are 6 pools: pool 1 and 2 are Pancakeswap pools,
        pool 3 and 4 are Sushiswap pools, and pool 5 - 6 are
        Mdex exchange pools. For example, the distribution
        [1, 0, 2, 0, 0, 0] means 1/3 of the swap amount will route
        to Pancakeswap and 2/3 will route to Sushiswap.[1, 0, 0, 0, 3]
        means 1/3 of amount will route to Pancakeswap and 2/3 will
        route to Mdex.
      */

      sumOne = parts[0] + parts[1] + parts[2];
      sumTwo = parts[3] + parts[4] + parts[5];
      sumThree = parts[6] + parts[7] + parts[8];
      totalParts = sumOne + sumTwo + sumThree;

      pools = [
        {
          name: 'Pancakeswap',
          icon: TokenListManager.findTokenById('CAKE'),
          size: sumOne / totalParts,
        },
        {
          name: 'Sushiswap',
          icon: TokenListManager.findTokenById('SUSHI'),
          size: sumTwo / totalParts,
        },
        {
          name: 'Mdex',
          icon: TokenListManager.findTokenById('MDX'),
          size: sumThree / totalParts,
        },
      ];
    } else if (network.name === 'Avalanche') {
      parts = this.props.parts || [0, 0, 0, 0, 0, 0];

      /*
        This returns the destToken output amount and the optimized
        list of distributions accross different liquidity pools.
        There are 6 pools: pool 1 and 2 are Pancakeswap pools,
        pool 3 and 4 are Sushiswap pools, and pool 5 - 6 are
        Mdex exchange pools. For example, the distribution
        [1, 0, 2, 0, 0, 0] means 1/3 of the swap amount will route
        to Pancakeswap and 2/3 will route to Sushiswap.[1, 0, 0, 0, 3]
        means 1/3 of amount will route to Pancakeswap and 2/3 will
        route to Mdex.
      */

      sumOne = parts[0] + parts[1];
      sumTwo = parts[2] + parts[3];
      sumThree = parts[4] + parts[5];
      totalParts = sumOne + sumTwo + sumThree;

      pools = [
        {
          name: 'Pangolin',
          icon: TokenListManager.findTokenById('PNG'),
          size: sumOne / totalParts,
        },
        {
          name: 'Sushiswap',
          icon: TokenListManager.findTokenById('SUSHI'),
          size: sumTwo / totalParts,
        },
        {
          name: 'TraderJoe',
          icon: TokenListManager.findTokenById('JOE'),
          size: sumThree / totalParts,
        },
      ];
    } else if (network.name === 'xDai') {
      parts = this.props.parts || [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

      /*
        This returns the destToken output amount and the optimized list of distributions accross different liquidity pools.
        There are 16 pools: pool 0 - 7 are Honeyswap pools, pool 8-16 are Sushiswap pools.
        For example, the distribution [0,0,0,0,0,0,0,6,0,0,0,0,6,0,0,6]
        means 1/3 of the swap amount will route to Honeyswap and 2/3 will route to Sushiswap..
      */
      sumOne = parts[0] + parts[1] + parts[2] + parts[3] + parts[4] + parts[5] + parts[6] + parts[7];
      sumTwo = parts[8] + parts[9] + parts[10] + parts[11] + parts[12] + parts[13] + parts[14] + parts[15];
      totalParts = sumOne + sumTwo;
      pools = [
        {
          name: 'Honeyswap',
          icon: {
            logoURI:
              'https://s2.coinmarketcap.com/static/img/exchanges/64x64/1190.png',
          },
          size: sumOne / totalParts,
        },
        {
          name: 'Sushiswap',
          icon: TokenListManager.findTokenById('SUSHI'),
          size: sumTwo / totalParts,
        },
      ];
    } else if (network.name === 'Fantom') {
      parts = this.props.parts || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      /*
        This returns the destToken output amount and the optimized list of distributions accross different liquidity pools.
        There are 12 pools: pool 0 - 3 are Spookyswap pools, pool 4-7 are Sushiswap pools, pool 8-11 are Spiritswap pools.
        For example, the distribution [3,0,3,0,0,0,0,0,3,0,3,0] means 2/3 of the swap amount will route
        to Spookyswap and 1/3 will route to Sushiswap.[0,0,0,0,2,0,0,0,3,3,2,2] means 1/6 of amount will route
        to Sushiswap and 5/6 will route to Spiritswap.
      */
      sumOne = parts[0] + parts[1] + parts[2] + parts[3];
      sumTwo = parts[4] + parts[5] + parts[6] + parts[7];
      sumThree = parts[8] + parts[9] + parts[10] + parts[11];
      totalParts = sumOne + sumTwo + sumThree;
      pools = [
        {
          name: 'Spookyswap',
          icon: {
            logoURI:
                'https://s2.coinmarketcap.com/static/img/coins/64x64/9608.png',
          },
          size: sumOne / totalParts,
        },
        {
          name: 'Sushiswap',
          icon: TokenListManager.findTokenById('SUSHI'),
          size: sumTwo / totalParts,
        },
        {
          name: 'Spiritswap',
          icon: {
            logoURI:
                'https://s2.coinmarketcap.com/static/img/exchanges/64x64/1359.png',
          },
          size: sumThree / totalParts,
        },
      ];
    } else if (network.name === 'Moonriver') {
      parts = this.props.parts || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      /*
        This returns the destToken output amount and the optimized list of distributions accross different liquidity pools.
        There are 18 pools: pool 0 - 5 are Solarbeam pools, pool 6-11 are Sushiswap pools, pool 12-17 are Moonswap pools.
        For example, the distribution ["6","0","6","0","0","0","6","0","0","0","0","0","0","0","0","0","0",0]
        means 2/3 of the swap amount will route to Solarbeam and 1/3 will route to Sushiswap.
        ["0","0","0","0","0","0","3","0","0","0","0","0","6","0","6","0","3",0] means 1/6 of amount will route to Sushiswap and 5/6 will route to Moonswap.
      */
      sumOne = parts[0] + parts[1] + parts[2] + parts[3] + parts[4] + parts[5];
      sumTwo = parts[6] + parts[7] + parts[8] + parts[9] + parts[10] + parts[11];
      sumThree = parts[12] + parts[13] + parts[14] + parts[15] + parts[16] + parts[17];
      totalParts = sumOne + sumTwo + sumThree;
      pools = [
        {
          name: 'Solarbeam',
          icon: TokenListManager.findTokenById('SOLAR'),
          size: sumOne / totalParts
        },
        {
          name: 'Sushiswap',
          icon: { logoURI: 'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png?1606986688' },
          size: sumTwo / totalParts
        },
        {
          name: 'Moonswap',
          icon: { logoURI: 'https://d2kfoba0ei9gzz.cloudfront.net/img/51fee159c3456c1168ccfa3f67bd0cad.png' },
          size: sumThree / totalParts
        }
      ];
    }

    return (
      <div
        className="token-dist-wrapper"
        aria-label="Routing distribution for the swap"
      >
        {_.map(pools, (v, i) => this.renderPool(i, v.icon, v.size))}
      </div>
    );
  }
}
