import axios from 'axios';

const API_BASE =
  import.meta.env.VITE_ADMIN_API_BASE
export const imageBaseUrl =
  import.meta.env.VITE_IMAGE_BASE

const apiInstance = axios.create({
  baseURL: API_BASE,
});

apiInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const errMsg = error.response?.data?.msg || error.response?.data?.message;
      if (error.response?.status === 403 || error.response?.status === 401) {
        if (
          errMsg === 'Unauthorized: Token missing' ||
          errMsg === 'Forbidden: Invalid or expired token' ||
          errMsg === 'Invalid token payload. Please login again.' ||
          errMsg === 'Session expired. Please login again.' ||
          errMsg === 'Internal Server Error' ||
          errMsg === 'Forbidden: admin access required'
        ) {
          let isSubAdmin = false;
          try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            isSubAdmin = Boolean(u?.isSubAdmin);
          } catch (e) { }
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = isSubAdmin ? '/subadmin' : '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const API_ROUTES = {
  // Auth
  login: '/login',
  forgotPassword: '/forgotPassword',
  resetPassword: '/resetPassword',
  adminProfile: (id) => `/adminProfile/${id}`,

  // Dashboard
  dashboard: '/dashboard_data',
  charts: '/getMonthlyUserStats',

  // Users
  userList: '/userList',
  userDeleted: '/userListDeleted',
  viewUser: (id, role) => `/viewUser/${id}/${role}`,
  toggleUser: (id) => `/toggleUserStatus/${id}`,
  deleteUser: (id) => `/deleteUser/${id}`,
  restoreUser: (id) => `/restoreUser/${id}`,

  // CMS
  cms: (slug) => `/getCms/${slug}`,
  updateCms: '/updateCms',

  // Contact
  contactList: '/contactUsList',
  contactOne: (id) => `/contactUs/${id}`,

  // Providers
  providers: '/providers',
  providerDetail: (id) => `/providers/${id}`,
  updateProviderStatus: '/updateProviderStatus',
  pendingVerifications: '/pendingVerifications',

  // Categories
  categories: '/categories',
  categoryToggle: (id) => `/categories/${id}/toggle`,

  // Bookings
  bookings: '/bookings',
  bookingStats: '/bookings/stats',
  bookingDetail: (id) => `/bookings/${id}`,
  updateBookingStatus: (id) => `/bookings/${id}/status`,

  // Payments
  payments: '/payments',
  paymentStats: '/payments/stats',
  paymentDetail: (id) => `/payments/${id}`,

  // Withdrawals
  withdrawals: '/withdrawals',
  withdrawalDetail: (id) => `/withdrawals/${id}`,
  updateWithdrawal: (id) => `/withdrawals/${id}/status`,

  // Posts
  posts: '/posts',
  postDetail: (id) => `/posts/${id}`,
  updatePostStatus: (id) => `/posts/${id}/status`,

  // Reports
  reports: '/reports',
  updateReport: (id) => `/reports/${id}`,

  // Notifications
  bulkNotify: '/notifications/bulk',
  notificationList: '/notifications',
};

export default apiInstance;
