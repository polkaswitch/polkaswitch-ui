import { Account, clusterApiUrl, Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { TokenListProvider, ENV as ChainID, TokenInfo } from '@solana/spl-token-registry';

export const ENDPOINTS = [
  {
    name: 'mainnet-beta',
    endpoint: 'https://solana-api.projectserum.com',
    chainID: ChainID.MainnetBeta,
  },
  {
    name: 'testnet',
    endpoint: clusterApiUrl('testnet'),
    chainID: ChainID.Testnet,
  },
  {
    name: 'devnet',
    // endpoint: 'https://psytrbhymqlkfrhudd.dev.genesysgo.net:8899/',
    endpoint: clusterApiUrl('devnet'),
    chainID: ChainID.Devnet,
  },
  {
    name: 'localnet',
    endpoint: 'http://127.0.0.1:8899',
    chainID: ChainID.Devnet,
  },
];

const DEFAULT = ENDPOINTS[0];
const DEFAULT_SLIPPAGE = 0.25;

const ConnectionContext = React.createContext({
  endpoint: DEFAULT.endpoint,
  setEndpoint: () => {},
  slippage: DEFAULT_SLIPPAGE,
  setSlippage: (val) => {},
  connection: new Connection(DEFAULT.endpoint, 'recent'),
  sendConnection: new Connection(DEFAULT.endpoint, 'recent'),
  env: DEFAULT.name,
  tokens: [],
  tokenMap: new Map(),
});

export function SolanaConnectionProvider({ children = undefined }) {
  const [endpoint, setEndpoint] = useState(DEFAULT.endpoint);

  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE.toString());

  const connection = useMemo(() => new Connection(endpoint, 'recent'), [endpoint]);
  const sendConnection = useMemo(() => new Connection(endpoint, 'recent'), [endpoint]);

  const chain = ENDPOINTS.find((end) => end.endpoint === endpoint) || DEFAULT;
  const env = chain.name;

  const [tokens, setTokens] = useState([]);
  const [tokenMap, setTokenMap] = useState(new Map());

  // The websocket library solana/web3.js uses closes its websocket connection when the subscription list
  // is empty after opening its first time, preventing subsequent subscriptions from receiving responses.
  // This is a hack to prevent the list from every getting empty
  useEffect(() => {
    const id = connection.onAccountChange(new Account().publicKey, () => {});
    return () => {
      connection.removeAccountChangeListener(id);
    };
  }, [connection]);

  useEffect(() => {
    var id = connection.onSlotChange(() => null);
    return () => {
      connection.removeSlotChangeListener(id);
    };
  }, [connection]);

  useEffect(() => {
    const id = sendConnection.onAccountChange(new Account().publicKey, () => {});
    return () => {
      sendConnection.removeAccountChangeListener(id);
    };
  }, [sendConnection]);

  useEffect(() => {
    const id = sendConnection.onSlotChange(() => null);
    return () => {
      sendConnection.removeSlotChangeListener(id);
    };
  }, [sendConnection]);

  return (
    <ConnectionContext.Provider
      value={{
        endpoint,
        setEndpoint,
        slippage: parseFloat(slippage),
        setSlippage: (val) => setSlippage(val.toString()),
        connection,
        sendConnection,
        tokens,
        tokenMap,
        env,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return useContext(ConnectionContext).connection;
}

export function useSendConnection() {
  return useContext(ConnectionContext)?.sendConnection;
}

export function useConnectionConfig() {
  const context = useContext(ConnectionContext);
  return {
    endpoint: context.endpoint,
    setEndpoint: context.setEndpoint,
    env: context.env,
    tokens: context.tokens,
    tokenMap: context.tokenMap,
  };
}

export function useSlippageConfig() {
  const { slippage, setSlippage } = useContext(ConnectionContext);
  return { slippage, setSlippage };
}

const getErrorForTransaction = async (connection, txid) => {
  // wait for all confirmation before geting transaction
  await connection.confirmTransaction(txid, 'max');

  const tx = await connection.getParsedConfirmedTransaction(txid);

  const errors = [];
  if (tx?.meta && tx.meta.logMessages) {
    tx.meta.logMessages.forEach((log) => {
      const regex = /Error: (.*)/gm;
      let m;
      while ((m = regex.exec(log)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
          regex.lastIndex++;
        }

        if (m.length > 1) {
          errors.push(m[1]);
        }
      }
    });
  }

  return errors;
};