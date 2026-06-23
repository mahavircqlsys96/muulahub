import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoute from "./utils/PrivateRoute";
import ScrollToTop from "./utils/ScrollToTop";
import Layout from "./components/Layout";

const Login = lazy(() => import("./pages/admin/Login"));
const ForgotPassword = lazy(() => import("./pages/admin/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/admin/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/admin/Profile"));
const ChangePassword = lazy(() => import("./pages/admin/ChangePassword"));

const Privacy = lazy(() => import("./pages/cms/Privacy"));
const AboutUs = lazy(() => import("./pages/cms/AboutUs"));
const Terms = lazy(() => import("./pages/cms/Terms"));
const FAQs = lazy(() => import("./pages/faqs/FAQs"));
const CommunityGuidelines = lazy(() => import("./pages/cms/CommunityGuidelines"));
const LocationManagement = lazy(() => import("./pages/locations/LocationManagement"));

const UsersList = lazy(() => import("./pages/users/UsersList"));
const UsersListDeleted = lazy(() => import("./pages/users/UsersListDeleted"));
const UsersView = lazy(() => import("./pages/users/UsersView"));

const ContactUs = lazy(() => import("./pages/contactUs/ContactUs"));
const ViewContactUs = lazy(() => import("./pages/contactUs/ViewContactUs"));

const ProvidersList = lazy(() => import("./pages/providers/ProvidersList"));
const ProviderVerification = lazy(() => import("./pages/providers/ProviderVerification"));
const ProviderDetail = lazy(() => import("./pages/providers/ProviderDetail"));

const CategoriesList = lazy(() => import("./pages/categories/CategoriesList"));

const ServicesList = lazy(() => import("./pages/services/ServicesList"));

const BookingsListPage = lazy(() => import("./pages/bookings/BookingsListPage"));
const BookingDetailPage = lazy(() => import("./pages/bookings/BookingDetailPage"));

const PaymentsList = lazy(() => import("./pages/payments/PaymentsList"));

const WithdrawalsList = lazy(() => import("./pages/withdrawals/WithdrawalsList"));

const PostsList = lazy(() => import("./pages/posts/PostsList"));

const ReportsList = lazy(() => import("./pages/reports/ReportsList"));

const AdminNotifications = lazy(() => import("./pages/notifications/AdminNotifications"));

const DisputesList = lazy(() => import("./pages/disputes/DisputesList"));
const WalletsList = lazy(() => import("./pages/wallets/WalletsList"));
const PromoCodes = lazy(() => import("./pages/marketing/PromoCodes"));
const FraudMonitoring = lazy(() => import("./pages/management/FraudMonitoring"));

const fallback = (
  <div className="d-flex justify-content-center align-items-center p-5">
    <div className="spinner-border" style={{ width: "3rem", height: "3rem", color: "var(--primary)" }} />
  </div>
);

const App = () => {
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={fallback}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<PrivateRoute element={<Dashboard />} />} />
            <Route path="/profile" element={<PrivateRoute element={<Profile />} />} />
            <Route path="/changepassword" element={<PrivateRoute element={<ChangePassword />} />} />

            <Route path="/privacy" element={<PrivateRoute element={<Privacy />} />} />
            <Route path="/about-us" element={<PrivateRoute element={<AboutUs />} />} />
            <Route path="/terms" element={<PrivateRoute element={<Terms />} />} />
            <Route path="/faqs" element={<PrivateRoute element={<FAQs />} />} />
            <Route path="/community-guidelines" element={<PrivateRoute element={<CommunityGuidelines />} />} />
            <Route path="/locations" element={<PrivateRoute element={<LocationManagement />} />} />

            <Route path="/usersList" element={<PrivateRoute element={<UsersList />} />} />
            <Route path="/usersListDeleted" element={<PrivateRoute element={<UsersListDeleted />} />} />
            <Route path="/usersView/:id" element={<PrivateRoute element={<UsersView />} />} />

            <Route path="/contactUs" element={<PrivateRoute element={<ContactUs />} />} />
            <Route path="/viewContactUs/:id" element={<PrivateRoute element={<ViewContactUs />} />} />

            <Route path="/providers" element={<PrivateRoute element={<ProvidersList />} />} />
            <Route path="/providers/:id/verification" element={<PrivateRoute element={<ProviderVerification />} />} />
            <Route path="/providers/:id" element={<PrivateRoute element={<ProviderDetail />} />} />

            <Route path="/categories" element={<PrivateRoute element={<CategoriesList />} />} />

            <Route path="/services" element={<PrivateRoute element={<ServicesList />} />} />

            <Route path="/bookings" element={<PrivateRoute element={<BookingsListPage />} />} />
            <Route path="/bookings/:id" element={<PrivateRoute element={<BookingDetailPage />} />} />

            <Route path="/payments" element={<PrivateRoute element={<PaymentsList />} />} />

            <Route path="/withdrawals" element={<PrivateRoute element={<WithdrawalsList />} />} />

            <Route path="/posts" element={<PrivateRoute element={<PostsList />} />} />

            <Route path="/reports" element={<PrivateRoute element={<ReportsList />} />} />

            <Route path="/notifications" element={<PrivateRoute element={<AdminNotifications />} />} />

            <Route path="/disputes" element={<PrivateRoute element={<DisputesList />} />} />
            <Route path="/wallets" element={<PrivateRoute element={<WalletsList />} />} />
            <Route path="/promo-codes" element={<PrivateRoute element={<PromoCodes />} />} />
            <Route path="/fraud-monitoring" element={<PrivateRoute element={<FraudMonitoring />} />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
