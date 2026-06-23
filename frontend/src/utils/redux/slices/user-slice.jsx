import { createSlice } from "@reduxjs/toolkit";
import { get_user_by_id, get_dashboard_count, get_dashboard_graph, get_cms, contact_us_list, get_user_list, get_user_details } from "../../thunkApis";

const initialState = {
    user: {},
    dashboardCount: {},
    dashboardGraph: {},
    cms: {},
    contactUsList: [],
    userList: [],
    userDetails: {},
}

const userSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {
    },
    extraReducers: (builder) => {
        builder.addCase(get_user_by_id.fulfilled, (state, action) => {
            state.user = action.payload;
        })
        builder.addCase(get_dashboard_count.fulfilled, (state, action) => {
            state.dashboardCount = action.payload;
        })
        builder.addCase(get_dashboard_graph.fulfilled, (state, action) => {
            state.dashboardGraph = action.payload;
        })
        builder.addCase(get_cms.fulfilled, (state, action) => {
            state.cms = action.payload;
        })
        builder.addCase(contact_us_list.fulfilled, (state, action) => {
            state.contactUsList = action.payload;
        })
        builder.addCase(get_user_list.fulfilled, (state, action) => {
            state.userList = action.payload;
        })
        builder.addCase(get_user_details.fulfilled, (state, action) => {
            state.userDetails = action.payload;
        })
    }
});

export default userSlice.reducer;
