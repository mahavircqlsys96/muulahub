var express = require('express');
var router = express.Router();
const helper = require("../helpers/helper");
const authenticateHeader = require('../middleware/authMiddleware').authenticateHeader;
const authenticateJWT = require('../middleware/authMiddleware').authenticateJWT;
const optionalAuthenticateJWT = require('../middleware/authMiddleware').optionalAuthenticateJWT;

const authController = require('../controllers/apis/authController');
const userController = require('../controllers/apis/userController');
const providerController = require('../controllers/apis/providerController');
const postsController = require('../controllers/apis/postsController');
const bookingController = require('../controllers/apis/bookingController');
const walletController = require('../controllers/apis/walletController');
const withdrawalController = require('../controllers/apis/withdrawalController');
const muxController = require('../controllers/apis/muxController');
const agoraController = require('../controllers/apis/agoraController');
const eventController = require('../controllers/apis/eventController');
const supportTicketController = require('../controllers/apis/supportTicketController');

module.exports = (io) => {

  // ─── Public Routes ───
  router.get('/encryption', authController.encryption);
  router.post('/fileUpload', authController.fileUpload);
  router.get('/getCms', authController.getCms);
  router.get('/resetPasswordPage', authController.resetPasswordPage);
  router.post('/resetPassword', authController.resetPassword);
  router.post('/publicContactUs', authController.publicContactUs);
  router.post('/publicReport', authController.publicReport);
  router.post('/muxWebhook', muxController.webhook);
  router.post('/agoraWebhook', agoraController.webhook);
  router.post('/sendTestPush', eventController.sendTestPushByToken);
  router.get('/sendTestPush', eventController.sendTestPushByToken);
  router.get('/testLivePush', eventController.testLivePush);
  router.post('/testLivePush', eventController.testLivePush);
  router.get('/getChannelUsers/:channelName?', agoraController.getChannelUsers);
  router.post('/getChannelUsers', agoraController.getChannelUsers);
  router.get('/getChannelUserCount', agoraController.getChannelUsers);
  router.post('/getChannelUserCount', agoraController.getChannelUsers);

  // Live Stream Connected Viewers & Join/Leave Events (Real-Time Socket & In-Memory Sync)
  router.all(['/getViewers', '/getLiveViewers', '/getViewCount', '/getEventViewers'], eventController.getViewers);
  router.all(['/joinLiveEvent', '/joinEvent'], eventController.joinEvent);
  router.all(['/leaveLiveEvent', '/leaveEvent'], eventController.leaveEvent);

  // ─── Header Auth ───
  router.use(authenticateHeader);
  router.post('/signUp', authController.signUp);
  router.post('/login', authController.login);
  router.post('/guestLogin', authController.guestLogin);
  router.get('/guestLogin', authController.guestLogin);
  router.post('/forgotPassword', authController.forgotPassword);
  router.post('/socialLogin', authController.socialLogin);
  router.get('/categoryList', authController.categoryList);
  router.all(['/checkUsername', '/check-username'], optionalAuthenticateJWT, authController.checkUsername);

  // ─── Optional JWT Auth (Guests & Authenticated Users) ───
  router.all(['/home'], optionalAuthenticateJWT, userController.home);
  router.all(['/filterPosts'], optionalAuthenticateJWT, userController.filterPosts);
  router.all(['/getNearbyLiveEvents'], optionalAuthenticateJWT, eventController.getNearbyLiveEvents);
  router.all(['/getLiveEventDetail/:id', '/getLiveEventDetail'], optionalAuthenticateJWT, eventController.getLiveEventDetail);
  router.all(['/getPosts'], optionalAuthenticateJWT, postsController.getPosts);
  router.all(['/getPostDetail/:id', '/getPostDetail'], optionalAuthenticateJWT, postsController.getPostDetail);
  router.all(['/getPostDetailWithComments/:id', '/getPostDetailWithComments'], optionalAuthenticateJWT, postsController.getPostDetailWithComments);
  router.all(['/search', '/globalSearch'], optionalAuthenticateJWT, userController.search);
  router.all(['/getProvidersList'], optionalAuthenticateJWT, providerController.getProvidersList);
  router.all(['/nearbyproviders', '/nearbyProviders', '/getNearbyProviders'], optionalAuthenticateJWT, providerController.nearbyProviders);
  router.all(['/getProviderProfile'], optionalAuthenticateJWT, providerController.getProviderProfile);
  router.all(['/providerDetail/:id', '/providerDetail'], optionalAuthenticateJWT, providerController.providerDetail);

  // ─── JWT Auth ───
  router.use(authenticateJWT);

  // Auth
  router.post('/logout', authController.logout);
  router.post("/updateDeviceToken", authController.updateDeviceToken);
  router.patch('/notificationOnOff', authController.notificationOnOff);
  router.put('/isProviderOnOff', authController.isProviderOnOff);
  router.post('/completeProfile', authController.completeProfile);
  router.post('/completeProfileProvider', authController.completeProfileProvider);
  router.post('/verifyOtp', authController.verifyOtp);
  router.post('/resendOtp', authController.resendOtp);
  router.delete('/accountDeleted', authController.accountDeleted);
  router.put('/changePassword', authController.changePassword);
  router.post('/contactUs', authController.contactUs);
  router.get('/notificationList', authController.notificationList);
  router.delete('/clearNotification', authController.clearNotification);
  // router.patch('/markNotificationRead/:id?', authController.markNotificationRead);
  // router.post('/markNotificationRead', authController.markNotificationRead);
  router.put('/markNotificationRead/:id?', authController.markNotificationRead);
  // router.patch('/markAllNotificationsRead', authController.markAllNotificationsRead);
  // router.post('/markAllNotificationsRead', authController.markAllNotificationsRead);
  router.put('/markAllNotificationsRead', authController.markAllNotificationsRead);

  // User
  router.get('/getProfile', authController.getProfile);
  router.get('/loginHistory', authController.loginHistory);
  router.put('/editProfile', authController.editProfile);
  router.post('/makeCategoryPrimary', authController.makeCategoryPrimary);
  router.post('/updateCategories', authController.updateCategories);
  router.put('/updateCurrency', authController.updateCurrency);

  router.post('/addBankDetails', userController.addBankDetails);
  router.get('/getBankList', userController.getBankList);
  router.delete('/deleteBankAccount/:bankId', userController.deleteBankAccount);


  router.post('/followUser', userController.followUser);
  router.get('/getFollowers', userController.getFollowers);
  router.get('/getFollowing', userController.getFollowing);
  router.get('/walletDetails', userController.walletDetails);
  router.put('/updateLocation', userController.updateLocation);
  router.get('/getLocation', userController.getLocation);

  // License & Blue Tick Verification (Mobile User)
  router.post('/uploadLicense', userController.uploadLicense);

  router.get('/getLicenseStatus', userController.getLicenseStatus);
  router.get('/licenseStatus', userController.getLicenseStatus);

  // Feature 1: Update Phone Number with Two-Step OTP Verification
  router.post('/sendOldPhoneOtp', userController.sendOldPhoneOtp);

  router.post('/verifyOldPhoneOtp', userController.verifyOldPhoneOtp);

  router.post('/sendNewPhoneOtp', userController.sendNewPhoneOtp);
  router.post('/verifyNewPhoneOtp', userController.verifyNewPhoneOtp);

  router.post('/resendPhoneOtp', userController.resendPhoneOtp);


  // Feature 2: Support Ticket System (Mobile User)
  router.post('/raiseTicket', supportTicketController.raiseTicket);

  router.get('/myTickets', supportTicketController.myTickets);

  router.get('/ticketDetail/:id', supportTicketController.ticketDetail);

  // Provider
  router.post('/addProviderCategory', providerController.addProviderCategory);
  router.get('/getProviderInsights', providerController.getProviderInsights);

  // Posts
  router.post('/createPost', postsController.createPost);
  router.delete('/deletePost/:id', postsController.deletePost);
  router.post('/bookmarkPost', postsController.bookmarkPost);
  router.get('/getBookmarkedPosts', postsController.getBookmarkedPosts);
  // Likes & Comments
  router.post('/likePost', postsController.likePost);
  router.post('/addComment', postsController.addComment);
  router.post('/replyComment', postsController.addComment);
  router.get('/getComments', postsController.getComments);
  router.get('/getCommentReplies', postsController.getCommentReplies);
  router.post('/likeComment', postsController.likeComment);
  router.post('/editComment', postsController.editComment);
  router.put('/editComment/:id?', postsController.editComment);
  router.delete('/deleteComment/:id', postsController.deleteComment);
  router.post('/deleteComment', postsController.deleteComment);
  router.post('/reportPost', postsController.reportPost);
  router.post('/reportUser', postsController.reportUser);
  router.post('/createReport', postsController.createReport);
  router.post('/report', postsController.createReport);
  router.get('/getDraftPosts', postsController.getDraftPosts);
  router.post('/publishOrDeclinePost', postsController.publishOrDeclinePost);
  router.get('/myPostPerformance', postsController.myPostPerformance);


  // Bookings
  router.post('/createBooking', bookingController.createBooking);
  router.post('/acceptRejectRequestProvider', bookingController.acceptRejectRequestProvider);
  router.post('/acceptRejectRequestUser', bookingController.acceptRejectRequestUser);
  router.post('/payBooking', bookingController.payBooking);
  router.post('/cancelBooking', bookingController.cancelBooking);
  // router.post('/cancelBooking/:id', bookingController.cancelBooking);
  // router.patch('/cancelBooking', bookingController.cancelBooking);
  // router.put('/cancelBooking/:id?', bookingController.cancelBooking);

  router.post('/stripe_status_update', bookingController.stripe_status_update);
  router.get('/getUserBookings', bookingController.getUserBookings);
  router.get('/getUserPendingBookings', bookingController.getUserPendingBookings);
  router.get('/getProviderPendingBookings', bookingController.getProviderPendingBookings);
  router.get('/getProviderBookings', bookingController.getProviderBookings);
  router.get('/getBookingDetail/:id', bookingController.getBookingDetail);
  router.post('/startWork', bookingController.startWork);
  router.post('/startTracking', bookingController.startTracking);
  router.post('/completeWork', bookingController.completeWork);
  router.post('/giveRating', bookingController.giveRating);
  // router.get('/providerRatingList', bookingController.providerRatingList);
  router.get('/userRatingList', bookingController.userRatingList);

  // Wallet
  router.get('/wallet_balance', walletController.get_wallet_balance);
  router.get('/wallet_history', walletController.get_wallet_history);
  router.get('/earnings_summary', walletController.get_earnings_summary);

  // Withdrawal
  router.post('/request_withdrawal', withdrawalController.request_withdrawal);
  router.get('/withdrawal_history', withdrawalController.get_withdrawal_history);
  router.get('/withdrawal_detail/:id', withdrawalController.get_withdrawal_detail);

  // Mux
  router.post('/createMuxUpload', muxController.createUpload);
  router.get('/getVideoDetails/:id', muxController.getVideoDetails);

  // Agora Live Streaming & Events
  router.post('/generateAgoraToken', agoraController.generateToken);
  router.post('/renewToken', agoraController.renewToken);
  router.post('/renewAgoraToken', agoraController.renewToken);
  router.post('/generateRtmToken', agoraController.generateRtmToken);

  router.post('/getRtmToken', agoraController.generateRtmToken);
  router.post('/createEvent', eventController.createEvent);
  router.put('/stopEvent/:eventId', eventController.stopEvent);
  router.put('/stopEvent', eventController.stopEvent);
  router.post('/stopEvent', eventController.stopEvent);
  router.post('/joinEvent', eventController.joinEvent);
  router.post('/leaveEvent', eventController.leaveEvent);
  router.post('/joinLiveEvent', eventController.joinEvent);
  router.post('/leaveLiveEvent', eventController.leaveEvent);
  router.get('/joinEvent', eventController.joinEvent);
  router.get('/leaveEvent', eventController.leaveEvent);
  router.get('/getViewers', eventController.getViewers);
  router.get('/getLiveViewers', eventController.getViewers);
  router.get('/getViewCount', eventController.getViewers);
  router.delete('/deleteEvent/:id', eventController.deleteEvent);
  router.delete('/deleteEvent', eventController.deleteEvent);
  router.post('/deleteEvent', eventController.deleteEvent);
  router.get('/getMyLiveEvent', eventController.getMyLiveEvent);

  // Live Streaming AWS S3 Recording
  router.post('/startRecording', eventController.startRecording);
  router.post('/stopRecording', eventController.stopRecording);
  router.get('/recordingStatus/:id?', eventController.getRecordingStatus);
  router.post('/uploadRecording/:id?', eventController.uploadRecording);

  router.post('/events/:id/start-recording', eventController.startRecording);
  router.post('/events/:id/stop-recording', eventController.stopRecording);
  router.get('/events/:id/recording-status', eventController.getRecordingStatus);
  router.post('/events/:id/upload-recording', eventController.uploadRecording);

  return router;
};
