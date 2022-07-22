import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AccountInfo, ConfirmedSignatureInfo, ConfirmedTransaction, Connection, PublicKey } from '@solana/web3.js';
import { AccountLayout, u64, MintInfo, MintLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useSolanaWallet } from './SolanaWalletContext';
import { useConnection } from './SolanaConnection';
import { SolEventEmitter } from '../utils/events';
import SolWallet, { NATIVE_SOL_MINT } from '../utils/solanaWallet';

const AccountsContext = React.createContext(null);

const pendingCalls = new Map();
const genericCache = new Map();
const transactionCache = new Map();
window.solanaAccounts = [];

export const getMint = async (connection, key) => {
  const id = typeof key === 'string' ? key : key?.toBase58();
  const acc_info = await connection.getAccountInfo(key);
  const info = MintParser(key, acc_info);
  return info;
};

export const MintParser = (pubKey, info) => {
  const buffer = Buffer.from(info.data);

  const data = deserializeMint(buffer);

  const details = {
    pubkey: pubKey,
    account: {
      ...info,
    },
    info: data,
  };

  return details;
};

export const TokenAccountParser = (pubKey, info) => {
  const buffer = Buffer.from(info.data);
  const data = deserializeAccount(buffer);

  const details = {
    pubkey: pubKey,
    account: {
      ...info,
    },
    info: data,
  };
  return details;
};

export const GenericAccountParser = (pubKey, info) => {
  const buffer = Buffer.from(info.data);

  const details = {
    pubkey: pubKey,
    account: {
      ...info,
    },
    info: buffer,
  };

  return details;
};

export const keyToAccountParser = new Map();

export const cache = {
  emitter: new SolEventEmitter(),
  query: async (connection, pubKey, parser) => {
    let id;
    if (typeof pubKey === 'string') {
      id = new PublicKey(pubKey);
    } else {
      id = pubKey;
    }

    const address = id.toString();

    const account = genericCache.get(address);
    if (account) {
      return account;
    }

    let query = pendingCalls.get(address);
    if (query) {
      return query;
    }

    // TODO: refactor to use multiple accounts query with flush like behavior
    query = connection.getAccountInfo(id).then((data) => {
      if (!data) {
        throw new Error('Account not found');
      }

      return cache.add(id, data, parser);
    });
    pendingCalls.set(address, query);

    return query;
  },
  add: (id, obj, parser) => {
    if (obj.data.length === 0) {
      return;
    }

    var address = typeof id === 'string' ? id : id.toBase58();
    var deserialize = parser || keyToAccountParser.get(address);
    if (!deserialize) {
      return;
      // throw new Error('Deserializer needs to be registered or passed as a parameter');
    }

    cache.registerParser(id, deserialize);
    pendingCalls.delete(address);
    var account = deserialize(new PublicKey(address), obj);
    if (!account) {
      return;
    }

    var isNew = !genericCache.has(address);

    genericCache.set(address, account);
    cache.emitter.raiseCacheUpdated(address, isNew, deserialize);
    return account;
  },
  get: (pubKey) => {
    let key;
    if (typeof pubKey !== 'string') {
      key = pubKey.toBase58();
    } else {
      key = pubKey;
    }

    return genericCache.get(key);
  },
  delete: (pubKey) => {
    let key;
    if (typeof pubKey !== 'string') {
      key = pubKey.toBase58();
    } else {
      key = pubKey;
    }

    if (genericCache.get(key)) {
      genericCache.delete(key);
      cache.emitter.raiseCacheDeleted(key);
      return true;
    }
    return false;
  },

  byParser: (parser) => {
    const result = [];
    for (const id of keyToAccountParser.keys()) {
      if (keyToAccountParser.get(id) === parser) {
        result.push(id);
      }
    }

    return result;
  },
  registerParser: (pubkey, parser) => {
    if (pubkey) {
      const address = typeof pubkey === 'string' ? pubkey : pubkey?.toBase58();
      keyToAccountParser.set(address, parser);
    }

    return pubkey;
  },
  addTransaction: (signature, tx) => {
    transactionCache.set(signature, tx);
    return tx;
  },
  addBulkTransactions: (txs) => {
    for (const tx of txs) {
      transactionCache.set(tx.signature.signature, tx);
    }
    return txs;
  },
  getTransaction: (signature) => {
    const transaction = transactionCache.get(signature);
    return transaction;
  },
  getAllTransactions: () => {
    return transactionCache;
  },
  clear: () => {
    genericCache.clear();
    transactionCache.clear();
    cache.emitter.raiseCacheCleared();
  },
};

export const useAccountsContext = () => {
  const context = useContext(AccountsContext);

  return context;
};

