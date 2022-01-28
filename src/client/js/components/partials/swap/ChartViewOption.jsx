import React from 'react';

export default function ChartViewOption(props) {
  const handleViewOptionChange = (event) => {
    let viewOption = 'candlestick';
    if (event.target.checked) {
      viewOption = 'candlestick';
    } else {
      viewOption = 'line';
    }

    props.handleViewModeChange(viewOption);
  };

  return (
    <div className="chart-view-option">
      <span className="trading-view-switcher">
        <input
          id="trading-view-switcher"
          type="checkbox"
          checked={props.selectedViewMode !== 'line'}
          onChange={handleViewOptionChange}
        />
        <label htmlFor="trading-view-switcher" />
      </span>
    </div>
  );
}
