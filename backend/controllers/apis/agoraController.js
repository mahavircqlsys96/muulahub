const envfile = process.env;
const helper = require('../../helpers/helper');
const { RtcTokenBuilder, RtcRole } = require('agora-token');

module.exports = {
  generateToken: async (req, res) => {
    try {
      const appID = envfile.AGORA_APP_ID;
      const appCertificate = envfile.AGORA_APP_CERTIFICATE;


      console.log("appID", appID);
      console.log("appCertificate", appCertificate);

      if (!appID || !appCertificate) {
        return helper.failed(res, "Agora App ID and Certificate are missing in .env", {});
      }

      let channelName = req.body.channelName;
      if (!channelName || channelName.trim() === '') {
        // Generate a random channel name
        channelName = "room_" + Math.random().toString(36).substr(2, 9);
      }

      let uid = req.body.uid;
      if (!uid || uid === '') {
        uid = 0; // 0 means let Agora assign a UID
      }

      let role = RtcRole.SUBSCRIBER;
      if (req.body.role === 'publisher') {
        role = RtcRole.PUBLISHER;
      }

      let expireTime = req.body.expireTime;
      if (!expireTime || expireTime === '') {
        expireTime = 3600; // default 1 hour
      } else {
        expireTime = parseInt(expireTime, 10);
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const privilegeExpireTime = currentTime + expireTime;

      // Build token with uid
      const token = RtcTokenBuilder.buildTokenWithUid(
        appID,
        appCertificate,
        channelName,
        uid,
        role,
        privilegeExpireTime,
        privilegeExpireTime
      );

      return helper.success(res, "Token generated successfully", {
        token: token,
        channelName: channelName,
        uid: uid
      });

    } catch (error) {
      console.log(error);
      return helper.error(res, 'Error generating Agora token');
    }
  }
};