function wrapNativeAccount(pubkey, account) {
  if (!account) {
    return undefined;
  }

  return {
    pubkey,
    account,
    info: {
      address: pubkey,
      mint: new PublicKey(NATIVE_SOL_MINT),
      owner: pubkey,
      amount: new u64(account.lamports),
      delegate: null,
      delegatedAmount: new u64(0),
      isInitialized: true,
      isFrozen: false,
      isNative: true,
      rentExemptReserve: null,
      closeAuthority: null,
    },
  };
}

const UseNativeAccount = () => {
  const connection = useConnection();
  const { wallet, publicKey } = useSolanaWallet();

  const [nativeAccount, setNativeAccount] = useState();
  const updateCache = useCallback(
    (account) => {
      if (!connection || !publicKey) {
        return;
      }
      const wrapped = wrapNativeAccount(publicKey, account);
      if (wrapped !== undefined) {
        const id = publicKey.toBase58();
        cache.registerParser(id, TokenAccountParser);
        genericCache.set(id, wrapped);
        cache.emitter.raiseCacheUpdated(id, false, TokenAccountParser);
      }
    },
    [publicKey, connection]
  );

  useEffect(() => {
    if (!connection || !publicKey) {
      return;
    }
    SolWallet.setWalletAddress(publicKey.toString());
    connection.getAccountInfo(publicKey).then((acc) => {
      if (acc) {
        updateCache(acc);
        setNativeAccount(acc);
      }
    });
    connection.onAccountChange(publicKey, (acc) => {
      console.log('*************Account is Changed**********', acc);
      if (acc) {
        updateCache(acc);
        setNativeAccount(acc);
      }
    });
  }, [setNativeAccount, wallet, publicKey, connection, updateCache]);

  return { nativeAccount };
};

const PRECACHED_OWNERS = new Set();
const precacheUserTokenAccounts = async (connection, owner) => {
  if (!owner) {
    return;
  }

  // used for filtering account updates over websocket
  PRECACHED_OWNERS.add(owner.toBase58());

  // user accounts are update via ws subscription
  const accounts = await connection.getTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });
  accounts.value.forEach((info) => {
    cache.add(info.pubkey.toBase58(), info.account, TokenAccountParser);
  });
};

export function SolanaAccountsProvider({ children = null }) {
  const connection = useConnection();
  const { publicKey, wallet, connected } = useSolanaWallet();
  const [tokenAccounts, setTokenAccounts] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const { nativeAccount } = UseNativeAccount();

  const selectUserAccounts = useCallback(() => {
    if (!publicKey) {
      return [];
    }

    const address = publicKey.toBase58();
    return cache
      .byParser(TokenAccountParser)
      .map((id) => cache.get(id))
      .filter((a) => a && a.info.owner.toBase58() === address)
      .map((a) => a);
  }, [publicKey]);

  useEffect(() => {
    const accounts = selectUserAccounts().filter((a) => a !== undefined);
    SolWallet.setTokenAccounts(accounts);
    setUserAccounts(accounts);
  }, [nativeAccount, wallet, tokenAccounts, selectUserAccounts]);

  useEffect(() => {
    const subs = [];
    cache.emitter.onCache((args) => {
      if (args.isNew) {
        const { id } = args;
        const deserialize = args.parser;
        connection.onAccountChange(new PublicKey(id), (info) => {
          cache.add(id, info, deserialize);
        });
      }
    });

    return () => {
      subs.forEach((id) => connection.removeAccountChangeListener(id));
    };
  }, [connection]);

  useEffect(() => {
    if (!connection || !publicKey) {
      setTokenAccounts([]);
    } else {
      console.log('*************Updating all token account of wallet**********');
      precacheUserTokenAccounts(connection, publicKey).then(() => {
        setTokenAccounts(selectUserAccounts());
      });

      SolWallet.setConnected(connected);

      // This can return different types of accounts: token-account, mint, multisig
      // TODO: web3.js expose ability to filter.
      // this should use only filter syntax to only get accounts that are owned by user
      const tokenSubID = connection.onProgramAccountChange(
        TOKEN_PROGRAM_ID,
        (info) => {
          // TODO: fix type in web3.js
          const id = info.accountId;
          // TODO: do we need a better way to identify layout (maybe a enum identifing type?)
          if (info.accountInfo.data.length === AccountLayout.span) {
            const data = deserializeAccount(info.accountInfo.data);

            if (PRECACHED_OWNERS.has(data.owner.toBase58())) {
              cache.add(id, info.accountInfo, TokenAccountParser);
              setTokenAccounts(selectUserAccounts());
            }
          }
        },
        'singleGossip'
      );

      return () => {
        connection.removeProgramAccountChangeListener(tokenSubID);
      };
    }
  }, [connection, connected, publicKey, selectUserAccounts]);

  return (
    <AccountsContext.Provider
      value={{
        userAccounts,
        nativeAccount,
      }}
    >
      {children}
    </AccountsContext.Provider>
  );
}

