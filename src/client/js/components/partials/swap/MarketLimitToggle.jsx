import React, { Component } from 'react';
import _ from "underscore";
import classnames from 'classnames';

export default class MarketLimitToggle extends Component {
  constructor(props) {
    super(props);
    this.state = { checked: true};
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    this.setState({ checked: event.target.checked });
  }


  render() {
    return (
      <span
        className="switcher hint--bottom hint--medium"
        aria-label="Limit orders are coming soon to Polkaswitch! Currently only Market orders are available"
      >
        <input className={this.props.isDarkMode? "dark-switch" : ""}
          id="order-type-switcher"
          type="checkbox"
          checked={true || this.state.checked}
          onChange={this.handleChange} />
        <label className={this.props.isDarkMode? "dark-switch-toggle" : ""} htmlFor="order-type-switcher"></label>
      </span>
    );
  }
}

