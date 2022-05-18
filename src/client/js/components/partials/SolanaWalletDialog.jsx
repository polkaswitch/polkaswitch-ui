import {
  Button,
  List,
  ListItem,
  makeStyles,
} from '@material-ui/core';
import { useWallet } from '@solana/wallet-adapter-react';
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {WalletIcon} from '@solana/wallet-adapter-material-ui';

const useStyles = makeStyles((theme) => ({
  root: {
    '& .MuiListItem-root': {
      boxShadow: 'inset 0 1px 0 0 ' + 'rgba(255, 255, 255, 0.1)',
      '&:hover': {
          boxShadow:
              'inset 0 1px 0 0 ' + 'rgba(255, 255, 255, 0.1)' + ', 0 1px 0 0 ' + 'rgba(255, 255, 255, 0.05)',
      },
      padding: 0,
      '& .MuiButton-endIcon': {
          margin: 0,
      },
      '& .MuiButton-root': {
          flexGrow: 1,
          justifyContent: 'space-between',
          padding: theme.spacing(1, 3),
          borderRadius: undefined,
          fontSize: '1rem',
          fontWeight: 400,
      },
      '& .MuiSvgIcon-root': {
          color: theme.palette.grey[500],
      },
    },
  },
}));

export const SolanaWalletDialog = ({
  handleClose,
  ...props
}) => {
  const styles = useStyles();
  const { wallets, select, wallet, publicKey, connect, connecting, connected, disconnect, disconnecting  } = useWallet();
  const [walletName, setWalletName] = useState('');
  useEffect(() => {
    if (connecting) console.log('Connecting ...');
    else if (connected) {
      console.log('Connected');
      handleClose();
    }
    else if (disconnecting) console.log('Disconnecting ...');
    else if (wallet) console.log('Connect');
    else console.log("Connect Wallet");
  }, [connecting, connected, wallet]);

  const handleWalletClick = useCallback(
      async (event, walletName) => {
        if(wallet) {
          await disconnect();
        }
        select(walletName);
        setWalletName(walletName);
      },
      [select]
  );
  useEffect(() => {
    if(wallet) {
      connect().catch(() => {
          // Silently catch because any errors are caught by the context `onError` handler
      });
    }
    return () =>{
      // disconnect();
    }
  }, [wallet]);

  return (
    <>
      <div>{publicKey?.toString()}</div>
      <List className={styles.root}>
          {wallets.map((wallet) => (
            <ListItem key={wallet.name}>
              <Button onClick={(event) => handleWalletClick(event, wallet.name)} endIcon={<WalletIcon wallet={wallet} />}>
                  {wallet.name + (walletName == wallet.name ? connected ? ' - connected' : '- selected' : '')}
              </Button>
            </ListItem>
          ))}

      </List>
    </>
  );
};
export default SolanaWalletDialog;