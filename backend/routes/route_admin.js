var express = require('express');
var router = express.Router();
const authenticateAdminJWT = require('../middleware/authMiddleware').authenticateAdminJWT;

const authController = require('../controllers/admin/authController');
const cmsController = require('../controllers/admin/cmsController');
const contactUsController = require('../controllers/admin/contactUsController');
const dashboardController = require('../controllers/admin/dashboardController');
const userController = require('../controllers/admin/userController');
const providerController = require('../controllers/admin/providerController');
const bookingController = require('../controllers/admin/bookingController');
const paymentController = require('../controllers/admin/paymentController');
const withdrawalController = require('../controllers/admin/withdrawalController');
const postsController = require('../controllers/admin/postsController');
const categoryController = require('../controllers/admin/categoryController');
const reportController = require('../controllers/admin/reportController');
const notificationController = require('../controllers/admin/notificationController');
const serviceController = require('../controllers/admin/serviceController');
const disputeController = require('../controllers/admin/disputeController');
const walletController = require('../controllers/admin/walletController');
const promoController = require("../controllers/admin/promoController");
const faqController = require('../controllers/admin/faqController');
const locationController = require('../controllers/admin/locationController');
const fraudController = require('../controllers/admin/fraudController');
const subAdminController = require('../controllers/admin/subAdminController');
const supportTicketController = require('../controllers/admin/supportTicketController');
const { requirePermission, requireSuperAdmin } = require('../middleware/rbacMiddleware');


// ─── Public Admin Routes ───
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.post('/resetPassword', authController.resetPassword);

// ─── Protected Admin Routes ───
router.use(authenticateAdminJWT);

// Promo Codes
router.get('/promo-codes', promoController.listPromos);
router.post('/promo-codes', promoController.createPromo);
router.put('/promo-codes/:id/toggle', promoController.togglePromoStatus);
router.delete('/promo-codes/:id', promoController.deletePromo);

// FAQ Module
router.get('/faqs', faqController.getFaqs);
router.post('/faqs', faqController.addFaq);
router.put('/faqs/:id', faqController.updateFaq);
router.put('/faqs/status/:id', faqController.toggleStatus);
router.delete('/faqs/:id', faqController.deleteFaq);

// Location Management
router.get('/locations/countries', locationController.getCountries);
router.post('/locations/countries', locationController.addCountry);
router.put('/locations/countries/:id', locationController.updateCountry);
router.put('/locations/countries/status/:id', locationController.toggleCountryStatus);
router.delete('/locations/countries/:id', locationController.deleteCountry);

router.get('/locations/states', locationController.getStates);
router.post('/locations/states', locationController.addState);
router.put('/locations/states/:id', locationController.updateState);
router.put('/locations/states/status/:id', locationController.toggleStateStatus);
router.delete('/locations/states/:id', locationController.deleteState);

router.get('/locations/cities', locationController.getCities);
router.post('/locations/cities', locationController.addCity);
router.put('/locations/cities/:id', locationController.updateCity);
router.put('/locations/cities/status/:id', locationController.toggleCityStatus);
router.delete('/locations/cities/:id', locationController.deleteCity);

// Admin Profile
router.get('/adminProfile/:id', authController.adminProfile);
router.put('/updateProfile', authController.updateProfile);
router.put('/updatePassword', authController.updatePassword);

// Dashboard
router.get('/dashboard_data', requirePermission('dashboard:view'), dashboardController.dashboard_data);
router.get('/getMonthlyUserStats', requirePermission('dashboard:view'), dashboardController.getMonthlyUserStats);

// User Management
router.get('/userList', requirePermission('users:view'), userController.userList);
router.get('/userList2', requirePermission('users:view'), userController.userList2);
router.get('/userListDeleted', requirePermission('users:view'), userController.userListDeleted);
router.get('/userFollowers/:id', requirePermission('users:view'), userController.userFollowers);
router.get('/userFollowing/:id', requirePermission('users:view'), userController.userFollowing);
router.get('/viewUser/:id/:role', requirePermission('users:view'), userController.viewUser);
router.get('/userCategories/:id', requirePermission('users:view'), userController.getUserCategories);
router.put('/toggleUserStatus/:id', requirePermission('users:suspend'), userController.toggleUserStatus);
router.put('/updateApprovalStatus', requirePermission('users:edit'), userController.updateApprovalStatus);
router.put('/updateLicenseApproval/:id?', requirePermission('users:edit'), userController.updateLicenseApproval);
router.post('/updateLicenseApproval', requirePermission('users:edit'), userController.updateLicenseApproval);
router.put('/updateBlueTickStatus/:id?', requirePermission('users:edit'), userController.updateBlueTickStatus);
router.post('/updateBlueTickStatus', requirePermission('users:edit'), userController.updateBlueTickStatus);
router.delete('/deleteUser/:id', requirePermission('users:edit'), userController.deleteUser);
router.put('/restoreUser/:id', requirePermission('users:reactivate'), userController.restoreUser);
router.post('/generateUserQR', requirePermission('users:view'), userController.generateUserQR);

// CMS
router.get('/getCms/:slug', requirePermission('cms:view'), cmsController.getCms);
router.put('/updateCms', requirePermission('cms:edit'), cmsController.updateCms);

// Contact Support
router.get('/contactUsList', requirePermission('support:view'), contactUsController.contactUs_list);
router.get('/contactUs/:id', requirePermission('support:view'), contactUsController.view_contactUs);
router.put('/contactUs/:id', requirePermission('support:respond'), contactUsController.update_contactUs);
router.delete('/deleteContactUs/:id', requirePermission('support:close'), contactUsController.delete_contactUs);

