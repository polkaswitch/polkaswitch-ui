import React, { useEffect } from "react";
import _ from "underscore"
import TokenIconImg from "../TokenIconImg";
import classnames from "classnames";
import {connect} from "react-redux";

function TokenSearchItem(props) {
  const { token, balances, refresh } = props;

  useEffect(()=>{
    if (!balances[token.symbol] || (balances[token.symbol] && balances[token.symbol].refresh)) {
      props.fetchBalance(token);
    }
  }, [refresh]);

  return (
    <span className="level-left my-2">
      <span className="level-item">
        <TokenIconImg
          size={35}
          token={token} />
      </span>
      <span className="level-item">{token.name}</span>
      <div className="token-symbol-balance-wrapper">
        <span className={classnames("has-text-grey",{"text-white-color":props.isDarkMode})}>{token.symbol}</span>
        { !_.isNull(props.getBalanceNumber(token)) &&
          <span className="has-text-grey">{props.getBalanceNumber(token)}</span>
        }
      </div>
    </span>
  )
}

const mapStateToProps = (state) => ({
    isDarkMode: state.darkMode.isDarkMode
});

const mapDispatchToProps = { };

export default connect(mapStateToProps, mapDispatchToProps)(TokenSearchItem);