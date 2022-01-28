import React, { useEffect } from 'react';
import _ from 'underscore';
import TokenIconImg from '../TokenIconImg';

export default function TokenSearchItem(props) {
  const { token, balances, refresh } = props;

  useEffect(() => {
    if (
      !balances[token.symbol]
      || (balances[token.symbol] && balances[token.symbol].refresh)
    ) {
      props.fetchBalance(token);
    }
  }, [refresh]);

  return (
    <span className="level-left my-2">
      <span className="level-item">
        <TokenIconImg network={props.network} size={35} token={token} />
      </span>
      <span className="level-item">{token.name}</span>
      <div className="token-symbol-balance-wrapper">
        <span className="has-text-grey">{token.symbol}</span>
        {!_.isNull(props.getBalanceNumber(token)) && (
          <span className="has-text-grey">{props.getBalanceNumber(token)}</span>
        )}
      </div>
    </span>
  );
}