// Provider Management
router.get('/providers', requirePermission('providers:view'), providerController.providerList);
router.put('/providers/:id/avatar', requirePermission('providers:edit'), providerController.updateProviderAvatar);
router.get('/providers/:id', requirePermission('providers:view'), providerController.viewProvider);
router.put('/providers/:id/categories', requirePermission('providers:edit'), providerController.updateProviderCategories);
router.put('/updateProviderStatus', requirePermission('providers:verify'), providerController.updateProviderStatus);
router.get('/pendingVerifications', requirePermission('providers:view'), providerController.pendingVerifications);

// Services Categories
router.get('/categories', requirePermission('categories:view'), categoryController.categoryList);
router.post('/categories', requirePermission('categories:create'), categoryController.createCategory);
router.put('/categories/:id', requirePermission('categories:edit'), categoryController.updateCategory);
router.delete('/categories/:id', requirePermission('categories:delete'), categoryController.deleteCategory);
router.put('/categories/:id/toggle', requirePermission('categories:edit'), categoryController.toggleCategoryStatus);

// Services Management
router.get('/services', requirePermission('categories:view'), serviceController.serviceList);
router.put('/services/:id/status', requirePermission('categories:edit'), serviceController.updateServiceStatus);

// Booking Management
router.get('/bookings', requirePermission('bookings:view'), bookingController.bookingList);
router.get('/bookings/stats', requirePermission('bookings:view'), bookingController.bookingStats);
router.get('/bookings/:id', requirePermission('bookings:view'), bookingController.bookingDetail);
router.put('/bookings/:id/status', requirePermission('bookings:manage'), bookingController.updateBookingStatus);

// Payment Management
router.get('/payments', requirePermission('payments:view'), paymentController.paymentList);
router.get('/payments/stats', requirePermission('payments:view'), paymentController.paymentStats);
router.get('/payments/:id', requirePermission('payments:view'), paymentController.paymentDetail);

// Withdrawal Management
router.get('/withdrawals', requirePermission('withdrawals:view'), withdrawalController.withdrawalList);
router.get('/withdrawals/:id', requirePermission('withdrawals:view'), withdrawalController.withdrawalDetail);
router.put('/withdrawals/:id/status', requirePermission('withdrawals:approve'), withdrawalController.updateWithdrawalStatus);

// Posts Moderation
router.get('/posts', requirePermission('posts:view'), postsController.postsList);
router.get('/posts/:id', requirePermission('posts:view'), postsController.postDetail);
router.put('/posts/:id/status', requirePermission('posts:hide'), postsController.updatePostStatus);
router.delete('/posts/:id', requirePermission('posts:remove'), postsController.deletePost);

// Reports
router.get('/reports', requirePermission('reports:view'), reportController.reportList);
router.get('/reports/:id', requirePermission('reports:view'), reportController.getReportDetail);
router.put('/reports/:id', requirePermission('reports:review'), reportController.updateReportStatus);

// Disputes
router.get('/disputes', requirePermission('disputes:view'), disputeController.disputeList);
router.get('/disputes/:id', requirePermission('disputes:view'), disputeController.disputeDetail);
router.put('/disputes/:id/resolve', requirePermission('disputes:resolve'), disputeController.resolveDispute);

// Wallets
router.get('/wallets', requirePermission('wallets:view'), walletController.walletList);
router.get('/wallets/transactions', requirePermission('wallets:view'), walletController.walletTransactions);
router.post('/wallets/update', requirePermission('wallets:adjust'), walletController.updateWallet);
router.put('/wallets/:id/freeze', requirePermission('wallets:adjust'), walletController.freezeWallet);

// Notifications
router.post('/notifications/bulk', requirePermission('notifications:send'), notificationController.sendBulkNotification);
router.get('/notifications', requirePermission('notifications:view'), notificationController.notificationList);

// Support Tickets
router.get('/ticketList', requirePermission('support:view'), supportTicketController.ticketList);
router.get('/admin/ticketList', requirePermission('support:view'), supportTicketController.ticketList);
router.get('/ticketDetail/:id', requirePermission('support:view'), supportTicketController.ticketDetail);
router.get('/admin/ticketDetail/:id', requirePermission('support:view'), supportTicketController.ticketDetail);
router.put('/updateTicketStatus/:id?', requirePermission('support:edit'), supportTicketController.updateTicketStatus);
router.post('/updateTicketStatus', requirePermission('support:edit'), supportTicketController.updateTicketStatus);
router.post('/admin/updateTicketStatus', requirePermission('support:edit'), supportTicketController.updateTicketStatus);

// Fraud Monitoring
router.get('/fraud-alerts', fraudController.getFraudAlerts);

// ─── Sub-Admin & Role Management ───
// Sub-Admins cannot add, edit, or delete other sub-admins or roles. Only Super Admin has these permissions.
router.get('/permissions-catalog', requirePermission('subadmins:view'), subAdminController.getPermissionsCatalog);

router.get('/roles', requirePermission('roles:view'), subAdminController.getRoles);
router.get('/roles/:id', requirePermission('roles:view'), subAdminController.getRoleById);
router.post('/roles', requireSuperAdmin, subAdminController.createRole);
router.put('/roles/:id', requireSuperAdmin, subAdminController.updateRole);
router.delete('/roles/:id', requireSuperAdmin, subAdminController.deleteRole);

router.get('/subadmins', requirePermission('subadmins:view'), subAdminController.getSubAdmins);
router.get('/subadmins/:id', requirePermission('subadmins:view'), subAdminController.getSubAdminById);
router.post('/subadmins', requireSuperAdmin, subAdminController.createSubAdmin);
router.put('/subadmins/:id', requireSuperAdmin, subAdminController.updateSubAdmin);
router.delete('/subadmins/:id', requireSuperAdmin, subAdminController.deleteSubAdmin);

module.exports = router;
