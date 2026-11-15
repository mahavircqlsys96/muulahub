const envfile = process.env;
const helper = require('../../helpers/helper');
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = require('agora-token');
const db = require('../../models');

module.exports = {
  /**
   * Generate initial Agora RTC & RTM Tokens
   */
  generateToken: async (req, res) => {
    try {
      const appID = envfile.AGORA_APP_ID;
      const appCertificate = envfile.AGORA_APP_CERTIFICATE;

      if (!appID || !appCertificate) {
        return helper.failed(res, "Agora App ID and Certificate are missing in .env", {});
      }

      let channelName = req.body.channelName || req.body.channel_name || req.body.channel;
      if (!channelName || String(channelName).trim() === '') {
        channelName = "room_" + Math.random().toString(36).substr(2, 9);
      }

      let rawUid = req.body.uid;
      let uid = 0;
      if (rawUid !== undefined && rawUid !== null && rawUid !== '') {
        const parsed = parseInt(rawUid, 10);
        uid = isNaN(parsed) ? 0 : parsed;
      }

      // roleType: 0 = event creator (publisher), 1 = other user (subscriber)
      let role = RtcRole.SUBSCRIBER;
      const rawRoleType = req.body.roleType !== undefined ? req.body.roleType : req.body.role;
      if (rawRoleType === 0 || rawRoleType === '0' || rawRoleType === 'publisher') {
        role = RtcRole.PUBLISHER;
      } else if (rawRoleType === 1 || rawRoleType === '1' || rawRoleType === 'subscriber') {
        role = RtcRole.SUBSCRIBER;
      }

      let expireTime = req.body.expireTime;
      if (!expireTime || isNaN(parseInt(expireTime, 10))) {
        expireTime = 86400; // default 24 hours
      } else {
        expireTime = parseInt(expireTime, 10);
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const privilegeExpireTime = currentTime + expireTime;

      // RTC Token (audio/video streaming)
      const token = RtcTokenBuilder.buildTokenWithUid(
        appID,
        appCertificate,
        channelName,
        uid,
        role,
        privilegeExpireTime,
        privilegeExpireTime
      );

      // RTM Token (real-time chat/messaging during live stream - supports RTM 1.x & RTM 2.x)
      const rtmUserId = String(req.body.userId || (uid !== 0 ? uid : (req.auth ? req.auth.id : 0)));
      const rtmToken = helper.buildAgoraRtmToken(
        appID,
        appCertificate,
        rtmUserId,
        expireTime
      );

      return helper.success(res, "Token generated successfully", {
        token: token,
        rtcToken: token,
        rtmToken: rtmToken,
        rtmUserId: rtmUserId,
        channelName: channelName,
        uid: uid,
        roleType: role === RtcRole.PUBLISHER ? 0 : 1,
        role: role === RtcRole.PUBLISHER ? "publisher" : "subscriber",
        appId: appID,
        expireTime: expireTime
      });

    } catch (error) {
      console.log("generateToken error:", error);
      return helper.error(res, 'Error generating Agora token');
    }
  },

  /**
   * Renew / Refresh Agora RTC & RTM Tokens when previous token expires
   * Expected body parameters:
   *  - channelName (or channel_name / channel)
   *  - uid (number or 0)
   *  - roleType: 0 (event creator / publisher) or 1 (other user / subscriber)
   *  - expireTime (optional, defaults to 86400 seconds)
   */
  renewToken: async (req, res) => {
    try {
      const appID = envfile.AGORA_APP_ID;
      const appCertificate = envfile.AGORA_APP_CERTIFICATE;

      if (!appID || !appCertificate) {
        return helper.failed(res, "Agora App ID and Certificate are missing in .env", {});
      }

      const channelName = req.body.channelName || req.body.channel_name || req.body.channel;
      if (!channelName || String(channelName).trim() === '') {
        return helper.failed(res, "Channel name is required");
      }

      let rawUid = req.body.uid;
      let uid = 0;
      if (rawUid !== undefined && rawUid !== null && rawUid !== '') {
        const parsed = parseInt(rawUid, 10);
        uid = isNaN(parsed) ? 0 : parsed;
      }

      // roleType: 0 = event creator (publisher), 1 = other user (subscriber)
      let role = RtcRole.SUBSCRIBER;
      const rawRoleType = req.body.roleType !== undefined ? req.body.roleType : req.body.role;
      if (rawRoleType === 0 || rawRoleType === '0' || rawRoleType === 'publisher') {
        role = RtcRole.PUBLISHER;
      } else if (rawRoleType === 1 || rawRoleType === '1' || rawRoleType === 'subscriber') {
        role = RtcRole.SUBSCRIBER;
      }

      let expireTime = req.body.expireTime;
      if (!expireTime || isNaN(parseInt(expireTime, 10))) {
        expireTime = 86400; // default 24 hours
      } else {
        expireTime = parseInt(expireTime, 10);
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const privilegeExpireTime = currentTime + expireTime;

      // Build new Agora RTC token
      const token = RtcTokenBuilder.buildTokenWithUid(
        appID,
        appCertificate,
        channelName,
        uid,
        role,
        privilegeExpireTime,
        privilegeExpireTime
      );

      // Build new Agora RTM token for live streaming chat (supports RTM 1.x & RTM 2.x)
      const rtmUserId = String(req.body.userId || (uid !== 0 ? uid : (req.auth ? req.auth.id : 0)));
      const rtmToken = helper.buildAgoraRtmToken(
        appID,
        appCertificate,
        rtmUserId,
        expireTime
      );

      // If publisher/creator renews token, also update active event in DB if it exists
      if (role === RtcRole.PUBLISHER && db && db.events) {
        try {
          await db.events.update(
            { agoraToken: token },
            { where: { agoraChannel: channelName, status: 'start' } }
          );
        } catch (dbErr) {
          console.log("Note: could not update active event record with renewed token:", dbErr.message);
        }
      }

      return helper.success(res, "New Agora token generated successfully", {
        token: token,
        rtcToken: token,
        rtmToken: rtmToken,
        rtmUserId: rtmUserId,
        channelName: channelName,
        uid: uid,
        roleType: role === RtcRole.PUBLISHER ? 0 : 1,
        role: role === RtcRole.PUBLISHER ? "publisher" : "subscriber",
        appId: appID,
        expireTime: expireTime
      });

    } catch (error) {
      console.log("renewToken error:", error);
      return helper.error(res, 'Error renewing Agora token');
    }
  },

  /**
   * Dedicated endpoint to generate / renew an Agora RTM Token
   * Expected body parameters:
   *  - userId (or uid)
   *  - expireTime (optional, default 86400 seconds)
   */
  generateRtmToken: async (req, res) => {
    try {
      const appID = envfile.AGORA_APP_ID;
      const appCertificate = envfile.AGORA_APP_CERTIFICATE;

      if (!appID || !appCertificate) {
        return helper.failed(res, "Agora App ID and Certificate are missing in .env", {});
      }

      let userId = req.body.userId || req.body.uid || (req.auth ? req.auth.id : null);
      if (userId === undefined || userId === null || userId === '') {
        return helper.failed(res, "userId is required for RTM token");
      }

      let expireTime = req.body.expireTime;
      if (!expireTime || isNaN(parseInt(expireTime, 10))) {
        expireTime = 86400; // default 24 hours
      } else {
        expireTime = parseInt(expireTime, 10);
      }

      const rtmToken = helper.buildAgoraRtmToken(
        appID,
        appCertificate,
        String(userId),
        expireTime
      );

      return helper.success(res, "RTM Token generated successfully", {
        rtmToken: rtmToken,
        token: rtmToken,
        userId: String(userId),
        appId: appID,
        expireTime: expireTime
      });

    } catch (error) {
      console.log("generateRtmToken error:", error);
      return helper.error(res, 'Error generating Agora RTM token');
    }
  },

  /**
   * Query Agora RTC REST API for channel users and connected count
   * Endpoint: https://api.agora.io/dev/v1/channel/user/{APP_ID}/{CHANNEL_NAME}
   * Query / Body:
   *  - channelName (or channel)
   *  - eventId (optional, looks up channelName from DB)
   */
  getChannelUsers: async (req, res) => {
    try {
      const https = require('https');
      const appID = envfile.AGORA_APP_ID;
      const customerId = envfile.AGORA_CUSTOMER_ID || envfile.AGORA_CUSTOMER_KEY;
      const customerSecret = envfile.AGORA_CUSTOMER_SECRET;

      let channelName = req.query.channelName || req.query.channel || (req.body && (req.body.channelName || req.body.channel)) || (req.params && req.params.channelName);
      const eventId = req.query.eventId || (req.body && req.body.eventId) || (req.params && req.params.eventId);

      if (!channelName && eventId && db && db.events) {
        const ev = await db.events.findOne({ where: { id: eventId } });
        if (ev && ev.agoraChannel) {
          channelName = ev.agoraChannel;
        }
      }

      if (!channelName || String(channelName).trim() === '') {
        return helper.failed(res, "channelName is required");
      }

      if (!appID) {
        return helper.failed(res, "AGORA_APP_ID is missing in .env");
      }

      if (!customerId || !customerSecret) {
        return helper.failed(res, "Agora RESTful API credentials (AGORA_CUSTOMER_ID and AGORA_CUSTOMER_SECRET) are missing in .env. Please generate RESTful API credentials from Agora Console (Account -> RESTful API Keys).", {
          total: 0,
          channel_exist: false,
          missingCredentials: true
        });
      }

      const basicAuth = Buffer.from(`${customerId}:${customerSecret}`).toString('base64');
      const encodedChannel = encodeURIComponent(String(channelName).trim());
      const apiPath = `/dev/v1/channel/user/${appID}/${encodedChannel}`;

      const agoraResult = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.agora.io',
          path: apiPath,
          method: 'GET',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        };

        const apiReq = https.request(options, (apiRes) => {
          let data = '';
          apiRes.on('data', (chunk) => { data += chunk; });
          apiRes.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve({ statusCode: apiRes.statusCode, data: parsed });
            } catch (jsonErr) {
              resolve({ statusCode: apiRes.statusCode, raw: data });
            }
          });
        });

        apiReq.on('error', (err) => reject(err));
        apiReq.on('timeout', () => {
          apiReq.destroy();
          reject(new Error("Request to Agora API timed out"));
        });
        apiReq.end();
      });

      if (agoraResult.data && agoraResult.data.success) {
        const channelData = agoraResult.data.data || {};
        return helper.success(res, "Channel users fetched successfully", {
          channelName: channelName,
          channel_exist: !!channelData.channel_exist,
          total: channelData.total || 0,
          broadcasters: channelData.broadcasters || [],
          audience: channelData.audience || [],
          users: channelData.users || [],
          broadcasterCount: (channelData.broadcasters || []).length,
          audienceCount: (channelData.audience || []).length
        });
      } else {
        return helper.failed(res, (agoraResult.data && agoraResult.data.message) || "Failed to fetch Agora channel users", agoraResult.data || {});
      }

    } catch (error) {
      console.log("getChannelUsers error:", error);
      return helper.error(res, "Error fetching channel users: " + error.message);
    }
  }
};
