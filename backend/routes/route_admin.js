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
router.get('/dashboard_data', dashboardController.dashboard_data);
router.get('/getMonthlyUserStats', dashboardController.getMonthlyUserStats);

// User Management
router.get('/userList', userController.userList);
router.get('/userList2', userController.userList2);
router.get('/userListDeleted', userController.userListDeleted);
router.get('/userFollowers/:id', userController.userFollowers);
router.get('/userFollowing/:id', userController.userFollowing);
router.get('/viewUser/:id/:role', userController.viewUser);
router.put('/toggleUserStatus/:id', userController.toggleUserStatus);
router.put('/updateApprovalStatus', userController.updateApprovalStatus);
router.delete('/deleteUser/:id', userController.deleteUser);
router.put('/restoreUser/:id', userController.restoreUser);
router.post('/generateUserQR', userController.generateUserQR);

// CMS
router.get('/getCms/:slug', cmsController.getCms);
router.put('/updateCms', cmsController.updateCms);

// Contact Support
router.get('/contactUsList', contactUsController.contactUs_list);
router.get('/contactUs/:id', contactUsController.view_contactUs);
router.put('/contactUs/:id', contactUsController.update_contactUs);
router.delete('/deleteContactUs/:id', contactUsController.delete_contactUs);

// Provider Management
router.get('/providers', providerController.providerList);
router.put('/providers/:id/avatar', providerController.updateProviderAvatar);
router.get('/providers/:id', providerController.viewProvider);
router.put('/providers/:id/categories', providerController.updateProviderCategories);
router.put('/updateProviderStatus', providerController.updateProviderStatus);
router.get('/pendingVerifications', providerController.pendingVerifications);

// Services Categories
router.get('/categories', categoryController.categoryList);
router.post('/categories', categoryController.createCategory);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);
router.put('/categories/:id/toggle', categoryController.toggleCategoryStatus);

// Services Management
router.get('/services', serviceController.serviceList);
router.put('/services/:id/status', serviceController.updateServiceStatus);

// Booking Management
router.get('/bookings', bookingController.bookingList);
router.get('/bookings/stats', bookingController.bookingStats);
router.get('/bookings/:id', bookingController.bookingDetail);
router.put('/bookings/:id/status', bookingController.updateBookingStatus);

// Payment Management
router.get('/payments', paymentController.paymentList);
router.get('/payments/stats', paymentController.paymentStats);
router.get('/payments/:id', paymentController.paymentDetail);

// Withdrawal Management
router.get('/withdrawals', withdrawalController.withdrawalList);
router.get('/withdrawals/:id', withdrawalController.withdrawalDetail);
router.put('/withdrawals/:id/status', withdrawalController.updateWithdrawalStatus);

// Posts Moderation
router.get('/posts', postsController.postsList);
router.get('/posts/:id', postsController.postDetail);
router.put('/posts/:id/status', postsController.updatePostStatus);
router.delete('/posts/:id', postsController.deletePost);

// Reports
router.get('/reports', reportController.reportList);
router.put('/reports/:id', reportController.updateReportStatus);

// Disputes
router.get('/disputes', disputeController.disputeList);
router.get('/disputes/:id', disputeController.disputeDetail);
router.put('/disputes/:id/resolve', disputeController.resolveDispute);

// Wallets
router.get('/wallets', walletController.walletList);
router.get('/wallets/transactions', walletController.walletTransactions);
router.post('/wallets/update', walletController.updateWallet);
router.put('/wallets/:id/freeze', walletController.freezeWallet);

// Notifications
router.post('/notifications/bulk', notificationController.sendBulkNotification);
router.get('/notifications', notificationController.notificationList);

// Fraud Monitoring
router.get('/fraud-alerts', fraudController.getFraudAlerts);

module.exports = router;
