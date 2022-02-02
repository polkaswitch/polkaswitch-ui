import React from 'react';
import RouteItemView from './RouteItemView';
import RouteItemMobileView from './RouteItemMobileView';

export default function RouteItemWrapper(props) {
  const routeItem = props.data.route;

  return (
    <div className="bridge-route-item-wrapper">
      <input
        type="radio"
        id={`control_${props.index}`}
        name="select"
        value={props.data.transactionId}
        onChange={props.handleChange}
        defaultChecked={props.index === 0}
      />
      <label htmlFor={`control_${props.index}`}>
        <RouteItemView data={routeItem} />
        <RouteItemMobileView data={routeItem} />
      </label>
    </div>
  );
}
