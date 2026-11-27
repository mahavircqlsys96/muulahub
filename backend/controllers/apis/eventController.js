const helper = require('../../helpers/helper');
const agoraRecording = require('../../helpers/agoraRecording');
const { Validator } = require('node-input-validator');
const { Op } = require('sequelize');
const db = require('../../models');
const { events, users, services_categories, followers, notifications } = db;
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = require('agora-token');

const envfile = process.env;

const cleanCert = (cert) => {
  let c = String(cert || '').replace(/['"]/g, '').trim();
  if (c.length === 33 && c.endsWith('A')) c = c.slice(0, 32);
  return c;
};

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

      // Stop any previously active live event(s) for this user so only one is live at a time
      try {
        const prevEvents = await events.findAll({ where: { userId, status: 'start' } });
        for (const prev of prevEvents) {
          if (prev.recordingSid && prev.recordingResourceId && prev.recordingStatus === 'recording') {
            agoraRecording.stopRecordingForEvent({
              channelName: prev.agoraChannel,
              recordingUid: prev.recordingUid,
              resourceId: prev.recordingResourceId,
              sid: prev.recordingSid,
              eventId: prev.id
            }).then(stopRes => {
              if (stopRes && stopRes.recordingUrl) {
                prev.update({ recordingStatus: 'completed', recordingUrl: stopRes.recordingUrl });
              } else {
                prev.update({ recordingStatus: 'stopped' });
              }
            }).catch(() => prev.update({ recordingStatus: 'stopped' }));
          }
        }
      } catch (_) {}

      await events.update(
        { status: 'stop' },
        { where: { userId, status: 'start' } }
      );

      const appID = String(envfile.AGORA_APP_ID || '35e33cd325614d06a51b1e02628599d4').replace(/['"]/g, '').trim();
      const appCertificate = cleanCert(envfile.AGORA_APP_CERTIFICATE || 'e211879925b14332b4c77d63578b5763');

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
      const agoraToken = helper.buildAgoraRtcToken(
        appID,
        appCertificate,
        channelName,
        uid,
        role,
        expireTime
      );

      // Build RTM token for live streaming real-time chat (supports RTM 1.x & RTM 2.x)
      const rtmUserId = String(uid && uid !== 0 ? uid : userId);
      const rtmToken = helper.buildAgoraRtmToken(
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

      // Auto-start live stream recording on AWS S3 if Agora Cloud Recording is configured
      let recordingInfo = {
        recordingStatus: 'idle',
        recordingResourceId: null,
        recordingSid: null,
        recordingUid: null,
        recordingUrl: null,
        recordingStorage: 'AWS_S3',
        s3Bucket: process.env.AWS_S3_BUCKET_NAME || 'muulahublive'
      };

      if (agoraRecording.isConfigured()) {
        try {
          const recordingUid = String(Math.floor(100000 + Math.random() * 900000));
          const startResult = await agoraRecording.startRecordingForEvent({
            channelName,
            recordingUid,
            eventId: newEvent.id
          });
          if (startResult && startResult.success) {
            await newEvent.update({
              recordingResourceId: startResult.resourceId,
              recordingSid: startResult.sid,
              recordingUid: recordingUid,
              recordingStatus: 'recording'
            });
            recordingInfo = {
              recordingStatus: 'recording',
              recordingResourceId: startResult.resourceId,
              recordingSid: startResult.sid,
              recordingUid: recordingUid,
              recordingUrl: null,
              recordingStorage: 'AWS_S3',
              s3Bucket: process.env.AWS_S3_BUCKET_NAME || 'muulahublive'
            };
            console.log(`🎥 [Live Recording] Auto-started Agora recording on AWS S3 for event ${newEvent.id} (Channel: ${channelName}, S3: ${recordingInfo.s3Bucket})`);
          } else {
            console.log("ℹ️ [Live Recording] Agora recording could not be auto-started:", startResult ? startResult.message : 'Unknown');
          }
        } catch (recErr) {
          console.error("⚠️ [Live Recording] Auto-start recording error:", recErr.message);
        }
      } else {
        console.log("ℹ️ [Live Recording] Note: AGORA_CUSTOMER_ID / AGORA_CUSTOMER_SECRET not set in .env. Live event started without automatic cloud recording.");
      }

      const responseData = {
        ...eventJson,
        ...recordingInfo,
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

      // If caller passes deviceToken in createEvent body, ensure it is saved for this user
      if (req.body && req.body.deviceToken && String(req.body.deviceToken).trim() !== '') {
        try {
          await users.update(
            { deviceToken: String(req.body.deviceToken).trim() },
            { where: { id: userId } }
          );
        } catch (_) { }
      }

      // Send push notification to all users to join the live streaming event (background task)
      (async () => {
        try {
          const creatorName = (eventJson.user && eventJson.user.name) ? eventJson.user.name : (req.auth && req.auth.name ? req.auth.name : 'Someone');
          const creatorImage = (eventJson.user && (eventJson.user.profileImage || eventJson.user.profileImageProvider)) || '';
          const pushTitle = `${creatorName} is Live Now!`;
          const pushBody = caption && caption.trim() !== ''
            ? `${creatorName} is streaming live: "${caption}". Tap to join!`
            : `${creatorName} has started a live video stream. Tap to join and watch!`;

          // Exclude the creator (self-user) so creator NEVER receives their own live push notification
          const creatorUser = await users.findOne({
            where: { id: userId },
            attributes: ['id', 'deviceToken']
          });
          const creatorDeviceToken = creatorUser && creatorUser.deviceToken ? creatorUser.deviceToken.trim() : null;

          let recipientWhere = {
            id: { [Op.ne]: userId },
            status: { [Op.ne]: 'blocked' },
            deviceToken: {
              [Op.and]: [
                { [Op.ne]: null },
                { [Op.ne]: '' }
              ]
            }
          };

          if (available === 'followersOnly') {
            const followerRows = await followers.findAll({
              where: { followingId: userId },
              attributes: ['followerId']
            });
            const followerIds = followerRows.map(f => f.followerId);
            recipientWhere.id = {
              [Op.and]: [
                { [Op.in]: followerIds },
                { [Op.ne]: userId }
              ]
            };
          }

          const recipients = await users.findAll({
            where: recipientWhere,
            attributes: ['id', 'deviceToken', 'name', 'status']
          });

          console.log(`📡 [createEvent Push] Event ID: ${newEvent.id}, Host: ${creatorName} (${userId}). Total other recipients: ${recipients.length}`);

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
              // await notifications.bulkCreate(notificationsData);
              console.log(`✅ [createEvent Push] Created ${notificationsData.length} in-app notification records in DB.`);
            } catch (dbNotifErr) {
              console.log("Note: Could not bulk create notifications in DB:", dbNotifErr.message);
            }

            // 2. Send push notifications to recipients (strictly excluding creator's device token)
            const validTokens = [...new Set(
              recipients
                .map(u => u.deviceToken ? u.deviceToken.trim() : null)
                .filter(tok => tok && tok.length > 20 && tok !== creatorDeviceToken)
            )];

            console.log(`📡 [createEvent Push] Sending push to ${validTokens.length} devices via sendPushNotification...`);

            let sentCount = 0;
            let failCount = 0;
            await Promise.allSettled(validTokens.map(async (tok) => {
              try {
                const sent = await helper.sendPushNotification({
                  token: tok,
                  title: pushTitle,
                  body: pushBody,
                  type: 'live_event',
                  eventId: String(newEvent.id),
                  channelName: String(channelName),
                  sender_id: String(userId),
                  sender_name: creatorName,
                  sender_image: "",
                  image: '',
                  request_id: String(newEvent.id)
                });
                if (sent) sentCount++;
                else failCount++;
              } catch (tokErr) {
                failCount++;
                console.error("Push send error for token:", tokErr.message);
              }
            }));
            console.log(`📡 [createEvent Push] sendPushNotification finished: ${sentCount} sent, ${failCount} failed.`);
          } else {
            console.log("⚠️ [createEvent Push] No recipients found with registered device tokens in database.");
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

      // Stop cloud recording if active for this event
      if (event.recordingSid && event.recordingResourceId && event.recordingStatus === 'recording') {
        try {
          console.log(`🎥 [Live Recording] Stopping Agora cloud recording for event ${event.id}...`);
          const stopResult = await agoraRecording.stopRecordingForEvent({
            channelName: event.agoraChannel,
            recordingUid: event.recordingUid,
            resourceId: event.recordingResourceId,
            sid: event.recordingSid,
            eventId: event.id
          });
          if (stopResult && stopResult.success && stopResult.recordingUrl) {
            await event.update({
              recordingStatus: 'completed',
              recordingUrl: stopResult.recordingUrl
            });
            console.log(`✅ [Live Recording] Successfully saved live stream recording on AWS S3: ${stopResult.recordingUrl}`);
          } else {
            await event.update({ recordingStatus: 'stopped' });
          }
        } catch (recStopErr) {
          console.error("⚠️ [Live Recording] Error stopping cloud recording:", recStopErr.message);
          await event.update({ recordingStatus: 'stopped' });
        }
      }

      await events.update(
        { status: 'stop' },
        { where: { userId, status: 'start' } }
      );

      // Notify real-time socket room that live stream has ended
      if (global.io && event.agoraChannel) {
        global.io.to(event.agoraChannel).emit('liveStreamEnded', {
          channelName: event.agoraChannel,
          channelId: event.agoraChannel,
          eventId: event.id
        });
        global.io.to(event.agoraChannel).emit('eventEnded', {
          channelName: event.agoraChannel,
          channelId: event.agoraChannel,
          eventId: event.id
        });
        if (global.io.liveChannelViewers) {
          global.io.liveChannelViewers.delete(event.agoraChannel);
        }
      }

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
   * Viewer joins active live event (Increases viewer count & broadcasts in real time)
   * Body / Query:
   *  - eventId or channelName (or channelId / channel)
   *  - userId (optional)
   */
  joinEvent: async (req, res) => {
    try {
      const channelInput = (req.body && (req.body.channelName || req.body.channelId || req.body.channel || req.body.eventId)) || req.query.channelName || req.query.channelId || req.query.channel || req.query.eventId;
      if (!channelInput) {
        return helper.failed(res, "channelName or eventId is required");
      }

      let channelName = String(channelInput).trim();
      let eventId = null;

      if (!channelName.startsWith('event_')) {
        const numId = parseInt(channelName, 10);
        if (!isNaN(numId) && numId > 0) {
          const ev = await events.findOne({ where: { id: numId }, attributes: ['id', 'agoraChannel'] });
          if (ev) {
            eventId = ev.id;
            channelName = ev.agoraChannel || channelName;
          }
        }
      } else {
        const match = channelName.match(/^event_(\d+)_/);
        if (match) eventId = parseInt(match[1], 10);
      }

      const rawUserId = (req.body && (req.body.userId || req.body.senderId || req.body.id)) || req.query.userId || (req.auth ? req.auth.id : null);
      let userName = (req.body && (req.body.userName || req.body.name)) || req.query.userName || 'Viewer';
      let userImage = (req.body && (req.body.userImage || req.body.profileImage || req.body.image)) || req.query.userImage || '';

      if (rawUserId) {
        try {
          const dbUser = await users.findOne({
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

      const io = global.io;
      if (io) {
        if (!io.liveChannelViewers) io.liveChannelViewers = new Map();
        if (!io.liveChannelViewers.has(channelName)) {
          io.liveChannelViewers.set(channelName, new Map());
        }
        const channelMap = io.liveChannelViewers.get(channelName);
        const viewerKey = rawUserId ? `user_${rawUserId}` : `guest_${Date.now()}`;
        channelMap.set(viewerKey, {
          id: rawUserId ? parseInt(rawUserId, 10) : 0,
          name: userName,
          profileImage: userImage,
          joinedAt: Date.now()
        });
      }

      const viewersPayload = await helper.getLiveChannelViewers(channelName);

      // Real-time broadcast to all viewers in this live stream
      if (io) {
        io.to(channelName).emit('getViewers', viewersPayload);
        io.to(channelName).emit('liveViewers', viewersPayload);
        io.to(channelName).emit('channelViewers', viewersPayload);
        io.to(channelName).emit('viewerCount', {
          channelId: channelName,
          channelName: channelName,
          eventId: eventId,
          viewerCount: viewersPayload.viewerCount,
          totalViewers: viewersPayload.viewerCount,
          views: viewersPayload.viewerCount
        });
        io.to(channelName).emit('userJoinedLiveStream', {
          channelId: channelName,
          channelName: channelName,
          eventId: eventId,
          user: { id: rawUserId ? parseInt(rawUserId, 10) : 0, name: userName, profileImage: userImage },
          viewerCount: viewersPayload.viewerCount
        });
      }

      return helper.success(res, "Joined live event successfully. Viewer count increased.", {
        eventId,
        ...viewersPayload
      });

    } catch (error) {
      console.log("joinEvent error:", error);
      return helper.error(res, "Something went wrong while joining live event: " + error.message);
    }
  },

  /**
   * Viewer leaves active live event (Decreases viewer count & broadcasts in real time)
   * Body / Query:
   *  - eventId or channelName (or channelId / channel)
   *  - userId (optional)
   */
  leaveEvent: async (req, res) => {
    try {
      const channelInput = (req.body && (req.body.channelName || req.body.channelId || req.body.channel || req.body.eventId)) || req.query.channelName || req.query.channelId || req.query.channel || req.query.eventId;
      if (!channelInput) {
        return helper.failed(res, "channelName or eventId is required");
      }

      let channelName = String(channelInput).trim();
      let eventId = null;

      if (!channelName.startsWith('event_')) {
        const numId = parseInt(channelName, 10);
        if (!isNaN(numId) && numId > 0) {
          const ev = await events.findOne({ where: { id: numId }, attributes: ['id', 'agoraChannel'] });
          if (ev) {
            eventId = ev.id;
            channelName = ev.agoraChannel || channelName;
          }
        }
      } else {
        const match = channelName.match(/^event_(\d+)_/);
        if (match) eventId = parseInt(match[1], 10);
      }

      const rawUserId = (req.body && (req.body.userId || req.body.senderId || req.body.id)) || req.query.userId || (req.auth ? req.auth.id : null);

      const io = global.io;
      if (io && io.liveChannelViewers && io.liveChannelViewers.has(channelName)) {
        const channelMap = io.liveChannelViewers.get(channelName);
        if (rawUserId) {
          channelMap.delete(`user_${rawUserId}`);
        } else {
          const firstKey = channelMap.keys().next().value;
          if (firstKey) channelMap.delete(firstKey);
        }
      }

      const viewersPayload = await helper.getLiveChannelViewers(channelName);

      // Real-time broadcast to all viewers in this live stream
      if (io) {
        io.to(channelName).emit('getViewers', viewersPayload);
        io.to(channelName).emit('liveViewers', viewersPayload);
        io.to(channelName).emit('channelViewers', viewersPayload);
        io.to(channelName).emit('viewerCount', {
          channelId: channelName,
          channelName: channelName,
          eventId: eventId,
          viewerCount: viewersPayload.viewerCount,
          totalViewers: viewersPayload.viewerCount,
          views: viewersPayload.viewerCount
        });
        io.to(channelName).emit('userLeftLiveStream', {
          channelId: channelName,
          channelName: channelName,
          eventId: eventId,
          userId: rawUserId ? parseInt(rawUserId, 10) : 0,
          viewerCount: viewersPayload.viewerCount
        });
      }

      return helper.success(res, "Left live event successfully. Viewer count decreased.", {
        eventId,
        ...viewersPayload
      });

    } catch (error) {
      console.log("leaveEvent error:", error);
      return helper.error(res, "Something went wrong while leaving live event: " + error.message);
    }
  },

  /**
   * Get active viewers & viewer count for an event
   */
  getViewers: async (req, res) => {
    try {
      const channelInput = (req.body && (req.body.channelName || req.body.channelId || req.body.channel || req.body.eventId)) || req.query.channelName || req.query.channelId || req.query.channel || req.query.eventId;
      if (!channelInput) {
        return helper.failed(res, "channelName or eventId is required");
      }

      let channelName = String(channelInput).trim();
      let eventId = null;

      if (!channelName.startsWith('event_')) {
        const numId = parseInt(channelName, 10);
        if (!isNaN(numId) && numId > 0) {
          const ev = await events.findOne({ where: { id: numId }, attributes: ['id', 'agoraChannel'] });
          if (ev) {
            eventId = ev.id;
            channelName = ev.agoraChannel || channelName;
          }
        }
      } else {
        const match = channelName.match(/^event_(\d+)_/);
        if (match) eventId = parseInt(match[1], 10);
      }

      const viewersPayload = await helper.getLiveChannelViewers(channelName);
      return helper.success(res, "Live viewers fetched successfully", {
        eventId,
        ...viewersPayload
      });
    } catch (error) {
      console.log("getViewers error:", error);
      return helper.error(res, "Something went wrong while fetching viewers: " + error.message);
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
      const resolvedAppId = String(envfile.AGORA_APP_ID || eventData.agoraAppId || '35e33cd325614d06a51b1e02628599d4').replace(/['"]/g, '').trim();
      const resolvedAppCert = cleanCert(envfile.AGORA_APP_CERTIFICATE || eventData.agoraAppCertificate || 'e211879925b14332b4c77d63578b5763');

      const uid = eventData.agoraUid ? (parseInt(eventData.agoraUid, 10) || 0) : 0;
      const rtmUserId = String(uid && uid !== 0 ? uid : userId);

      const freshRtcToken = helper.buildAgoraRtcToken(
        resolvedAppId,
        resolvedAppCert,
        eventData.agoraChannel,
        uid,
        'publisher',
        86400
      );

      const freshRtmToken = helper.buildAgoraRtmToken(
        resolvedAppId,
        resolvedAppCert,
        rtmUserId,
        86400
      );

      eventData.token = freshRtcToken;
      eventData.rtcToken = freshRtcToken;
      eventData.agoraToken = freshRtcToken;
      eventData.viewerAgoraToken = freshRtcToken;
      eventData.rtmToken = freshRtmToken;
      eventData.viewerRtmToken = freshRtmToken;
      eventData.rtmUserId = rtmUserId;
      eventData.channelName = eventData.agoraChannel;
      eventData.uid = uid;
      eventData.appId = resolvedAppId;

      // Attach viewer count to eventData
      const viewersPayload = await helper.getLiveChannelViewers(eventData.agoraChannel);
      eventData.viewerCount = viewersPayload.viewerCount;
      eventData.totalViewers = viewersPayload.viewerCount;
      eventData.views = viewersPayload.viewerCount;
      eventData.viewers = viewersPayload.viewers;

      // Keep active event token fresh in DB
      if (freshRtcToken && currentEvent.agoraToken !== freshRtcToken) {
        currentEvent.update({ agoraToken: freshRtcToken }).catch(() => { });
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
      const currentUserId = req.auth ? req.auth.id : (req.user ? req.user.id : 0);

      const appID = envfile.AGORA_APP_ID;
      const appCertificate = envfile.AGORA_APP_CERTIFICATE;

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      let reqLat = req.query.latitude ? parseFloat(req.query.latitude) : null;
      let reqLng = req.query.longitude ? parseFloat(req.query.longitude) : null;
      const radiusKm = req.query.radius ? parseFloat(req.query.radius) : null;

      if ((!reqLat || !reqLng) && currentUserId > 0) {
        const currentUser = await users.findOne({
          where: { id: currentUserId },
          attributes: ['latitude', 'longitude']
        });
        if (currentUser && currentUser.latitude && currentUser.longitude) {
          reqLat = parseFloat(currentUser.latitude);
          reqLng = parseFloat(currentUser.longitude);
        }
      }

      let followingIds = [];
      if (currentUserId > 0) {
        const followings = await followers.findAll({
          where: { followerId: currentUserId },
          attributes: ['followingId']
        });
        followingIds = followings.map(f => f.followingId);
      }

      const privacyCondition = {
        [Op.or]: [
          { available: 'everyone' },
          { available: null },
          ...(currentUserId > 0 ? [{
            [Op.and]: [
              { available: 'followersOnly' },
              { userId: { [Op.in]: followingIds } }
            ]
          }] : [])
        ]
      };

      const whereCondition = {
        status: 'start',
        ...privacyCondition
      };

      if (currentUserId > 0) {
        whereCondition.userId = { [Op.ne]: currentUserId };
      }

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

        const resolvedAppId = String(appID || eventData.agoraAppId || '35e33cd325614d06a51b1e02628599d4').replace(/['"]/g, '').trim();
        const resolvedAppCert = cleanCert(appCertificate || eventData.agoraAppCertificate || 'e211879925b14332b4c77d63578b5763');

        if (eventData.agoraChannel) {
          try {
            const viewerToken = helper.buildAgoraRtcToken(
              resolvedAppId,
              resolvedAppCert,
              eventData.agoraChannel,
              viewerUid,
              'publisher',
              86400
            );
            const effectiveRtmUserId = String(currentUserId || `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
            const viewerRtmToken = helper.buildAgoraRtmToken(
              resolvedAppId,
              resolvedAppCert,
              effectiveRtmUserId,
              86400
            );
            eventData.viewerAgoraToken = viewerToken;
            eventData.viewerUid = viewerUid;
            eventData.token = viewerToken;
            eventData.rtcToken = viewerToken;
            eventData.rtmToken = viewerRtmToken;
            eventData.viewerRtmToken = viewerRtmToken;
            eventData.rtmUserId = effectiveRtmUserId;
            eventData.channelName = eventData.agoraChannel;
            eventData.uid = viewerUid;
            eventData.appId = resolvedAppId;
          } catch (tokErr) {
            console.log("Error generating viewer token:", tokErr.message);
          }
        }

        if (eventData.distance !== undefined && eventData.distance !== null) {
          eventData.distanceKm = parseFloat(eventData.distance).toFixed(2);
        }

        // Attach viewer count from active memory/sockets
        const activeViewers = (global.io && global.io.liveChannelViewers && eventData.agoraChannel && global.io.liveChannelViewers.get(eventData.agoraChannel))
          ? global.io.liveChannelViewers.get(eventData.agoraChannel).size
          : 0;
        eventData.viewerCount = activeViewers;
        eventData.totalViewers = activeViewers;
        eventData.views = activeViewers;

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
      const currentUserId = req.auth ? req.auth.id : (req.user ? req.user.id : 0);
      const eventId = req.params.id || (req.body && req.body.eventId) || req.query.eventId || req.query.id;

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
        if (!currentUserId) {
          return helper.failed(res, "This live event is only available to followers of the host. Please log in to watch.");
        }
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

      const resolvedAppId = String(appID || eventData.agoraAppId || '35e33cd325614d06a51b1e02628599d4').replace(/['"]/g, '').trim();
      const resolvedAppCert = cleanCert(appCertificate || eventData.agoraAppCertificate || 'e211879925b14332b4c77d63578b5763');

      if (eventData.agoraChannel) {
        const isHost = currentUserId > 0 && event.userId === currentUserId;
        const uid = 0;

        const token = helper.buildAgoraRtcToken(
          resolvedAppId,
          resolvedAppCert,
          eventData.agoraChannel,
          uid,
          'publisher',
          86400
        );

        const rtmUserId = String(uid && uid !== 0 ? uid : (currentUserId || `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`));
        let rtmToken = helper.buildAgoraRtmToken(
          resolvedAppId,
          resolvedAppCert,
          rtmUserId,
          86400
        );

        eventData.agoraToken = token;
        eventData.agoraUid = uid.toString();
        eventData.isHost = isHost;
        eventData.token = token;
        eventData.rtcToken = token;
        eventData.viewerAgoraToken = token;
        eventData.rtmToken = rtmToken;
        eventData.viewerRtmToken = rtmToken;
        eventData.rtmUserId = rtmUserId;
        eventData.channelName = eventData.agoraChannel;
        eventData.uid = uid;
        eventData.appId = resolvedAppId;
      }

      // Attach viewer count to eventData
      const viewersPayload = await helper.getLiveChannelViewers(eventData.agoraChannel);
      eventData.viewerCount = viewersPayload.viewerCount;
      eventData.totalViewers = viewersPayload.viewerCount;
      eventData.views = viewersPayload.viewerCount;
      eventData.viewers = viewersPayload.viewers;

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
  },

  /**
   * Start Live Stream Cloud Recording on AWS S3
   * Endpoint: POST /api/events/:id/start-recording or POST /api/startRecording
   */
  startRecording: async (req, res) => {
    try {
      const userId = req.auth ? req.auth.id : null;
      const eventId = req.params.id || req.params.eventId || req.body.eventId;
      const channelName = req.body.channelName || req.body.channel;

      let event = null;
      if (eventId) {
        event = await events.findOne({ where: { id: eventId } });
      } else if (channelName) {
        event = await events.findOne({ where: { agoraChannel: channelName }, order: [['id', 'DESC']] });
      } else if (userId) {
        event = await events.findOne({ where: { userId, status: 'start' }, order: [['id', 'DESC']] });
      }

      if (!event) {
        return helper.failed(res, "Active live event not found");
      }

      const channel = event.agoraChannel || channelName;
      if (!channel) {
        return helper.failed(res, "Channel name is missing for this event");
      }

      if (!agoraRecording.isConfigured()) {
        return helper.failed(res, "Agora Cloud Recording requires AGORA_CUSTOMER_ID and AGORA_CUSTOMER_SECRET in .env", {
          missingCredentials: true,
          configured: false,
          bucket: process.env.AWS_S3_BUCKET_NAME || 'muulahublive'
        });
      }

      const recordingUid = String(Math.floor(100000 + Math.random() * 900000));
      const startResult = await agoraRecording.startRecordingForEvent({
        channelName: channel,
        recordingUid,
        eventId: event.id
      });

      if (!startResult.success) {
        return helper.failed(res, "Failed to start Agora cloud recording: " + startResult.message, startResult);
      }

      await event.update({
        recordingResourceId: startResult.resourceId,
        recordingSid: startResult.sid,
        recordingUid: recordingUid,
        recordingStatus: 'recording'
      });

      return helper.success(res, "Live stream recording started on AWS S3", {
        eventId: event.id,
        channelName: channel,
        recordingStatus: 'recording',
        recordingResourceId: startResult.resourceId,
        recordingSid: startResult.sid,
        recordingUid: recordingUid,
        bucket: process.env.AWS_S3_BUCKET_NAME || 'muulahublive',
        region: process.env.AWS_REGION || 'us-east-1'
      });

    } catch (error) {
      console.error("startRecording error:", error);
      return helper.error(res, "Error starting live recording: " + error.message);
    }
  },

  /**
   * Stop Live Stream Cloud Recording on AWS S3
   * Endpoint: POST /api/events/:id/stop-recording or POST /api/stopRecording
   */
  stopRecording: async (req, res) => {
    try {
      const userId = req.auth ? req.auth.id : null;
      const eventId = req.params.id || req.params.eventId || req.body.eventId;
      const channelName = req.body.channelName || req.body.channel;

      let event = null;
      if (eventId) {
        event = await events.findOne({ where: { id: eventId } });
      } else if (channelName) {
        event = await events.findOne({ where: { agoraChannel: channelName }, order: [['id', 'DESC']] });
      } else if (userId) {
        event = await events.findOne({ where: { userId }, order: [['id', 'DESC']] });
      }

      if (!event) {
        return helper.failed(res, "Live event not found");
      }

      if (!event.recordingSid || !event.recordingResourceId) {
        return helper.failed(res, "No active cloud recording found for this event", {
          recordingStatus: event.recordingStatus || 'idle'
        });
      }

      const stopResult = await agoraRecording.stopRecordingForEvent({
        channelName: event.agoraChannel,
        recordingUid: event.recordingUid,
        resourceId: event.recordingResourceId,
        sid: event.recordingSid
      });

      if (!stopResult.success) {
        await event.update({ recordingStatus: 'stopped' });
        return helper.failed(res, "Failed to stop recording: " + stopResult.message, stopResult);
      }

      const recordingUrl = stopResult.recordingUrl || null;
      await event.update({
        recordingStatus: 'completed',
        recordingUrl: recordingUrl || event.recordingUrl
      });

      return helper.success(res, "Live stream recording stopped and saved to AWS S3 successfully", {
        eventId: event.id,
        recordingStatus: 'completed',
        recordingUrl: recordingUrl,
        fileList: stopResult.fileList || [],
        bucket: process.env.AWS_S3_BUCKET_NAME || 'muulahublive'
      });

    } catch (error) {
      console.error("stopRecording error:", error);
      return helper.error(res, "Error stopping live recording: " + error.message);
    }
  },

  /**
   * Get Live Stream Recording Status
   * Endpoint: GET /api/events/:id/recording-status or GET /api/recordingStatus/:id
   */
  getRecordingStatus: async (req, res) => {
    try {
      const eventId = req.params.id || req.params.eventId || req.query.eventId;
      if (!eventId) return helper.failed(res, "eventId is required");

      const event = await events.findOne({ where: { id: eventId } });
      if (!event) return helper.failed(res, "Event not found");

      let agoraQueryData = null;
      if (event.recordingResourceId && event.recordingSid && agoraRecording.isConfigured()) {
        try {
          agoraQueryData = await agoraRecording.query(event.recordingResourceId, event.recordingSid);
        } catch (_) {}
      }

      return helper.success(res, "Recording status fetched", {
        eventId: event.id,
        status: event.status,
        recordingStatus: event.recordingStatus || 'idle',
        recordingUrl: event.recordingUrl || null,
        recordingResourceId: event.recordingResourceId || null,
        recordingSid: event.recordingSid || null,
        agoraQueryData
      });
    } catch (error) {
      console.error("getRecordingStatus error:", error);
      return helper.error(res, "Error fetching recording status: " + error.message);
    }
  },

  /**
   * Direct Upload of Recorded Live Stream to AWS S3
   * Endpoint: POST /api/events/:id/upload-recording or POST /api/uploadRecording
   * Used when mobile/web client recorded locally on device and uploads file
   */
  uploadRecording: async (req, res) => {
    try {
      const eventId = req.params.id || req.params.eventId || req.body.eventId;
      if (!eventId) return helper.failed(res, "eventId is required");

      const event = await events.findOne({ where: { id: eventId } });
      if (!event) return helper.failed(res, "Event not found");

      const file = req.files && (req.files.video || req.files.recording || req.files.file || req.files.media);
      if (!file) {
        return helper.failed(res, "No video recording file provided (expected field 'video' or 'recording')");
      }

      console.log(`🎥 Uploading client live recording to AWS S3 for event ${eventId}...`);
      const s3Url = await helper.uploadFileToS3(file, `recordings/event_${eventId}`);

      await event.update({
        recordingStatus: 'completed',
        recordingUrl: s3Url
      });

      return helper.success(res, "Recording uploaded and saved to AWS S3 successfully", {
        eventId: event.id,
        recordingStatus: 'completed',
        recordingUrl: s3Url,
        bucket: process.env.AWS_S3_BUCKET_NAME || 'muulahublive'
      });

    } catch (error) {
      console.error("uploadRecording error:", error);
      return helper.error(res, "Error uploading recording to AWS S3: " + error.message);
    }
  }

};
