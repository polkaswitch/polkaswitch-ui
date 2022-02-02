import React, { Component } from 'react';
import _ from 'underscore';
import classnames from 'classnames';

import TokenListManager from '../../utils/tokenList';

export default class TxExplorerLink extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const network =
      this.props.network ||
      TokenListManager.getNetworkById(this.props.chainId) ||
      TokenListManager.getCurrentNetworkConfig();
    return (
      <a target="_blank" href={`${network.explorerBaseUrl}${this.props.hash}`}>
        {this.props.children}
      </a>
    );
  }
}
