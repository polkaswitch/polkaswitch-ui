import React, { Component } from 'react';
import _ from "underscore";
import classnames from 'classnames';

import TokenSearchBar from './../TokenSearchBar';
import TokenIconBalanceGroupView from './TokenIconBalanceGroupView';
import TokenSwapDistribution from './TokenSwapDistribution';
import MarketLimitToggle from './MarketLimitToggle';

import Wallet from '../../../utils/wallet';
import Metrics from '../../../utils/metrics';
import EventManager from '../../../utils/events';

export default class SwapTokenSearchSlide extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="page page-stack page-view-search">
        <div className="page-inner">
          <TokenSearchBar
            inline={true}
            network={this.props.network}
            focused={this.props.showSearch}
            placeholder={"Try DAI, USDT or Ethereum ... "}
            handleClose={this.props.handleSearchToggle("to")} // "to" is arbitary
            handleTokenChange={this.props.handleTokenChange} />
        </div>
      </div>
    );
  }

}

