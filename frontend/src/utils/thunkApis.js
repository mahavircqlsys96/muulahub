import { createAsyncThunk } from "@reduxjs/toolkit";
import apiInstance from "../utils/apiInstance";

export const get_user_by_id = createAsyncThunk("fetch/get_user_by_id", async (id) => {
  const response = await apiInstance.get(`/adminProfile/${id}`);
  return response?.data?.body;
});

export const get_dashboard_count = createAsyncThunk("fetch/get_dashboard_count", async () => {
  const response = await apiInstance.get(`/dashboard_data`);
  return response?.data?.body;
});

export const get_dashboard_graph = createAsyncThunk("fetch/getMonthlyUserStats", async () => {
  const response = await apiInstance.get(`/getMonthlyUserStats`);
  return response?.data?.body;
});

export const get_cms = createAsyncThunk("fetch/get_cms", async (slug) => {
  const response = await apiInstance.get(`/getCms/${slug}`);
  return response?.data?.body;
});

export const contact_us_list = createAsyncThunk("fetch/contact_us_list", async ({ page, limit, search, status }) => {
  let url = `/contactUsList?page=${page}&limit=${limit}&search=${search || ""}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;
  const response = await apiInstance.get(url);
  return response?.data?.body;
});

export const get_user_list = createAsyncThunk("fetch/get_user_list", async ({ page, limit, search, role }) => {
  const response = await apiInstance.get(`/userList?page=${page}&limit=${limit}&search=${search}&role=${role}`);
  return response?.data?.body;
});

export const get_user_list_deleted = createAsyncThunk("fetch/get_user_list_deleted", async ({ page, limit, search }) => {
  const response = await apiInstance.get(`/userListDeleted?page=${page}&limit=${limit}&search=${search}`);
  return response?.data?.body;
});

export const get_user_details = createAsyncThunk("fetch/get_user_details", async ({ id, role }) => {
  const response = await apiInstance.get(`/viewUser/${id}/${role}`);
  return response?.data?.body;
});

export const get_providers = createAsyncThunk("fetch/get_providers", async ({ page, limit, search, status }) => {
  let url = `/providers?page=${page}&limit=${limit}&search=${search || ""}`;
  if (status) url += `&status=${status}`;
  const response = await apiInstance.get(url);
  return response?.data?.body;
});

export const get_provider_detail = createAsyncThunk("fetch/get_provider_detail", async (id) => {
  const response = await apiInstance.get(`/providers/${id}`);
  return response?.data?.body;
});

export const get_bookings = createAsyncThunk("fetch/get_bookings", async ({ page, limit, search, status }) => {
  let url = `/bookings?page=${page}&limit=${limit}&search=${search || ""}`;
  if (status) url += `&status=${status}`;
  const response = await apiInstance.get(url);
  return response?.data?.body;
});

export const get_payments = createAsyncThunk("fetch/get_payments", async ({ page, limit, search, status }) => {
  let url = `/payments?page=${page}&limit=${limit}&search=${search || ""}`;
  if (status) url += `&status=${status}`;
  const response = await apiInstance.get(url);
  return response?.data?.body;
});

export const get_withdrawals = createAsyncThunk("fetch/get_withdrawals", async ({ page, limit, status }) => {
  let url = `/withdrawals?page=${page}&limit=${limit}`;
  if (status) url += `&status=${status}`;
  const response = await apiInstance.get(url);
  return response?.data?.body;
});

export const get_posts = createAsyncThunk("fetch/get_posts", async ({ page, limit, search, status }) => {
  let url = `/posts?page=${page}&limit=${limit}&search=${search || ""}`;
  if (status) url += `&status=${status}`;
  const response = await apiInstance.get(url);
  return response?.data?.body;
});

export const get_reports = createAsyncThunk("fetch/get_reports", async ({ page, limit, reportType, status }) => {
  let url = `/reports?page=${page}&limit=${limit}`;
  if (reportType) url += `&reportType=${reportType}`;
  if (status) url += `&status=${status}`;
  const response = await apiInstance.get(url);
  return response?.data?.body;
});

export const get_categories = createAsyncThunk("fetch/get_categories", async ({ page, limit, search }) => {
  const response = await apiInstance.get(`/categories?page=${page}&limit=${limit}&search=${search || ""}`);
  return response?.data?.body;
});

export const user_list = async () => {
  const response = await apiInstance.get(`/userList2`);
  return response.data?.body;
};
