import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./slices/user-slice";

const Store = configureStore({
    reducer: {
        users: userSlice,
    }
})

export { Store }