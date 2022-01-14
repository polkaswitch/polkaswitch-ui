import React, { useEffect } from 'react';
import classNames from 'classnames';
import { useHistory } from 'react-router-dom';
import { FaCheck } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';

import { shortenAddress } from '../../utils/utils';
import { useWallet } from '../../context/solana-wallet';


const Header = ({ onClickWalletBtn, darkMode }) => {
  const history = useHistory();
  const { connected, connect, wallet } = useWallet();
  const [hover, setHover] = React.useState(false);
  // const { onClick, children, disabled, allowWalletChange, ...rest } = props

  useEffect(() => {
    if (connected) {
      setHover(false);
    }
  }, [connected]);

  return (
    <div className="header d-flex">
      {connected ? (
        <div
          className="header__connected"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => wallet?.disconnect()}
        >
          <div className={classNames({ header__checked: !hover, header__closed: hover })}>
            {hover ? <IoMdCloseCircle /> : <FaCheck />}
          </div>
          {hover ? <h6>Disconnect</h6> : <h6>{shortenAddress(`${wallet?.publicKey}`)}</h6>}
        </div>
      ) : (
        <button
          onClick={connected ? onClickWalletBtn : connect}
          // disabled={connected && disabled}
          className="button--fill walletBtn"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default Header;