export function useNativeAccount() {
  const context = useContext(AccountsContext);
  return {
    account: context.nativeAccount,
  };
}
export function chunks(array, size) {
  return Array.apply(0, new Array(Math.ceil(array.length / size))).map((_, index) =>
    array.slice(index * size, (index + 1) * size)
  );
}

export const getMultipleAccounts = async (connection, keys, commitment) => {
  const result = await Promise.all(
    chunks(keys, 99).map((chunk) => getMultipleAccountsCore(connection, chunk, commitment))
  );

  const array = result
    .map(
      (a) =>
        a.array
          .map((acc) => {
            if (!acc) {
              return undefined;
            }

            const { data, ...rest } = acc;
            const obj = {
              ...rest,
              data: Buffer.from(data[0], 'base64'),
            } ;
            return obj;
          })
          .filter((_) => _) 
    )
    .flat();
  return { keys, array };
};

const getMultipleAccountsCore = async (connection, keys, commitment) => {
  const args = connection._buildArgs([keys], commitment, 'base64');

  const unsafeRes = await connection._rpcRequest('getMultipleAccounts', args);
  if (unsafeRes.error) {
    throw new Error(`failed to get info about account ${unsafeRes.error.message}`);
  }

  if (unsafeRes.result.value) {
    const array = unsafeRes.result.value;
    return { keys, array };
  }

  // TODO: fix
  throw new Error();
};
export function useMint(key) {
  const connection = useConnection();
  const [mint, setMint] = useState();
  const id = typeof key === 'string' ? key : key?.toBase58();

  useEffect(() => {
    if (connection && id) {
      getMint(connection, id)
        .then((info) => {
          setMint(info);
        })
        .catch((e) => {
          console.log("Can't fetch the mint address");
        });
    }
    return () => {};
  }, [connection, id]);

  return mint;
}

export const useUserAccounts = () => {
  const context = useAccountsContext();
  return {
    userAccounts: context.userAccounts,
  };
};

export const useAccountByMint = (mint) => {
  const { userAccounts } = useUserAccounts();
  const index = userAccounts.findIndex((acc) => acc.info.mint.toBase58() === mint);

  if (index !== -1) {
    return userAccounts[index];
  }
};

export function useAccount(pubKey) {
  const connection = useConnection();
  const [account, setAccount] = useState();

  const key = pubKey?.toBase58();
  useEffect(() => {
    const query = async () => {
      try {
        if (!key) {
          return;
        }

        const acc = await cache.query(connection, key, TokenAccountParser).catch((err) => console.log(err));
        if (acc) {
          setAccount(acc);
        }
      } catch (err) {
        console.error(err);
      }
    };

    query();

    const dispose = cache.emitter.onCache((e) => {
      const event = e;
      if (event.id === key) {
        query();
      }
    });
    return () => {
      dispose();
    };
  }, [connection, key]);

  return account;
}

// TODO: expose in spl package
const deserializeAccount = (data) => {
  const accountInfo = AccountLayout.decode(data);
  accountInfo.mint = new PublicKey(accountInfo.mint);
  accountInfo.owner = new PublicKey(accountInfo.owner);
  accountInfo.amount = u64.fromBuffer(accountInfo.amount);

  if (accountInfo.delegateOption === 0) {
    accountInfo.delegate = null;
    accountInfo.delegatedAmount = new u64(0);
  } else {
    accountInfo.delegate = new PublicKey(accountInfo.delegate);
    accountInfo.delegatedAmount = u64.fromBuffer(accountInfo.delegatedAmount);
  }

  accountInfo.isInitialized = accountInfo.state !== 0;
  accountInfo.isFrozen = accountInfo.state === 2;

  if (accountInfo.isNativeOption === 1) {
    accountInfo.rentExemptReserve = u64.fromBuffer(accountInfo.isNative);
    accountInfo.isNative = true;
  } else {
    accountInfo.rentExemptReserve = null;
    accountInfo.isNative = false;
  }

  if (accountInfo.closeAuthorityOption === 0) {
    accountInfo.closeAuthority = null;
  } else {
    accountInfo.closeAuthority = new PublicKey(accountInfo.closeAuthority);
  }

  return accountInfo;
};

// TODO: expose in spl package
const deserializeMint = (data) => {
  // if (data.length !== MintLayout.span) {
  //   throw new Error("Not a valid Mint");
  // }

  const mintInfo = MintLayout.decode(data);

  if (mintInfo.mintAuthorityOption === 0) {
    mintInfo.mintAuthority = null;
  } else {
    mintInfo.mintAuthority = new PublicKey(mintInfo.mintAuthority);
  }

  mintInfo.supply = u64.fromBuffer(mintInfo.supply);
  mintInfo.isInitialized = mintInfo.isInitialized !== 0;

  if (mintInfo.freezeAuthorityOption === 0) {
    mintInfo.freezeAuthority = null;
  } else {
    mintInfo.freezeAuthority = new PublicKey(mintInfo.freezeAuthority);
  }

  return mintInfo;
};
