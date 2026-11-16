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
  router.post('/sendTestPush', eventController.sendTestPushByToken);
  router.get('/sendTestPush', eventController.sendTestPushByToken);
  router.get('/testLivePush', eventController.testLivePush);
  router.post('/testLivePush', eventController.testLivePush);
  router.get('/getChannelUsers/:channelName?', agoraController.getChannelUsers);
  router.post('/getChannelUsers', agoraController.getChannelUsers);
  router.get('/getChannelUserCount', agoraController.getChannelUsers);
  router.post('/getChannelUserCount', agoraController.getChannelUsers);

  // Live Stream Connected Viewers (Real-Time Socket & In-Memory Room)
  async function resolveChannelName(input) {
    if (!input) return '';
    const str = String(input).trim();
    if (str.startsWith('event_')) return str;
    const numId = parseInt(str, 10);
    if (!isNaN(numId) && numId > 0) {
      try {
        const ev = await require('../models').events.findOne({
          where: { id: numId },
          attributes: ['agoraChannel']
        });
        if (ev && ev.agoraChannel) return ev.agoraChannel;
      } catch (_) { }
    }
    return str;
  }

  async function computeApiLiveViewers(channelName) {
    if (!channelName) return { channelId: '', channelName: '', viewerCount: 0, totalViewers: 0, views: 0, viewers: [] };
    const viewersMap = new Map();

    if (io.liveChannelViewers && io.liveChannelViewers.has(channelName)) {
      const memMap = io.liveChannelViewers.get(channelName);
      for (const [k, v] of memMap.entries()) {
        viewersMap.set(k, {
          id: v.id || 0,
          name: v.name || 'Viewer',
          profileImage: v.profileImage || ''
        });
      }
    }

    try {
      const sockets = await io.in(channelName).fetchSockets();
      for (const s of sockets) {
        const u = s.liveUser || (s.userData ? { id: s.userData.id, name: s.userData.name, profileImage: s.userData.profileImage } : null);
        if (u) {
          const key = u.id && u.id !== 0 ? `user_${u.id}` : `socket_${s.id}`;
          viewersMap.set(key, {
            id: u.id || 0,
            name: u.name || 'Viewer',
            profileImage: u.profileImage || ''
          });
        }
      }
    } catch (_) { }

    const viewersList = Array.from(viewersMap.values());
    return {
      channelId: channelName,
      channelName: channelName,
      viewerCount: viewersList.length,
      totalViewers: viewersList.length,
      views: viewersList.length,
      viewers: viewersList
    };
  }

  // Get Live Viewers / View Count API
  router.all(['/getLiveViewers', '/getViewCount', '/getEventViewers'], async (req, res) => {
    try {
      const channelInput = (req.body && (req.body.channelId || req.body.channelName || req.body.channel || req.body.eventId)) || req.query.channelId || req.query.channelName || req.query.channel || req.query.eventId;
      if (!channelInput) return helper.failed(res, "channelName or eventId is required");
      const channelName = await resolveChannelName(channelInput);
      const payload = await computeApiLiveViewers(channelName);
      return helper.success(res, "Live viewers fetched successfully", payload);
    } catch (e) {
      return helper.error(res, e.message);
    }
  });

  // REST API: Join Live Event (Marks user as viewer & broadcasts to socket room)
  router.all(['/joinLiveEvent', '/joinEvent'], async (req, res) => {
    try {
      const channelInput = (req.body && (req.body.channelId || req.body.channelName || req.body.channel || req.body.eventId)) || req.query.channelId || req.query.channelName || req.query.channel || req.query.eventId;
      if (!channelInput) return helper.failed(res, "channelName or eventId is required");
      const channelName = await resolveChannelName(channelInput);

      const rawUserId = (req.body && (req.body.userId || req.body.senderId || req.body.id)) || req.query.userId || (req.auth ? req.auth.id : null);
      let userName = (req.body && (req.body.userName || req.body.name)) || req.query.userName || 'Viewer';
      let userImage = (req.body && (req.body.userImage || req.body.profileImage || req.body.image)) || req.query.userImage || '';

      if (rawUserId) {
        try {
          const dbUser = await require('../models').users.findOne({
            where: { id: rawUserId },
            attributes: ['id', 'name', 'profileImage'],
            raw: true
          });
          if (dbUser) {
            userName = dbUser.name || userName;
            userImage = dbUser.profileImage || userImage;
          }
        } catch (_) { }
      }

      if (!io.liveChannelViewers) io.liveChannelViewers = new Map();
      if (!io.liveChannelViewers.has(channelName)) {
        io.liveChannelViewers.set(channelName, new Map());
      }
      const channelMap = io.liveChannelViewers.get(channelName);
      const viewerKey = rawUserId ? `user_${rawUserId}` : `rest_${Date.now()}`;
      channelMap.set(viewerKey, {
        id: rawUserId ? parseInt(rawUserId, 10) : 0,
        name: userName,
        profileImage: userImage,
        joinedAt: Date.now()
      });

      const payload = await computeApiLiveViewers(channelName);

      // Broadcast update to real-time socket room
      io.to(channelName).emit('getViewers', payload);
      io.to(channelName).emit('liveViewers', payload);
      io.to(channelName).emit('channelViewers', payload);
      io.to(channelName).emit('viewerCount', {
        channelId: channelName,
        channelName: channelName,
        viewerCount: payload.viewerCount,
        totalViewers: payload.viewerCount,
        views: payload.viewerCount
      });
      io.to(channelName).emit('userJoinedLiveStream', {
        channelId: channelName,
        channelName: channelName,
        user: { id: rawUserId ? parseInt(rawUserId, 10) : 0, name: userName, profileImage: userImage },
        viewerCount: payload.viewerCount
      });

      return helper.success(res, "Joined live event successfully", payload);
    } catch (e) {
      return helper.error(res, e.message);
    }
  });

  // REST API: Leave Live Event (Removes user from viewer list & broadcasts to socket room)
  router.all(['/leaveLiveEvent', '/leaveEvent'], async (req, res) => {
    try {
      const channelInput = (req.body && (req.body.channelId || req.body.channelName || req.body.channel || req.body.eventId)) || req.query.channelId || req.query.channelName || req.query.channel || req.query.eventId;
      if (!channelInput) return helper.failed(res, "channelName or eventId is required");
      const channelName = await resolveChannelName(channelInput);

      const rawUserId = (req.body && (req.body.userId || req.body.senderId || req.body.id)) || req.query.userId || (req.auth ? req.auth.id : null);
      if (rawUserId && io.liveChannelViewers && io.liveChannelViewers.has(channelName)) {
        io.liveChannelViewers.get(channelName).delete(`user_${rawUserId}`);
      }

      const payload = await computeApiLiveViewers(channelName);

      // Broadcast update to real-time socket room
      io.to(channelName).emit('getViewers', payload);
      io.to(channelName).emit('liveViewers', payload);
      io.to(channelName).emit('channelViewers', payload);
      io.to(channelName).emit('viewerCount', {
        channelId: channelName,
        channelName: channelName,
        viewerCount: payload.viewerCount,
        totalViewers: payload.viewerCount,
        views: payload.viewerCount
      });
      io.to(channelName).emit('userLeftLiveStream', {
        channelId: channelName,
        channelName: channelName,
        userId: rawUserId ? parseInt(rawUserId, 10) : 0,
        viewerCount: payload.viewerCount
      });

      return helper.success(res, "Left live event successfully", payload);
    } catch (e) {
      return helper.error(res, e.message);
    }
  });

  // ─── Header Auth ───
  router.use(authenticateHeader);
  router.post('/signUp', authController.signUp);
  router.post('/login', authController.login);
  router.post('/forgotPassword', authController.forgotPassword);
  router.post('/socialLogin', authController.socialLogin);
  router.get('/categoryList', authController.categoryList);
  // ─── Optional JWT Auth ───
  router.get('/home', optionalAuthenticateJWT, userController.home);
  router.get('/filterPosts', optionalAuthenticateJWT, userController.filterPosts);

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

  // User
  router.get('/getProfile', authController.getProfile);
  router.get('/loginHistory', authController.loginHistory);
  router.put('/editProfile', authController.editProfile);
  router.post('/makeCategoryPrimary', authController.makeCategoryPrimary);
  router.post('/updateCategories', authController.updateCategories);
  router.post('/addBankDetails', userController.addBankDetails);
  router.get('/getBankList', userController.getBankList);
  router.delete('/deleteBankAccount/:bankId', userController.deleteBankAccount);


  router.post('/followUser', userController.followUser);
  router.get('/getFollowers', userController.getFollowers);
  router.get('/getFollowing', userController.getFollowing);
  router.get('/walletDetails', userController.walletDetails);
  router.put('/updateLocation', userController.updateLocation);
  router.get('/getLocation', userController.getLocation);
  // Provider

  router.get('/getProviderProfile', providerController.getProviderProfile);
  router.get('/getProvidersList', providerController.getProvidersList);
  router.get('/providerDetail/:id', providerController.providerDetail);
  router.post('/addProviderCategory', providerController.addProviderCategory);
  router.get('/getProviderInsights', providerController.getProviderInsights);

  // Posts
  router.post('/createPost', postsController.createPost);
  router.get('/getPosts', postsController.getPosts);
  router.get('/getPostDetail/:id', postsController.getPostDetail);
  router.get('/getPostDetailWithComments/:id', postsController.getPostDetailWithComments);
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
  router.delete('/deleteEvent/:id', eventController.deleteEvent);
  router.delete('/deleteEvent', eventController.deleteEvent);
  router.post('/deleteEvent', eventController.deleteEvent);
  router.get('/getMyLiveEvent', eventController.getMyLiveEvent);
  router.get('/getNearbyLiveEvents', eventController.getNearbyLiveEvents);
  router.get('/getLiveEventDetail/:id', eventController.getLiveEventDetail);
  router.post('/getLiveEventDetail', eventController.getLiveEventDetail);

  return router;
};
