const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { Op } = require('sequelize');
const db = require('../../models');
const { events, users, services_categories, followers, notifications } = db;
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = require('agora-token');

const envfile = process.env;

module.exports = {

  /**
   * Create / Start a Live Event with Agora Token
   * Rule: At a time, only one event can be live for a user.
   */
  createEvent: async (req, res) => {
    try {
      const userId = req.auth.id;

      const v = new Validator(req.body, {
        caption: 'string',
        available: 'in:everyone,followersOnly',
        categoryId: 'numeric',
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      // Delete any previous created event(s) for this user so a new one can always be created
      await events.destroy({
        where: { userId }
      });

      const appID = envfile.AGORA_APP_ID;
      const appCertificate = envfile.AGORA_APP_CERTIFICATE;

      if (!appID || !appCertificate) {
        return helper.failed(res, "Agora App ID and Certificate are not configured on the server");
      }

      const {
        caption,
        // description,
        categoryId,
        available,
        location,
        latitude,
        longitude,
        image
      } = req.body;

      // Generate unique Agora channel name
      let channelName = req.body.channelName || req.body.channel;
      if (!channelName || channelName.trim() === '') {
        channelName = `event_${userId}_${Date.now()}`;
      }

      // UID for Agora RTC:
      let uid = req.body.uid;
      if (uid === undefined || uid === null || uid === '' || uid === '0' || uid === 0) {
        uid = 0;
      } else {
        uid = parseInt(uid, 10) || 0;
      }

      // Role for Agora RTC (roleType: 0 for creator/publisher, 1 for other user/subscriber)
      let role = RtcRole.PUBLISHER;
      const rawRoleType = req.body.roleType !== undefined ? req.body.roleType : req.body.role;
      if (rawRoleType === 0 || rawRoleType === '0' || rawRoleType === 'publisher') {
        role = RtcRole.PUBLISHER;
      } else if (rawRoleType === 1 || rawRoleType === '1' || rawRoleType === 'subscriber') {
        role = RtcRole.SUBSCRIBER;
      }

      // Token validity: default 24 hours (86400 seconds) or client-specified
      let expireTime = req.body.expireTime;
      if (!expireTime || expireTime === '') {
        expireTime = 86400;
      } else {
        expireTime = parseInt(expireTime, 10);
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const privilegeExpireTime = currentTime + expireTime;

      // Build RTC token with uid
      const agoraToken = RtcTokenBuilder.buildTokenWithUid(
        appID,
        appCertificate,
        channelName,
        uid,
        role,
        privilegeExpireTime,
        privilegeExpireTime
      );

      // Build RTM token for live streaming real-time chat
      const rtmUserId = String(uid && uid !== 0 ? uid : userId);
      const rtmToken = RtmTokenBuilder.buildToken(
        appID,
        appCertificate,
        rtmUserId,
        expireTime
      );

      // Create new live event record
      const newEvent = await events.create({
        userId,
        categoryId: categoryId || null,
        caption: caption || 'Live Event',
        available: available || 'everyone',
        location: location || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        media: image,
        status: 'start',
        agoraToken,
        agoraChannel: channelName,
        agoraUid: uid.toString(),
        agoraAppId: appID,
        agoraAppCertificate: appCertificate
      });

      // Fetch created event with user and category associations
      const eventDetails = await events.findOne({
        where: { id: newEvent.id },
        include: [
          {
            model: users,
            as: 'user',
            attributes: [
              'id', 'name', 'email', 'profileImage', 'phone', 'countryCode', 'isProvider',
              [
                db.sequelize.literal(`(
                  SELECT IFNULL(ROUND(AVG(rating), 1), 0)
                  FROM rating
                  WHERE rating.providerId = user.id
                )`),
                'avgRating'
              ],
              [
                db.sequelize.literal(`(
                  SELECT COUNT(*)
                  FROM rating
                  WHERE rating.providerId = user.id
                )`),
                'totalReview'
              ]
            ]
          },
          {
            model: services_categories,
            as: 'category',
            attributes: ['id', 'categoryName', 'image']
          }
        ]
      });

      const eventJson = eventDetails.toJSON();
      if (eventJson.user) {
        eventJson.user.avgRating = eventJson.user.avgRating !== undefined && eventJson.user.avgRating !== null
          ? parseFloat(eventJson.user.avgRating)
          : 0;
        eventJson.user.totalReview = eventJson.user.totalReview !== undefined && eventJson.user.totalReview !== null
          ? parseInt(eventJson.user.totalReview, 10)
          : 0;
      }

      const responseData = {
        ...eventJson,
        token: agoraToken,
        rtcToken: agoraToken,
        rtmToken: rtmToken,
        rtmUserId: rtmUserId,
        channelName: channelName,
        uid: uid,
        roleType: role === RtcRole.PUBLISHER ? 0 : 1,
        role: role === RtcRole.PUBLISHER ? "publisher" : "subscriber",
        appId: appID,
        agoraToken: agoraToken,
        agoraChannel: channelName,
        agoraUid: uid.toString(),
        agoraAppId: appID
      };

      // Send push notification to all users to join the live streaming event (background task)
      (async () => {
        try {
          const creatorName = (eventJson.user && eventJson.user.name) ? eventJson.user.name : (req.auth && req.auth.name ? req.auth.name : 'Someone');
          const creatorImage = (eventJson.user && (eventJson.user.profileImage || eventJson.user.profileImageProvider)) || '';
          const pushTitle = `${creatorName} is Live Now!`;
          const pushBody = caption && caption.trim() !== ''
            ? `${creatorName} is streaming live: "${caption}". Tap to join!`
            : `${creatorName} has started a live video stream. Tap to join and watch!`;

          // Find all users who have a deviceToken and are not blocked (including the creator so testing on 1 device works)
          const recipients = await users.findAll({
            where: {
              status: { [Op.ne]: 'blocked' },
              deviceToken: {
                [Op.and]: [
                  { [Op.ne]: null },
                  { [Op.ne]: '' }
                ]
              },
              [Op.or]: [
                { isNotification: 'on' },
                { isNotification: null },
                { isNotification: '1' }
              ]
            },
            attributes: ['id', 'deviceToken', 'name', 'status']
          });

          console.log(`📡 [createEvent Push] Event ID: ${newEvent.id}, Host: ${creatorName} (${userId}). Total recipients found: ${recipients.length}`);

          if (recipients && recipients.length > 0) {
            // 1. Create in-app notification records in DB
            try {
              const notificationsData = recipients.map(u => ({
                userId: u.id,
                senderId: userId,
                title: pushTitle,
                message: pushBody,
                type: 'system',
                notificationType: 'push',
                referenceId: newEvent.id,
                isRead: 0,
                createdAt: new Date(),
                updatedAt: new Date()
              }));
              await notifications.bulkCreate(notificationsData);
              console.log(`✅ [createEvent Push] Created ${notificationsData.length} in-app notification records in DB.`);
            } catch (dbNotifErr) {
              console.log("Note: Could not bulk create notifications in DB:", dbNotifErr.message);
            }

            // 2. Extract valid tokens (skip empty and dummy hex tokens)
            const validTokens = recipients
              .map(u => u.deviceToken)
              .filter(tok => tok && typeof tok === 'string' && tok.trim() !== '' && !tok.startsWith('802DC5401350B196318EBB9CDD950F'));

            console.log(`📡 [createEvent Push] Sending multicast push to ${validTokens.length} valid FCM tokens...`);

            if (validTokens.length > 0) {
              const pushResult = await helper.sendMulticastNotification(validTokens, {
                title: pushTitle,
                body: pushBody,
                type: 'live_event',
                eventId: String(newEvent.id),
                channelName: String(channelName),
                sender_id: String(userId),
                sender_name: creatorName,
                sender_image: creatorImage,
                image: image || creatorImage || '',
                request_id: String(newEvent.id)
              });
              console.log("📡 [createEvent Push] Multicast push result:", pushResult);
            } else {
              console.log("⚠️ [createEvent Push] No valid FCM registration tokens found in database.");
            }
          } else {
            console.log("⚠️ [createEvent Push] No recipients found with registered device tokens.");
          }
        } catch (pushErr) {
          console.error("❌ Error sending live event push notification:", pushErr.message || pushErr);
        }
      })();

      return helper.success(res, "Live event created and streaming started successfully", responseData);

    } catch (error) {
      console.log("createEvent error:", error);
      return helper.error(res, "Something went wrong while creating live event");
    }
  },

  /**
   * Stop Event Streaming
   */
  stopEvent: async (req, res) => {
    try {
      const userId = req.auth.id;
      const eventId = req.params.eventId || req.params.id || req.body.eventId;

      let event = null;

      if (eventId) {
        event = await events.findOne({
          where: { id: eventId, userId }
        });
      } else {
        event = await events.findOne({
          where: { userId, status: 'start' },
          order: [['id', 'DESC']]
        });
      }

      if (!event) {
        return helper.failed(res, "Active live event not found");
      }

      await event.update({ status: 'stop' });

      await events.update(
        { status: 'stop' },
        { where: { userId, status: 'start' } }
      );

      return helper.success(res, "Event streaming stopped successfully", event);

    } catch (error) {
      console.log("stopEvent error:", error);
      return helper.error(res, "Something went wrong while stopping live event");
    }
  },

  /**
   * Delete Event
   */
  deleteEvent: async (req, res) => {
    try {
      const userId = req.auth.id;
      const eventId = req.params.id || req.params.eventId || req.body.eventId;

      let whereClause = { userId };
      if (eventId) {
        whereClause.id = eventId;
      }

      const event = await events.findOne({ where: whereClause });
      if (!event) {
        return helper.failed(res, "Event not found");
      }

      await events.destroy({ where: whereClause });

      return helper.success(res, "Event deleted successfully");
    } catch (error) {
      console.log("deleteEvent error:", error);
      return helper.error(res, "Something went wrong while deleting event");
    }
  },

  /**
   * Get Current Live Event for Authenticated User
   */
  getMyLiveEvent: async (req, res) => {
    try {
      const userId = req.auth.id;

      const currentEvent = await events.findOne({
        where: { userId, status: 'start' },
        include: [
          {
            model: users,
            as: 'user',
            attributes: [
              'id', 'name', 'email', 'profileImage', 'phone', 'countryCode', 'isProvider',
              [
                db.sequelize.literal(`(
                  SELECT IFNULL(ROUND(AVG(rating), 1), 0)
                  FROM rating
                  WHERE rating.providerId = user.id
                )`),
                'avgRating'
              ],
              [
                db.sequelize.literal(`(
                  SELECT COUNT(*)
                  FROM rating
                  WHERE rating.providerId = user.id
                )`),
                'totalReview'
              ]
            ]
          },
          {
            model: services_categories,
            as: 'category',
            attributes: ['id', 'categoryName', 'image']
          }
        ],
        order: [['id', 'DESC']]
      });

      if (!currentEvent) {
        return helper.success(res, "No active live event found", null);
      }

      const eventData = currentEvent.toJSON();
      if (eventData.user) {
        eventData.user.avgRating = eventData.user.avgRating !== undefined && eventData.user.avgRating !== null
          ? parseFloat(eventData.user.avgRating)
          : 0;
        eventData.user.totalReview = eventData.user.totalReview !== undefined && eventData.user.totalReview !== null
          ? parseInt(eventData.user.totalReview, 10)
          : 0;
      }
      eventData.token = eventData.agoraToken;
      eventData.rtcToken = eventData.agoraToken;
      eventData.channelName = eventData.agoraChannel;
      eventData.uid = eventData.agoraUid ? (parseInt(eventData.agoraUid, 10) || 0) : 0;
      eventData.appId = eventData.agoraAppId || envfile.AGORA_APP_ID;

      const appID = envfile.AGORA_APP_ID;
      const appCertificate = envfile.AGORA_APP_CERTIFICATE;
      if (appID && appCertificate) {
        try {
          const rtmUserId = String(eventData.uid || userId);
          eventData.rtmToken = RtmTokenBuilder.buildToken(appID, appCertificate, rtmUserId, 86400);
          eventData.rtmUserId = rtmUserId;
        } catch (rtmErr) {
          console.log("Error generating RTM token in getMyLiveEvent:", rtmErr.message);
        }
      }

      return helper.success(res, "Current live event fetched successfully", eventData);

    } catch (error) {
      console.log("getMyLiveEvent error:", error);
      return helper.error(res, "Something went wrong while fetching current live event");
    }
  },

  /**
   * Get Nearby Live Events for Other Users
   */
  getNearbyLiveEvents: async (req, res) => {
    try {
      const currentUserId = req.auth.id;

      const appID = envfile.AGORA_APP_ID;
      const appCertificate = envfile.AGORA_APP_CERTIFICATE;

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      let reqLat = req.query.latitude ? parseFloat(req.query.latitude) : null;
      let reqLng = req.query.longitude ? parseFloat(req.query.longitude) : null;
      const radiusKm = req.query.radius ? parseFloat(req.query.radius) : null;

      if (!reqLat || !reqLng) {
        const currentUser = await users.findOne({
          where: { id: currentUserId },
          attributes: ['latitude', 'longitude']
        });
        if (currentUser && currentUser.latitude && currentUser.longitude) {
          reqLat = parseFloat(currentUser.latitude);
          reqLng = parseFloat(currentUser.longitude);
        }
      }

      const followings = await followers.findAll({
        where: { followerId: currentUserId },
        attributes: ['followingId']
      });
      const followingIds = followings.map(f => f.followingId);

      const privacyCondition = {
        [Op.or]: [
          { available: 'everyone' },
          { available: null },
          {
            [Op.and]: [
              { available: 'followersOnly' },
              { userId: { [Op.in]: followingIds } }
            ]
          }
        ]
      };

      const whereCondition = {
        userId: { [Op.ne]: currentUserId },
        status: 'start',
        ...privacyCondition
      };

      if (req.query.categoryId) {
        whereCondition.categoryId = req.query.categoryId;
      }

      let attributes = { include: [] };
      let order = [['id', 'DESC']];

      if (reqLat !== null && reqLng !== null && !isNaN(reqLat) && !isNaN(reqLng)) {
        const distanceFormula = `
          (6371 * acos(
            least(1.0, greatest(-1.0, 
              cos(radians(${reqLat})) * 
              cos(radians(events.latitude)) * 
              cos(radians(events.longitude) - radians(${reqLng})) + 
              sin(radians(${reqLat})) * 
              sin(radians(events.latitude))
            ))
          ))
        `;

        attributes.include.push([db.sequelize.literal(distanceFormula), 'distance']);
        order = [[db.sequelize.literal('distance'), 'ASC'], ['id', 'DESC']];
      }

      const { count, rows } = await events.findAndCountAll({
        where: whereCondition,
        attributes,
        include: [
          {
            model: users,
            as: 'user',
            attributes: [
              'id', 'name', 'email', 'profileImage', 'phone', 'countryCode', 'isProvider',
              [
                db.sequelize.literal(`(
                  SELECT IFNULL(ROUND(AVG(rating), 1), 0)
                  FROM rating
                  WHERE rating.providerId = user.id
                )`),
                'avgRating'
              ],
              [
                db.sequelize.literal(`(
                  SELECT COUNT(*)
                  FROM rating
                  WHERE rating.providerId = user.id
                )`),
                'totalReview'
              ]
            ]
          },
          {
            model: services_categories,
            as: 'category',
            attributes: ['id', 'categoryName', 'image']
          }
        ],
        order,
        limit,
        offset,
        distinct: true
      });

      let eventList = rows;
      if (radiusKm && radiusKm > 0) {
        eventList = eventList.filter(ev => {
          const dist = ev.getDataValue('distance');
          return dist !== undefined && dist !== null ? dist <= radiusKm : true;
        });
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpireTime = currentTimestamp + 86400;
      const viewerUid = 0;

      const formattedEvents = eventList.map(ev => {
        const eventData = ev.toJSON();

        if (eventData.user) {
          eventData.user.avgRating = eventData.user.avgRating !== undefined && eventData.user.avgRating !== null
            ? parseFloat(eventData.user.avgRating)
            : 0;
          eventData.user.totalReview = eventData.user.totalReview !== undefined && eventData.user.totalReview !== null
            ? parseInt(eventData.user.totalReview, 10)
            : 0;
        }

        if (appID && appCertificate && eventData.agoraChannel) {
          try {
            const viewerToken = RtcTokenBuilder.buildTokenWithUid(
              appID,
              appCertificate,
              eventData.agoraChannel,
              viewerUid,
              RtcRole.SUBSCRIBER,
              privilegeExpireTime,
              privilegeExpireTime
            );
            const viewerRtmToken = RtmTokenBuilder.buildToken(
              appID,
              appCertificate,
              String(currentUserId),
              privilegeExpireTime
            );
            eventData.viewerAgoraToken = viewerToken;
            eventData.viewerUid = viewerUid;
            eventData.token = viewerToken;
            eventData.rtcToken = viewerToken;
            eventData.rtmToken = viewerRtmToken;
            eventData.viewerRtmToken = viewerRtmToken;
            eventData.rtmUserId = String(currentUserId);
            eventData.channelName = eventData.agoraChannel;
            eventData.uid = viewerUid;
            eventData.appId = appID;
          } catch (tokErr) {
            console.log("Error generating viewer token:", tokErr.message);
          }
        }

        if (eventData.distance !== undefined && eventData.distance !== null) {
          eventData.distanceKm = parseFloat(eventData.distance).toFixed(2);
        }

        return eventData;
      });

      return helper.success(res, "Nearby live events fetched successfully", {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        events: formattedEvents
      });

    } catch (error) {
      console.log("getNearbyLiveEvents error:", error);
      return helper.error(res, "Something went wrong while fetching nearby live events");
    }
  },


  /**
   * Get Details of a Specific Live Event
   */
  getLiveEventDetail: async (req, res) => {
    try {
      const currentUserId = req.auth.id;
      const eventId = req.params.id || req.body.eventId;

      if (!eventId) {
        return helper.failed(res, "Event ID is required");
      }

      const event = await events.findOne({
        where: { id: eventId },
        include: [
          {
            model: users,
            as: 'user',
            attributes: [
              'id', 'name', 'email', 'profileImage', 'phone', 'countryCode', 'isProvider',
              [
                db.sequelize.literal(`(
                  SELECT IFNULL(ROUND(AVG(rating), 1), 0)
                  FROM rating
                  WHERE rating.providerId = user.id
                )`),
                'avgRating'
              ],
              [
                db.sequelize.literal(`(
                  SELECT COUNT(*)
                  FROM rating
                  WHERE rating.providerId = user.id
                )`),
                'totalReview'
              ]
            ]
          },
          {
            model: services_categories,
            as: 'category',
            attributes: ['id', 'categoryName', 'image']
          }
        ]
      });

      if (!event) {
        return helper.failed(res, "Event not found");
      }

      if (event.available === 'followersOnly' && event.userId !== currentUserId) {
        const isFollowing = await followers.findOne({
          where: { followerId: currentUserId, followingId: event.userId }
        });
        if (!isFollowing) {
          return helper.failed(res, "This live event is only available to followers of the host");
        }
      }

      const eventData = event.toJSON();
      if (eventData.user) {
        eventData.user.avgRating = eventData.user.avgRating !== undefined && eventData.user.avgRating !== null
          ? parseFloat(eventData.user.avgRating)
          : 0;
        eventData.user.totalReview = eventData.user.totalReview !== undefined && eventData.user.totalReview !== null
          ? parseInt(eventData.user.totalReview, 10)
          : 0;
      }

      const appID = envfile.AGORA_APP_ID;
      const appCertificate = envfile.AGORA_APP_CERTIFICATE;

      if (appID && appCertificate && eventData.agoraChannel) {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpireTime = currentTimestamp + 86400;
        const isHost = event.userId === currentUserId;
        const role = isHost ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
        const uid = 0;

        const token = RtcTokenBuilder.buildTokenWithUid(
          appID,
          appCertificate,
          eventData.agoraChannel,
          uid,
          role,
          privilegeExpireTime,
          privilegeExpireTime
        );

        const rtmUserId = String(uid && uid !== 0 ? uid : currentUserId);
        let rtmToken = null;
        try {
          rtmToken = RtmTokenBuilder.buildToken(
            appID,
            appCertificate,
            rtmUserId,
            86400
          );
        } catch (rtmErr) {
          console.log("Error building RTM token in getLiveEventDetail:", rtmErr.message);
        }

        eventData.agoraToken = token;
        eventData.agoraUid = uid.toString();
        eventData.isHost = isHost;
        eventData.token = token;
        eventData.rtcToken = token;
        eventData.rtmToken = rtmToken;
        eventData.rtmUserId = rtmUserId;
        eventData.channelName = eventData.agoraChannel;
        eventData.uid = uid;
        eventData.appId = appID;
      }

      return helper.success(res, "Live event details fetched successfully", eventData);

    } catch (error) {
      console.log("getLiveEventDetail error:", error);
      return helper.error(res, "Something went wrong while fetching live event details");
    }
  },

  /**
   * Diagnostic test endpoint for push notification
   */
  testLivePush: async (req, res) => {
    try {
      const admin = require('firebase-admin');
      const firebaseInitialized = !!admin.apps.length;
      let firebaseProject = null;
      if (firebaseInitialized && admin.apps[0].options && admin.apps[0].options.credential) {
        firebaseProject = admin.apps[0].options.credential.projectId || null;
      }

      const targetUserId = req.query.userId || req.body.userId || (req.auth ? req.auth.id : null);

      const allUsersWithToken = await users.findAll({
        where: {
          deviceToken: {
            [Op.and]: [
              { [Op.ne]: null },
              { [Op.ne]: '' }
            ]
          }
        },
        attributes: ['id', 'name', 'email', 'status', 'isNotification', 'deviceType', 'deviceToken']
      });

      let targetUser = null;
      let pushResult = null;

      if (targetUserId) {
        targetUser = await users.findOne({
          where: { id: targetUserId },
          attributes: ['id', 'name', 'email', 'status', 'isNotification', 'deviceType', 'deviceToken']
        });
      }

      const testToken = req.query.deviceToken || req.body.deviceToken || (targetUser && targetUser.deviceToken ? targetUser.deviceToken : (allUsersWithToken.length > 0 ? allUsersWithToken[0].deviceToken : null));

      if (testToken && firebaseInitialized) {
        pushResult = await helper.sendPushNotification({
          token: testToken,
          title: "Test Live Stream Notification",
          body: "This is a test notification from Muulahub backend!",
          type: "live_event",
          eventId: "999",
          channelName: "test_channel",
          sender_id: String(req.auth ? req.auth.id : 0),
          sender_name: "Muulahub System"
        });
      }

      return helper.success(res, "Push test diagnostic result", {
        firebaseInitialized,
        firebaseProject,
        totalUsersWithDeviceToken: allUsersWithToken.length,
        usersWithDeviceToken: allUsersWithToken.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          status: u.status,
          isNotification: u.isNotification,
          deviceType: u.deviceType,
          deviceTokenPreview: u.deviceToken ? u.deviceToken.substring(0, 30) + '...' : null
        })),
        targetUser: targetUser ? {
          id: targetUser.id,
          name: targetUser.name,
          status: targetUser.status,
          isNotification: targetUser.isNotification,
          hasToken: !!targetUser.deviceToken
        } : null,
        testedTokenPreview: testToken ? testToken.substring(0, 30) + '...' : null,
        pushDelivered: pushResult
      });

    } catch (err) {
      console.error("testLivePush error:", err);
      return helper.error(res, "Error testing push: " + err.message);
    }
  },

  /**
   * Dummy endpoint to test push notification by pasting any deviceToken
   * Can be called via POST or GET (no auth required)
   * Body or query params:
   *  - deviceToken (or token): string (required)
   *  - title: string (optional)
   *  - body / message: string (optional)
   */
  sendTestPushByToken: async (req, res) => {
    try {
      const admin = require('firebase-admin');

      const token = (req.body && (req.body.deviceToken || req.body.token)) ||
        (req.query && (req.query.deviceToken || req.query.token));

      if (!token || String(token).trim() === '') {
        return helper.failed(res, "deviceToken is required. Please paste your FCM device token.", {
          exampleUsage: {
            method: "POST",
            url: "https://app.muulahub.com/mobile/sendTestPush",
            body: {
              deviceToken: "PASTE_YOUR_FCM_TOKEN_HERE",
              title: "Test Title (optional)",
              body: "Test Message (optional)"
            }
          }
        });
      }

      if (!admin.apps.length) {
        return helper.failed(res, "Firebase Admin is not initialized. Please verify backend/helpers/ service account JSON file.", {
          firebaseInitialized: false
        });
      }

      const cleanToken = String(token).trim();
      const title = (req.body && req.body.title) || (req.query && req.query.title) || "Muulahub Test Notification";
      const bodyText = (req.body && (req.body.body || req.body.message)) || (req.query && (req.query.body || req.query.message)) || "Hello! Push notification is working perfectly.";

      const messagePayload = {
        token: cleanToken,
        notification: {
          title: title,
          body: bodyText,
        },
        android: {
          priority: "high",
          notification: {
            channelId: "high_importance_channel",
            sound: "default",
            visibility: "PUBLIC",
            priority: "high",
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        data: {
          title: title,
          body: bodyText,
          message: bodyText,
          type: "test_push",
          sender_id: "0",
          sender_name: "Muulahub Admin"
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              contentAvailable: true,
            },
          },
          headers: {
            "apns-push-type": "alert",
            "apns-priority": "10",
          },
        },
      };

      console.log("Sending dummy test push to token:", cleanToken.substring(0, 30) + '...');
      const response = await admin.messaging().send(messagePayload);
      console.log("✅ Dummy test push success:", response);

      return helper.success(res, "Push notification sent successfully!", {
        success: true,
        firebaseMessageId: response,
        tokenTested: cleanToken,
        title: title,
        body: bodyText
      });

    } catch (err) {
      console.error("❌ Dummy test push failed:", err);
      return helper.failed(res, "Push notification failed: " + (err.message || err), {
        success: false,
        errorCode: err.code || null,
        errorMessage: err.message || String(err),
        tokenTested: (req.body && (req.body.deviceToken || req.body.token)) || (req.query && (req.query.deviceToken || req.query.token))
      });
    }
  }

};
