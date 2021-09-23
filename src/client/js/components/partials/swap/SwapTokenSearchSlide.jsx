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
import {switchToDarkMode, switchToLightMode} from "../../../stores/darkModeSlice";
import {connect} from "react-redux";

 class SwapTokenSearchSlide extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className={classnames("page page-stack page-view-search ",{
        "dark-bg":this.props.isDarkMode
      })}>
        <div className="page-inner">
          <TokenSearchBar
            inline={true}
            focused={this.props.showSearch}
            placeholder={"Try DAI, USDT or Ethereum ... "}
            handleClose={this.props.handleSearchToggle("to")}
            handleTokenChange={this.props.handleTokenChange} />
        </div>
      </div>
    );
  }

}

const mapStateToProps = (state) => ({
  isDarkMode: state.darkMode.isDarkMode
});

const mapDispatchToProps = { switchToLightMode, switchToDarkMode };

export default connect(mapStateToProps, mapDispatchToProps)(SwapTokenSearchSlide);