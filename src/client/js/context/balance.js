import React from 'react';

const balanceContext = React.createContext({});

const { Provider } = balanceContext;

export { balanceContext, Provider as BalanceProvider };
