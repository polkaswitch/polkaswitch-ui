import React from 'react';
import AdditionalInfoItem from './AdditionalInfoItem';
import TokenIconImg from '../TokenIconImg';
import Divider from './Divider';

export default function RouteItemMobileView(props) {
  const { data } = props;

  return (
    <div className="bridge-route-item-mobile">
      {data.length > 0
        && _.map(data, (item, index) => {
          switch (item.type) {
            case 'token-network':
              return (
                <TokenIconImg
                  key={index}
                  size={28}
                  imgSrc={item.token && item.token.logoURI}
                />
              );
            case 'swap':
              return <Divider key={index} />;
            case 'bridge':
              return <Divider key={index} />;
            case 'additional':
              return <AdditionalInfoItem key={index} info={item} />;
            default:
              return null;
          }
        })}
    </div>
  );
}
