import React, { Component } from 'react';
import classnames from 'classnames';
import SwapFn from '../../utils/swapFn';

export default class GasPriceControl extends Component {
  constructor(props) {
    super(props);

    this.handleClick = this.handleClick.bind(this);
    this.onCustomChange = this.onCustomChange.bind(this);

    this.state = this.getStateFromStorage();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.refresh !== this.props.refresh) {
      this.setState(this.getStateFromStorage());
    }
  }

  getStateFromStorage() {
    const { gasSpeedSetting } = SwapFn.getSetting();
    const { isCustomGasPrice } = SwapFn.getSetting();
    const { customGasPrice } = SwapFn.getSetting();

    return {
      custom: isCustomGasPrice,
      customValue: isCustomGasPrice ? customGasPrice : '',
      gasSpeed: gasSpeedSetting,
    };
  }

  handleClick(event) {
    this.setState({
      gasSpeed: event.target.value,
      custom: false,
      customValue: '',
    });

    SwapFn.updateSettings({
      gasSpeedSetting: event.target.value,
      customGasPrice: '',
      isCustomGasPrice: false,
    });
  }

  onCustomChange(e) {
    this.setState({
      custom: true,
      customValue: e.target.value,
    });

    if (!isNaN(e.target.value) && e.target.value.match(/^\d+(\.\d+)?$/)) {
      SwapFn.updateSettings({
        customGasPrice: +e.target.value,
        isCustomGasPrice: true,
      });
    } else {
      this.setState({
        custom: false,
      });
    }
  }

  render() {
    const { gasSpeed } = this.state;
    return (
      <div className="gas-price-control">
        <div className={classnames('select', { disabled: this.state.custom })}>
          <select value={gasSpeed} onChange={this.handleClick}>
            <option value="safeLow">
              Auto (~
              {window.GAS_STATS.safeLow}
              )
            </option>
            <option value="fast">
              Fast (~
              {window.GAS_STATS.fast}
              )
            </option>
            <option value="fastest">
              Fastest (~
              {window.GAS_STATS.fastest}
              )
            </option>
          </select>
        </div>
        <div className="control has-icons-right">
          <input
            className={classnames('input', {
              'is-info is-light is-outlined': this.state.custom,
            })}
            value={this.state.customValue}
            type="number"
            placeholder="0.0"
            onChange={this.onCustomChange}
          />
        </div>
      </div>
    );
  }
}
