const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { Op } = require('sequelize');
const db = require('../../models');
const { events, users, services_categories, followers } = db;
const { RtcTokenBuilder, RtcRole } = require('agora-token');

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

      const appID = envfile.AGORA_APP_ID;
      const appCertificate = envfile.AGORA_APP_CERTIFICATE;

      if (!appID || !appCertificate) {
        return helper.failed(res, "Agora App ID and Certificate are not configured on the server");
      }

      const {
        caption,
        description,
        categoryId,
        available,
        location,
        latitude,
        longitude,
        image

      } = req.body;

      // // Handle media upload if provided
      // let mediaUrl = req.body.media || null;
      // if (req.files && (req.files.media || req.files.image || req.files.thumbnail)) {
      //   const fileToUpload = req.files.media || req.files.image || req.files.thumbnail;
      //   mediaUrl = await helper.fileUpload(fileToUpload, "events");
      // }

      // Generate unique Agora channel name
      const channelName = req.body.channelName || `event_${userId}_${Date.now()}`;

      // Numeric UID for Agora RTC
      let agoraUid = req.body.uid ? parseInt(req.body.uid, 10) : parseInt(userId, 10);
      if (isNaN(agoraUid) || agoraUid <= 0) {
        agoraUid = Math.floor(100000 + Math.random() * 900000);
      }

      // 24 hours token validity
      const expireTimeInSeconds = req.body.expireTime ? parseInt(req.body.expireTime, 10) : 86400;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpireTime = currentTimestamp + expireTimeInSeconds;

      // Host token with PUBLISHER role
      const agoraToken = RtcTokenBuilder.buildTokenWithUid(
        appID,
        appCertificate,
        channelName,
        agoraUid,
        RtcRole.PUBLISHER,
        privilegeExpireTime,
        privilegeExpireTime
      );

      // RULE: At any time, only ONE event can be live for this user.
      // Automatically stop any previously active live event.
      await events.update(
        { status: 'stop' },
        { where: { userId, status: 'start' } }
      );

      // Create new live event record
      const newEvent = await events.create({
        userId,
        categoryId: categoryId || null,
        caption: caption || 'Live Event',
        description: description || null,
        available: available || 'everyone',
        location: location || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        media: image,
        status: 'start',
        agoraToken,
        agoraChannel: channelName,
        agoraUid: agoraUid.toString(),
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
            attributes: ['id', 'name', 'email', 'profileImage', 'phone', 'countryCode']
          },
          {
            model: services_categories,
            as: 'category',
            attributes: ['id', 'categoryName', 'image']
          }
        ]
      });

      return helper.success(res, "Live event created and streaming started successfully", eventDetails);

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
      const eventId = req.params.eventId

      let event = null;

      if (eventId) {
        event = await events.findOne({
          where: { id: eventId, userId }
        });
      } else {
        // Fallback: stop currently active live event for this user
        event = await events.findOne({
          where: { userId, status: 'start' },
          order: [['id', 'DESC']]
        });
      }

      if (!event) {
        return helper.failed(res, "Active live event not found");
      }

      await event.update({ status: 'stop' });

      // Guarantee no other live event remains active for this user
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
            attributes: ['id', 'name', 'email', 'profileImage', 'phone', 'countryCode']
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

      return helper.success(res, "Current live event fetched successfully", currentEvent);

    } catch (error) {
      console.log("getMyLiveEvent error:", error);
      return helper.error(res, "Something went wrong while fetching current live event");
    }
  },

  /**
   * Get Nearby Live Events for Other Users
   * Includes distance calculation, category & followersOnly privacy checks,
   * and generates a SUBSCRIBER Agora token for each stream.
   */
  getNearbyLiveEvents: async (req, res) => {
    try {
      const currentUserId = req.auth.id;

      const appID = envfile.AGORA_APP_ID;
      const appCertificate = envfile.AGORA_APP_CERTIFICATE;

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      // Latitude and Longitude from query or user profile
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

      // Check who the current user is following (for followersOnly events)
      const followings = await followers.findAll({
        where: { followerId: currentUserId },
        attributes: ['followingId']
      });
      const followingIds = followings.map(f => f.followingId);

      // Privacy condition:
      // Show event if available == 'everyone' OR current user follows the creator
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

      // Base WHERE condition: other users' live events
      const whereCondition = {
        userId: { [Op.ne]: currentUserId },
        status: 'start',
        ...privacyCondition
      };

      // Category filter if passed
      if (req.query.categoryId) {
        whereCondition.categoryId = req.query.categoryId;
      }

      let attributes = { include: [] };
      let order = [['id', 'DESC']];

      // Distance calculation with Haversine formula
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
            attributes: ['id', 'name', 'email', 'profileImage', 'phone', 'countryCode', 'isProvider']
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

      // Filter by radius if provided
      let eventList = rows;
      if (radiusKm && radiusKm > 0) {
        eventList = eventList.filter(ev => {
          const dist = ev.getDataValue('distance');
          return dist !== undefined && dist !== null ? dist <= radiusKm : true;
        });
      }

      // Generate viewer Agora token (SUBSCRIBER) for each live stream
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpireTime = currentTimestamp + 86400;
      const viewerUid = parseInt(currentUserId, 10) || Math.floor(100000 + Math.random() * 900000);

      const formattedEvents = eventList.map(ev => {
        const eventData = ev.toJSON();

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
            eventData.viewerAgoraToken = viewerToken;
            eventData.viewerUid = viewerUid;
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
   * Get Details of a Specific Live Event (with viewer Agora token)
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
            attributes: ['id', 'name', 'email', 'profileImage', 'phone', 'countryCode', 'isProvider']
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

      // Check privacy if event is followersOnly
      if (event.available === 'followersOnly' && event.userId !== currentUserId) {
        const isFollowing = await followers.findOne({
          where: { followerId: currentUserId, followingId: event.userId }
        });
        if (!isFollowing) {
          return helper.failed(res, "This live event is only available to followers of the host");
        }
      }

      const eventData = event.toJSON();

      const appID = envfile.AGORA_APP_ID;
      const appCertificate = envfile.AGORA_APP_CERTIFICATE;

      if (appID && appCertificate && eventData.agoraChannel) {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpireTime = currentTimestamp + 86400;
        const isHost = event.userId === currentUserId;
        const role = isHost ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
        const uid = isHost && event.agoraUid ? parseInt(event.agoraUid, 10) : (parseInt(currentUserId, 10) || Math.floor(100000 + Math.random() * 900000));

        const token = RtcTokenBuilder.buildTokenWithUid(
          appID,
          appCertificate,
          eventData.agoraChannel,
          uid,
          role,
          privilegeExpireTime,
          privilegeExpireTime
        );

        eventData.agoraToken = token;
        eventData.agoraUid = uid.toString();
        eventData.isHost = isHost;
      }

      return helper.success(res, "Live event details fetched successfully", eventData);

    } catch (error) {
      console.log("getLiveEventDetail error:", error);
      return helper.error(res, "Something went wrong while fetching live event details");
    }
  }

};
