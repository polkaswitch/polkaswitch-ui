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
            document.body.style.backgroundColor = "#201923";
            const bodyElt = document.querySelector("html");
            bodyElt.style.backgroundColor = "#201923";
        },
        switchToLightMode: (state) => {
            state.isDarkMode = false;
            document.body.style.backgroundColor = "#f2f7f9";
            const bodyElt = document.querySelector("html");
            bodyElt.style.backgroundColor = "#f2f7f9";
        },
    },
});

export const {switchToDarkMode, switchToLightMode} = darkModeSlice.actions;

export default darkModeSlice.reducer;
