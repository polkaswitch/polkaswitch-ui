import { configureStore } from '@reduxjs/toolkit'
import tokenListReducer from './tokenList/slice'

export const store = configureStore({
  reducer: {
      tokenList: tokenListReducer
  },
})