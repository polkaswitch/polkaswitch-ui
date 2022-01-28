import React, { useEffect, useRef } from 'react';
import classnames from 'classnames';
import _ from 'underscore';
import TokenIconImg from '../TokenIconImg';

export default function TokenPairSelector(props) {
  const renderTokenPairs = () => _.map(props.tokenPairs, (v, i) => (
    <a
      href="#"
      key={i}
      onClick={() => handleTokenPairChange(v)}
      className="dropdown-item"
    >
      <span>{v.name}</span>
    </a>
  ));

  const handleTokenPairChange = (tokenPair) => {
    props.handleTokenPairChange(tokenPair);
  };

  return (
    <div className="level is-mobile is-narrow my-0 token-dropdown">
      <div className="level-item level-left">
        <div className={classnames('dropdown is-left is-hoverable')}>
          <div className="dropdown-trigger">
            <button
              className="button boxshadow-none is-info is-light"
              style={{ padding: 0 }}
              aria-haspopup="true"
              aria-controls="dropdown-menu"
            >
              {props.selectedPair
                && props.selectedPair.fromSymbol
                && props.selectedPair.toSymbol && (
                  <span className="level-left">
                    <TokenIconImg
                      size={54}
                      mr={-10}
                      z_index={10}
                      token={{ address: props.selectedPair.fromAddress }}
                      imgSrc={props.selectedPair.fromTokenLogo}
                    />
                    <TokenIconImg
                      size={54}
                      mr={10}
                      token={{ address: props.selectedPair.toAddress }}
                      imgSrc={props.selectedPair.toTokenLogo}
                    />
                    <span className="text">{props.selectedPair.name}</span>
                  </span>
              )}
              {props.selectedPair
                && props.selectedPair.fromSymbol
                && !props.selectedPair.toSymbol && (
                  <span className="level-left">
                    <TokenIconImg
                      size={54}
                      mr={10}
                      token={{ address: props.selectedPair.fromAddress }}
                      imgSrc={props.selectedPair.fromTokenLogo}
                    />
                    <span>{props.selectedPair.name}</span>
                  </span>
              )}
            </button>
          </div>
          <div className="dropdown-menu" id="dropdown-menu" role="menu">
            <div className="dropdown-content">{renderTokenPairs()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
