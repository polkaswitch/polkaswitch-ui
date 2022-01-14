import React, { useEffect } from 'react';
import classNames from 'classnames';
import { useHistory } from 'react-router-dom';
import { FaCheck } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';

import { shortenAddress } from '../../utils/utils';
import { useWallet } from '../../context/solana-wallet';
import {transferFromSOL2ETH, transferFromETH2SOL} from '../../utils/wormholeTest';

const SolanaWizard = ({ onClickWalletBtn, darkMode }) => {
  const { connected, connect, wallet } = useWallet();
  // const { onClick, children, disabled, allowWalletChange, ...rest } = props

  const handleTransferFromSol2Eth = ()=> {
    transferFromSOL2ETH(wallet);
  }
  const handleTransferFromEth2Sol = ()=> {
    console.log("Transfer from Ethereum to Solana");
    console.log(wallet.publicKey.toString());
  }
  return (
    <div className="header d-flex">
      <button
        onClick={handleTransferFromSol2Eth}
        disabled={!connected}
        className="button is-primary bridge-order-btn"
      >
        Transfer From Sol to Eth
      </button>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      <button
        onClick={handleTransferFromEth2Sol}
        disabled={!connected}
        className="button is-primary bridge-order-btn"
      >
        Transfer From Eth to Sol
      </button>
    </div>
  );
};

export default SolanaWizard;
