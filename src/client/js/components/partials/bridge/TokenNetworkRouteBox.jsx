import React from 'react';
import TokenIconImg from '../TokenIconImg';

export default function TokenNetworkRouteBox(props) {
  const { info } = props;

  return (
    <div className="token-network-route-box">
      {info && (
        <div>
          <div className="token-wrapper">
            <TokenIconImg size={16} mr={4} imgSrc={info.token.logoURI} />
            <div>
              <div className="symbol">{info.token.name}</div>
              <div className="amount">{info.token.amount}</div>
            </div>
          </div>
          <div className="network-name">
            <div className="text">{info.network.name}</div>
          </div>
        </div>
      )}
    </div>
  );
}
