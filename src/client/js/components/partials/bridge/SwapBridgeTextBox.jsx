import React, { useState } from 'react';

export default function SwapBridgeTextBox(props) {
  const { info } = props;

  return (
    <div className="swap-bridge-route-box">
      {info && (
        <div>
          <div className="title-wrapper">
            <img
              src={info.type === 'swap' ? '/images/swap_box.svg' : '/images/bridge_box.svg'}
              alt={info.type === 'swap' ? 'swap-box' : 'bridge_box'}
            />
            <div className="title">{info.type === 'swap' ? 'Swap' : 'Bridge'}</div>
          </div>
          <div className="fee-wrapper">
            <span className="text">Fee: {info.type === 'swap' ? `"$"${info.data.fee}` : `${info.data.fee}"%"`}</span>
          </div>
        </div>
      )}
    </div>
  );
}
