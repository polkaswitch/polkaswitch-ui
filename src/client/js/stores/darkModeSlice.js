import {createSlice} from '@reduxjs/toolkit';


const initialState = {
    isDarkMode: false,
};

export const darkModeSlice = createSlice({
    name: 'darkMode',
    initialState,
    reducers: {
        switchToDarkMode: (state, action) => {
            state.isDarkMode = true;
        },
        switchToLightMode: (state) => {
            state.isDarkMode = false;
        },
    },
});

export const {switchToDarkMode, switchToLightMode} = darkModeSlice.actions;

export default darkModeSlice.reducer;
