import React from 'react';
import classnames from 'classnames';

export default function ChartRangeSelector(props) {
  const handleTimeRangeChange = (range) => {
    props.handleTimeRangeChange(range);
  };

  return (
    <div className="chart-range-selector">
      {_.map(props.timeRangeList[props.selectedViewMode], (v, i) => {
        const isActive =
          i ===
          props.timeRangeList[props.selectedViewMode].findIndex((item) => item.name === props.selectedTimeRange.name);
        return (
          <div
            className={classnames('time-range-item', {
              active: isActive,
            })}
            key={i}
            onClick={() => handleTimeRangeChange(v)}
          >
            <span className="time-range-text">{v.name}</span>
          </div>
        );
      })}
    </div>
  );
}
