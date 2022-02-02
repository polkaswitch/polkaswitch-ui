import React, { Component } from 'react';

export default class CrossChainToggle extends Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    this.props.handleChange(event.target.checked);
  }

  render() {
    return (
      <span className="cross-chain-toggle switcher">
        <input id="cross-chain-switcher" type="checkbox" checked={this.props.checked} onChange={this.handleChange} />
        <label htmlFor="cross-chain-switcher" />
      </span>
    );
  }
}
