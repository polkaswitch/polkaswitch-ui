import React, { Component } from 'react';
import classnames from 'classnames';
import SwapFn from '../../utils/swapFn';

const tolerances = [0.1, 0.5, 1.0];
const defaultCurrentValue = 0.5;

export default class SwapSlippageControl extends Component {
  constructor(props) {
    super(props);
    const { slippage } = SwapFn.getSetting();
    if (tolerances.indexOf(slippage) > -1) {
      this.state = {
        custom: false,
        customValue: '',
        current: slippage,
      };
    } else {
      this.state = {
        custom: true,
        customValue: slippage,
        current: defaultCurrentValue,
      };
    }

    this.handleClick = this.handleClick.bind(this);
    this.onCustomChange = this.onCustomChange.bind(this);
  }

  handleClick(v) {
    return function (e) {
      this.setState({
        current: +v,
        custom: false,
        customValue: '',
      });

      this.props.handleSlippage(+v);
    }.bind(this);
  }

  onCustomChange(e) {
    this.setState({
      custom: true,
      customValue: e.target.value,
    });

    if (!isNaN(e.target.value) && e.target.value.match(/^\d+(\.\d+)?$/)) {
      this.props.handleSlippage(+e.target.value);
    } else {
      this.setState({
        current: defaultCurrentValue,
        custom: false,
      });
    }
  }

  render() {
    return (
      <div className="slippage-control">
        {tolerances.map((v) => (
          <span
            key={v}
            onClick={this.handleClick(v)}
            className={classnames('button', {
              'is-info is-light is-outlined': !this.state.custom && +v === this.state.current,
              disabled: this.state.custom,
            })}
          >
            {v}%
          </span>
        ))}
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
          <span className="icon is-right">%</span>
        </div>
      </div>
    );
  }
}
