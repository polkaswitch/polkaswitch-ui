import React from 'react';
import TokenNetworkRouteBox from './TokenNetworkRouteBox';
import BridgeRouteBox from './BridgeRouteBox';
import SwapRouteBox from './SwapRouteBox';
import AdditionalInfoItem from './AdditionalInfoItem';
import DashedDivider from './DashedDivider';

export default function RouteItemView(props) {
  const { data } = props;

  return (
    <div className="bridge-route-item">
      {data.length > 0 &&
        _.map(data, (item, index) => {
          switch (item.type) {
            case 'token-network':
              return (
                <div key={index} className="is-flex is-flex-direction-row is-align-items-center">
                  <TokenNetworkRouteBox info={item} />
                  {data.length - 2 !== index && <DashedDivider />}
                </div>
              );
            case 'swap':
              return (
                <div key={index} className="is-flex is-flex-direction-row is-align-items-center">
                  <SwapRouteBox info={item} />
                  {data.length - 2 !== index && <DashedDivider />}
                </div>
              );
            case 'bridge':
              return (
                <div key={index} className="is-flex is-flex-direction-row is-align-items-center">
                  <SwapRouteBox info={item} />
                  {data.length - 2 !== index && <DashedDivider />}
                </div>
              );
            case 'additional':
              return <AdditionalInfoItem key={index} info={item} />;
            default:
              return null;
          }
        })}
    </div>
  );
}
