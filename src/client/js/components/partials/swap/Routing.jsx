import React, { useEffect, useRef } from 'react';

export default function Routing(){
  useEffect(() => {
  }, []);

  // Resize chart on container resizes.
  useEffect(() => {
  }, []);

  return (
      <div>
        <div className="block is-size-6"><b>Routing</b></div>
        <div className="block">
          <div className="columns">
            <div className="column is-half">
              <div className="tile is-ancestor">
                <div className="tile is-parent">
                  <article className="tile is-child notification is-light is-info is-flex
                    is-flex-direction-column is-align-items-center is-justify-content-center">
                    <b>Balancer</b>
                  </article>
                </div>
                <div className="tile is-parent is-vertical">
                  <article className="tile is-child notification is-light is-info is-flex
                    is-flex-direction-column is-align-items-center is-justify-content-center">
                    <b>Sushiswap</b>
                  </article>
                  <article className="tile is-child notification is-light is-info is-flex
                    is-flex-direction-column is-align-items-center is-justify-content-center">
                    <b>Uniswap</b>
                  </article>
                </div>
              </div>
            </div>
            <div className="column">
            </div>
          </div>
        </div>
      </div>
    );
}

