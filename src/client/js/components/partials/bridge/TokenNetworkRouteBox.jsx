import React from 'react';
import TokenIconImg from '../TokenIconImg';

export default function TokenNetworkRouteBox(props) {
  const { info } = props;

  return (
    <div className="token-network-route-box">
      {info && (
        <div>
          <div className="token-wrapper">
            <TokenIconImg size={16} mr={7} token={info.token} />
            <div>
              <div className="symbol">{info.token.symbol}</div>
              <div className="amount">{info.amount}</div>
            </div>
          </div>
          <div className="network-name" style={{ backgroundColor: info.network.color }}>
            <div className="text">{info.network.name}</div>
          </div>
        </div>
      )}

    </div>
  );
}
