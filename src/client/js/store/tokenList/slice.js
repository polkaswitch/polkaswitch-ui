import { createSlice } from '@reduxjs/toolkit'

const initialState = {}

export const tokenListSlice = createSlice({
  name: 'tokenList',
  initialState,
  reducers: {
    updateTokenList: (state, action) => {
        state[action.payload.networkId] = action.payload.tokenList
    }
  },
})

// Action creators are generated for each case reducer function
export const { updateTokenList } = tokenListSlice.actions

export default tokenListSlice.reducer