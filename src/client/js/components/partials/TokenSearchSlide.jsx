import React, { Component } from 'react';
import _ from 'underscore';
import TokenSearchBar from './TokenSearchBar';

export default class TokenSearchSlide extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const network = this.props.network || TokenListManager.getCurrentNetworkConfig();
    const crossChainTokens = _.map(network.supportedCrossChainTokens, (v) =>
      TokenListManager.findTokenById(v, network),
    );

    // passing undefined, will default to the original network list.
    // we only want to show the cross-chain tokens from the sending chain
    const tokenList = this.props.isCrossChain && this.props.isFrom ? crossChainTokens : undefined;

    return (
      <div className="page page-stack page-view-search">
        <div className="page-inner">
          <TokenSearchBar
            inline
            network={this.props.network}
            tokenList={tokenList}
            focused={this.props.showSearch}
            placeholder="Try DAI, USDT or Ethereum ... "
            handleClose={this.props.handleSearchToggle('to')} // "to" is arbitary
            handleTokenChange={this.props.handleTokenChange}
          />
        </div>
      </div>
    );
  }
}
