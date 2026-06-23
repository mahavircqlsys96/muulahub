var express = require('express');
var router = express.Router();
const authenticateHeader = require('../middleware/authMiddleware').authenticateHeader;
const authenticateJWT = require('../middleware/authMiddleware').authenticateJWT;

const authController = require('../controllers/apis/authController');
const userController = require('../controllers/apis/userController');
const providerController = require('../controllers/apis/providerController');
const postsController = require('../controllers/apis/postsController');
const bookingController = require('../controllers/apis/bookingController');
const walletController = require('../controllers/apis/walletController');
const withdrawalController = require('../controllers/apis/withdrawalController');

module.exports = (io) => {

  // ─── Public Routes ───
  router.get('/encryption', authController.encryption);
  router.post('/fileUpload', authController.fileUpload);
  router.get('/getCms', authController.getCms);
  router.get('/resetPasswordPage', authController.resetPasswordPage);
  router.post('/resetPassword', authController.resetPassword);

  // ─── Header Auth ───
  router.use(authenticateHeader);
  router.post('/signUp', authController.signUp);
  router.post('/login', authController.login);
  router.post('/forgotPassword', authController.forgotPassword);
  router.post('/socialLogin', authController.socialLogin);
  router.get('/categoryList', authController.categoryList);
  // ─── JWT Auth ───
  router.use(authenticateJWT);

  // Auth
  router.post('/logout', authController.logout);
  router.patch('/notificationOnOff', authController.notificationOnOff);
  router.post('/completeProfile', authController.completeProfile);
  router.post('/completeProfileProvider', authController.completeProfileProvider);
  router.post('/verifyOtp', authController.verifyOtp);
  router.post('/resendOtp', authController.resendOtp);
  router.delete('/accountDeleted', authController.accountDeleted);
  router.put('/changePassword', authController.changePassword);
  router.post('/contactUs', authController.contactUs);
  router.get('/notificationList', authController.notificationList);
  router.delete('/clearNotification', authController.clearNotification);

  // User
  router.get('/getProfile', authController.getProfile);
  router.put('/editProfile', authController.editProfile);
  router.get('/home', userController.home);

  router.post('/followUser', userController.followUser);
  router.get('/getFollowers', userController.getFollowers);
  router.get('/getFollowing', userController.getFollowing);
  router.get('/walletDetails', userController.walletDetails);
  // Provider

  router.get('/getProviderProfile', providerController.getProviderProfile);
  router.get('/getProvidersList', providerController.getProvidersList);
  router.get('/providerDetail/:id', providerController.providerDetail);

  // Posts
  router.post('/createPost', postsController.createPost);
  router.get('/getPosts', postsController.getPosts);
  router.get('/getPostDetail/:id', postsController.getPostDetail);
  router.delete('/deletePost/:id', postsController.deletePost);
  router.post('/likePost', postsController.likePost);
  router.post('/addComment', postsController.addComment);
  router.get('/getComments', postsController.getComments);
  router.get('/getCommentReplies', postsController.getCommentReplies);
  router.post('/likeComment', postsController.likeComment);
  router.post('/reportPost', postsController.reportPost);

  // Bookings
  router.post('/createBooking', bookingController.createBooking);
  router.post('/payBooking', bookingController.payBooking);
  router.get('/getUserBookings', bookingController.getUserBookings);
  router.get('/getProviderBookings', bookingController.getProviderBookings);
  router.get('/getBookingDetail/:id', bookingController.getBookingDetail);
  router.put('/updateBookingStatus', bookingController.updateBookingStatus);
  router.post('/giveRating', bookingController.giveRating);
  router.get('/providerRatingList', bookingController.providerRatingList);

  // Wallet
  router.get('/wallet_balance', walletController.get_wallet_balance);
  router.get('/wallet_history', walletController.get_wallet_history);
  router.get('/earnings_summary', walletController.get_earnings_summary);

  // Withdrawal
  router.post('/request_withdrawal', withdrawalController.request_withdrawal);
  router.get('/withdrawal_history', withdrawalController.get_withdrawal_history);
  router.get('/withdrawal_detail/:id', withdrawalController.get_withdrawal_detail);

  return router;
};
