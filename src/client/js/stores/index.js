import { configureStore } from "@reduxjs/toolkit";
import darkModeSlice from "./darkModeSlice";


export default configureStore({
    reducer: {
        darkMode: darkModeSlice,
    },
});
