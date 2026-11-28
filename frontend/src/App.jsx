import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoute from "./utils/PrivateRoute";
import ScrollToTop from "./utils/ScrollToTop";
import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";

const Home = lazy(() => import("./pages/public/Home"));
const PublicAboutUs = lazy(() => import("./pages/public/AboutUs"));
const PublicTerms = lazy(() => import("./pages/public/Terms"));
const PublicPrivacy = lazy(() => import("./pages/public/Privacy"));
const PublicContactUs = lazy(() => import("./pages/public/ContactUs"));
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
const SupportTicketsList = lazy(() => import("./pages/supportTickets/SupportTicketsList"));
const SupportTicketDetail = lazy(() => import("./pages/supportTickets/SupportTicketDetail"));

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
const PostView = lazy(() => import("./pages/posts/PostView"));

const ReportsList = lazy(() => import("./pages/reports/ReportsList"));
const ReportDetailPage = lazy(() => import("./pages/reports/ReportDetailPage"));

const AdminNotifications = lazy(() => import("./pages/notifications/AdminNotifications"));

const DisputesList = lazy(() => import("./pages/disputes/DisputesList"));
const WalletsList = lazy(() => import("./pages/wallets/WalletsList"));
const PromoCodes = lazy(() => import("./pages/marketing/PromoCodes"));
const FraudMonitoring = lazy(() => import("./pages/management/FraudMonitoring"));
const SubAdminsList = lazy(() => import("./pages/subadmins/SubAdminsList"));
const RolesList = lazy(() => import("./pages/subadmins/RolesList"));

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
          <Route path="/login" element={<Login />} />
          <Route path="/subadmin" element={<Login />} />
          <Route path="/subadmin/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<PrivateRoute element={<Dashboard />} permission="dashboard:view" moduleName="Dashboard" />} />
            <Route path="/profile" element={<PrivateRoute element={<Profile />} />} />
            <Route path="/changepassword" element={<PrivateRoute element={<ChangePassword />} />} />

            <Route path="/cms/privacy" element={<PrivateRoute element={<Privacy />} permission="cms:view" moduleName="Privacy Policy" />} />
            <Route path="/cms/about-us" element={<PrivateRoute element={<AboutUs />} permission="cms:view" moduleName="About Us" />} />
            <Route path="/cms/terms" element={<PrivateRoute element={<Terms />} permission="cms:view" moduleName="Terms & Conditions" />} />
            <Route path="/cms/faqs" element={<PrivateRoute element={<FAQs />} permission="cms:view" moduleName="FAQs" />} />
            <Route path="/cms/community-guidelines" element={<PrivateRoute element={<CommunityGuidelines />} permission="cms:view" moduleName="Community Guidelines" />} />
            <Route path="/locations" element={<PrivateRoute element={<LocationManagement />} permission="locations:view" moduleName="Locations" />} />

            <Route path="/usersList" element={<PrivateRoute element={<UsersList />} permission="users:view" moduleName="Users" />} />
            <Route path="/usersListDeleted" element={<PrivateRoute element={<UsersListDeleted />} permission="users:view" moduleName="Users" />} />
            <Route path="/usersView/:id" element={<PrivateRoute element={<UsersView />} permission="users:view" moduleName="Users" />} />

            <Route path="/contactUs" element={<PrivateRoute element={<ContactUs />} permission="support:view" moduleName="Support" />} />
            <Route path="/viewContactUs/:id" element={<PrivateRoute element={<ViewContactUs />} permission="support:view" moduleName="Support" />} />

            <Route path="/support-tickets" element={<PrivateRoute element={<SupportTicketsList />} permission="support:view" moduleName="Support Tickets" />} />
            <Route path="/support-tickets/:id" element={<PrivateRoute element={<SupportTicketDetail />} permission="support:view" moduleName="Support Tickets" />} />

            <Route path="/providers" element={<PrivateRoute element={<ProvidersList />} permission="users:view" moduleName="Providers" />} />
            <Route path="/providers/:id/verification" element={<PrivateRoute element={<ProviderVerification />} permission="users:view" moduleName="Providers" />} />
            <Route path="/providers/:id" element={<PrivateRoute element={<ProviderDetail />} permission="users:view" moduleName="Providers" />} />

            <Route path="/categories" element={<PrivateRoute element={<CategoriesList />} permission="categories:view" moduleName="Service Categories" />} />

            <Route path="/services" element={<PrivateRoute element={<ServicesList />} permission="categories:view" moduleName="Services" />} />

            <Route path="/bookings" element={<PrivateRoute element={<BookingsListPage />} permission="bookings:view" moduleName="Bookings" />} />
            <Route path="/bookings/:id" element={<PrivateRoute element={<BookingDetailPage />} permission="bookings:view" moduleName="Bookings" />} />

            <Route path="/payments" element={<PrivateRoute element={<PaymentsList />} permission="payments:view" moduleName="Payments" />} />

            <Route path="/withdrawals" element={<PrivateRoute element={<WithdrawalsList />} permission="withdrawals:view" moduleName="Withdrawals" />} />

            <Route path="/posts" element={<PrivateRoute element={<PostsList />} permission="posts:view" moduleName="Posts" />} />
            <Route path="/posts/:id" element={<PrivateRoute element={<PostView />} permission="posts:view" moduleName="Posts" />} />

            <Route path="/reports" element={<PrivateRoute element={<ReportsList />} permission="reports:view" moduleName="Reports" />} />
            <Route path="/reports/:id" element={<PrivateRoute element={<ReportDetailPage />} permission="reports:view" moduleName="Reports" />} />

            <Route path="/notifications" element={<PrivateRoute element={<AdminNotifications />} permission="notifications:view" moduleName="Notifications" />} />

            <Route path="/disputes" element={<PrivateRoute element={<DisputesList />} permission="disputes:view" moduleName="Disputes" />} />
            <Route path="/wallets" element={<PrivateRoute element={<WalletsList />} permission="wallets:view" moduleName="Wallets" />} />
            <Route path="/subadmins" element={<PrivateRoute element={<SubAdminsList />} permission="subadmins:view" moduleName="Sub-Admins" />} />
            <Route path="/roles" element={<PrivateRoute element={<RolesList />} permission="roles:view" moduleName="Roles & Permissions" />} />
            <Route path="/promo-codes" element={<PrivateRoute element={<PromoCodes />} permission="marketing:view" moduleName="Promo Codes" />} />
            <Route path="/fraud-monitoring" element={<PrivateRoute element={<FraudMonitoring />} permission="dashboard:view" moduleName="Fraud Monitoring" />} />
          </Route>
          <Route element={<PublicLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/about" element={<PublicAboutUs />} />
            <Route path="/terms" element={<PublicTerms />} />
            <Route path="/privacy" element={<PublicPrivacy />} />
            <Route path="/contact" element={<PublicContactUs />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
