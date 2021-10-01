import React, { useEffect, useRef } from 'react';

export default function Dashboard() {
  return (
      <div>
        <div className="block">
          <div className="level notification is-light is-info">
            <div className="level-item has-text-centered">
              <div>
                <p>Total Supply</p>
                <p><b>$15.54M</b></p>
              </div>
            </div>
            <div className="level-item has-text-centered">
              <div>
                <p>24 Hour Volume</p>
                <p><b>$19.54B</b></p>
              </div>
            </div>
            <div className="level-item has-text-centered">
              <div>
                <p>Pooled ETH</p>
                <p><b>837.83</b></p>
              </div>
            </div>
            <div className="level-item has-text-centered">
              <div>
                <p>Market Cap</p>
                <p><b>$61.83B</b></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}

