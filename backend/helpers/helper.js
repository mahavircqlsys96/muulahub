const path = require("path");
const fs = require('fs');
var uuid = require("uuid").v4;
const nodemailer = require("nodemailer");
const ENV = process.env
const admin = require("firebase-admin");
const AWS = require("aws-sdk");

// Initialize Firebase Admin SDK
try {
  let serviceAccount = null;
  const helpersDir = path.resolve(__dirname);

  // 1. Try explicit mulla-hub-d64f38492841.json
  const defaultPath = path.resolve(helpersDir, "./mulla-hub-d64f38492841.json");
  if (fs.existsSync(defaultPath)) {
    serviceAccount = require(defaultPath);
  }

  // 2. Try any json file in helpers directory that has private_key & client_email
  if (!serviceAccount && fs.existsSync(helpersDir)) {
    const files = fs.readdirSync(helpersDir);
    for (const file of files) {
      if (file.endsWith('.json') && file !== 'firebase-dummy.json') {
        try {
          const candidate = require(path.resolve(helpersDir, file));
          if (candidate && candidate.private_key && candidate.client_email && candidate.project_id && !candidate.private_key.includes("YOUR_PRIVATE_KEY_HERE")) {
            serviceAccount = candidate;
            console.log(`✅ Found Firebase service account in: ${file}`);
            break;
          }
        } catch (_) { }
      }
    }
  }

  // 3. Try firebase-dummy.json (if user pasted credentials into it)
  if (!serviceAccount) {
    const dummyPath = path.resolve(helpersDir, "./firebase-dummy.json");
    if (fs.existsSync(dummyPath)) {
      try {
        const candidate = require(dummyPath);
        if (candidate && candidate.private_key && !candidate.private_key.includes("YOUR_PRIVATE_KEY_HERE")) {
          serviceAccount = candidate;
          console.log("✅ Using Firebase credentials from firebase-dummy.json");
        }
      } catch (_) { }
    }
  }

  // 4. Try environment variable FIREBASE_SERVICE_ACCOUNT (raw JSON string or file path)
  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if (rawEnv.startsWith('{')) {
        serviceAccount = JSON.parse(rawEnv);
      } else if (fs.existsSync(rawEnv)) {
        serviceAccount = require(path.resolve(rawEnv));
      }
    } catch (_) { }
  }

  if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin initialized with project:", serviceAccount.project_id);
  } else if (!admin.apps.length) {
    console.log("⚠️ Firebase service account file not found or invalid in helpers directory");
  }
} catch (fbErr) {
  console.error("❌ Firebase Admin initialization error:", fbErr.message);
}

const twilio = require("twilio");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const clientNumber = "+14155238886";
const WhatsappclientNumber = "+14155238886";
const client = twilio(accountSid, authToken);
let TWILIO_API_KEY = process.env.TWILIO_API_KEY;
let TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
let TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
// Removed ffmpeg
module.exports = {
  sendPushNotification: async (notificationData) => {
    try {
      if (!admin.apps.length) {
        console.error("❌ Push Error: Firebase Admin is not initialized");
        return false;
      }

      const {
        token,
        title,
        body,
        type,
        sender_id,
        sender_name,
        sender_image,
        request_id,
        image
      } = notificationData;

      if (!token || typeof token !== 'string' || token.trim().length < 30) {
        console.log("⚠️ Push skipped: Token missing, invalid, or too short:", token);
        return false;
      }

      const notificationPayload = {
        title: title || "Muulahub",
        body: String(body || ""),
      };

      if (image) {
        notificationPayload.imageUrl = String(image);
      }

      const apnsHeaders = {
        "apns-push-type": "alert",
        "apns-priority": "10",
      };
      if (process.env.APNS_TOPIC) {
        apnsHeaders["apns-topic"] = process.env.APNS_TOPIC;
      }

      const message = {
        token: token,
        // ✅ REQUIRED for popup when app is killed
        notification: notificationPayload,

        // ✅ ANDROID CONFIG (HEADS-UP NOTIFICATION)
        android: {
          priority: "high",
          notification: {
            channelId: "high_importance_channel", // MUST match Flutter
            sound: "default",
            visibility: "PUBLIC",
            priority: "high",
            defaultSound: true,
            defaultVibrateTimings: true,

          },
        },

        // ✅ DATA PAYLOAD (for click handling)
        data: (() => {
          const payloadData = {
            title: title || "Muulahub",
            body: String(body || ""),
            message: String(body || ""),
            type: String(type || ''),
            sender_id: String(sender_id || '0'),
            sender_name: String(sender_name || ''),
            sender_image: String(sender_image || ''),
            request_id: request_id ? String(request_id) : '',
          };

          for (const [key, val] of Object.entries(notificationData)) {
            if (!['token', 'notification', 'image', 'title', 'body', 'message', 'type', 'sender_id', 'sender_name', 'sender_image', 'request_id'].includes(key) && val !== undefined && val !== null) {
              payloadData[key] = String(val);
            }
          }
          return payloadData;
        })(),

        // ✅ iOS CONFIG
        apns: {
          payload: {
            aps: {
              sound: "default",
              contentAvailable: true,
            },
          },
          headers: apnsHeaders,
        },
      };

      console.log("Push Payload:", message);

      const response = await admin.messaging().send(message);

      console.log("✅ Push sent:", response);

      return true;

    } catch (err) {
      const errMsg = err.message || String(err);
      console.error("❌ Push Error:", errMsg);

      // Auto-cleanup stale/invalid device tokens in DB so subsequent pushes succeed cleanly
      if (
        errMsg.includes('not a valid FCM registration token') ||
        errMsg.includes('NotRegistered') ||
        err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token'
      ) {
        try {
          const db = require('../models');
          db.users.update({ deviceToken: null }, { where: { deviceToken: token } }).catch(() => { });
          console.log(`🧹 [Push Clean] Cleared invalid/unregistered deviceToken from DB: ${token.substring(0, 20)}...`);
        } catch (_) { }
      }
      return false;
    }
  },

  /**
   * Build Agora RTC Token safely with multi-strategy fallback and credential protection
   */
  buildAgoraRtcToken: (appId, appCertificate, channelName, uid = 0, role = 'publisher', expire = 86400) => {
    const DEFAULT_APP_ID = '35e33cd325614d06a51b1e02628599d4';
    const DEFAULT_APP_CERT = 'e211879925b14332b4c77d63578b5763';

    try {
      let cleanAppId = String(appId || '').replace(/['"]/g, '').trim();
      if (!cleanAppId || cleanAppId.length !== 32) cleanAppId = DEFAULT_APP_ID;

      let cleanCert = String(appCertificate || '').replace(/['"]/g, '').trim();
      if (!cleanCert || cleanCert.length !== 32) cleanCert = DEFAULT_APP_CERT;

      const cleanChannel = String(channelName || '').trim();
      if (!cleanChannel) return '';

      const expireSeconds = parseInt(expire, 10) || 86400;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expireSeconds;
      const numericUid = parseInt(uid, 10) || 0;

      // Always grant publisher permissions (Role.PUBLISHER = 1) so both hosts & viewers can join without errInvalidToken
      const agoraRole = 1; // PUBLISHER

      // Strategy 1: Direct AccessToken2 (Token007) with integer issueTs (fixes Node.js 16+ float writeUInt32LE crash)
      try {
        const { AccessToken2, ServiceRtc } = require('agora-token/src/AccessToken2');
        const token = new AccessToken2(cleanAppId, cleanCert, currentTimestamp, expireSeconds);
        const serviceRtc = new ServiceRtc(cleanChannel, numericUid === 0 ? '' : `${numericUid}`);
        serviceRtc.add_privilege(ServiceRtc.kPrivilegeJoinChannel, expireSeconds);
        serviceRtc.add_privilege(ServiceRtc.kPrivilegePublishAudioStream, expireSeconds);
        serviceRtc.add_privilege(ServiceRtc.kPrivilegePublishVideoStream, expireSeconds);
        serviceRtc.add_privilege(ServiceRtc.kPrivilegePublishDataStream, expireSeconds);
        token.add_service(serviceRtc);
        const built = token.build();
        if (built && typeof built === 'string' && built.trim().length > 15) {
          return built.trim();
        }
      } catch (e0) {
        console.error("AccessToken2 direct RTC generation error:", e0.message);
      }

      // Strategy 2: RtcTokenBuilder2 (AccessToken2 / Token007)
      try {
        const { RtcTokenBuilder } = require('agora-token');
        if (RtcTokenBuilder && typeof RtcTokenBuilder.buildTokenWithUid === 'function') {
          const token = RtcTokenBuilder.buildTokenWithUid(
            cleanAppId,
            cleanCert,
            cleanChannel,
            numericUid,
            agoraRole,
            expireSeconds,
            expireSeconds
          );
          if (token && typeof token === 'string' && token.trim().length > 15) {
            return token.trim();
          }
        }
      } catch (e1) {
        console.error("RtcTokenBuilder2 generation error:", e1.message);
      }

      // Strategy 3: RtcTokenBuilder v1 (AccessToken / Token006)
      try {
        const RtcTokenBuilderV1 = require('agora-token/src/RtcTokenBuilder').RtcTokenBuilder;
        if (RtcTokenBuilderV1 && typeof RtcTokenBuilderV1.buildTokenWithUid === 'function') {
          const token = RtcTokenBuilderV1.buildTokenWithUid(
            cleanAppId,
            cleanCert,
            cleanChannel,
            numericUid,
            agoraRole,
            privilegeExpiredTs
          );
          if (token && typeof token === 'string' && token.trim().length > 15) {
            return token.trim();
          }
        }
      } catch (e2) {
        console.error("RtcTokenBuilderV1 generation error:", e2.message);
      }

      return '';
    } catch (err) {
      console.error("buildAgoraRtcToken general error:", err.message);
      try {
        const RtcTokenBuilderV1 = require('agora-token/src/RtcTokenBuilder').RtcTokenBuilder;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        return RtcTokenBuilderV1.buildTokenWithUid(
          DEFAULT_APP_ID,
          DEFAULT_APP_CERT,
          String(channelName).trim(),
          0,
          1,
          currentTimestamp + 86400
        ) || '';
      } catch (_) {
        return '';
      }
    }
  },

  /**
   * Build Agora RTM Token supporting both RTM 1.x (ServiceRtm) and RTM 2.x (ServiceRtm2 / Signaling)
   */
  buildAgoraRtmToken: (appId, appCertificate, userId, expire = 86400) => {
    const DEFAULT_APP_ID = '35e33cd325614d06a51b1e02628599d4';
    const DEFAULT_APP_CERT = 'e211879925b14332b4c77d63578b5763';

    try {
      let cleanAppId = String(appId || '').replace(/['"]/g, '').trim();
      if (!cleanAppId || cleanAppId.length !== 32) cleanAppId = DEFAULT_APP_ID;

      let cleanCert = String(appCertificate || '').replace(/['"]/g, '').trim();
      if (!cleanCert || cleanCert.length !== 32) cleanCert = DEFAULT_APP_CERT;

      const cleanUserId = String(userId || '0').trim();
      const expireSeconds = parseInt(expire, 10) || 86400;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expireSeconds;

      // Strategy 1: Direct AccessToken2 with integer issueTs (fixes Node.js 16+ float writeUInt32LE crash)
      try {
        const { AccessToken2, ServiceRtm, ServiceRtm2 } = require('agora-token/src/AccessToken2');
        const token = new AccessToken2(cleanAppId, cleanCert, currentTimestamp, expireSeconds);

        const serviceRtm = new ServiceRtm(cleanUserId);
        serviceRtm.add_privilege(ServiceRtm.kPrivilegeLogin, expireSeconds);
        token.add_service(serviceRtm);

        const serviceRtm2 = new ServiceRtm2(cleanUserId);
        serviceRtm2.add_privilege(ServiceRtm2.kPrivilegeLogin, expireSeconds);
        token.add_service(serviceRtm2);

        const built = token.build();
        if (built && typeof built === 'string' && built.trim().length > 15) {
          return built.trim();
        }
      } catch (e0) {
        console.error("AccessToken2 direct RTM generation error:", e0.message);
      }

      // Strategy 2: Classic RtmTokenBuilder (v1)
      try {
        const { RtmTokenBuilder, Role } = require('agora-token/src/RtmTokenBuilder');
        const rtmRole = (Role && Role.Rtm_User) ? Role.Rtm_User : 1;
        const built = RtmTokenBuilder.buildToken(
          cleanAppId,
          cleanCert,
          cleanUserId,
          rtmRole,
          privilegeExpiredTs
        );
        if (built && typeof built === 'string' && built.trim().length > 15) {
          return built.trim();
        }
      } catch (e2) {
        console.error("RtmTokenBuilder v1 generation error:", e2.message);
      }

      return '';
    } catch (err) {
      console.error("buildAgoraRtmToken general error:", err.message);
      try {
        const { RtmTokenBuilder, Role } = require('agora-token/src/RtmTokenBuilder');
        const currentTimestamp = Math.floor(Date.now() / 1000);
        return RtmTokenBuilder.buildToken(
          DEFAULT_APP_ID,
          DEFAULT_APP_CERT,
          String(userId || '0').trim(),
          1,
          currentTimestamp + 86400
        ) || '';
      } catch (_) {
        return '';
      }
    }
  },

  fileUpload: async (file, folder) => {
    if (file) {
      const extension = path.extname(file.name);
      const filename = uuid() + extension;

      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
      });

      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `${folder}/${filename}`,
        Body: file.data,
        ContentType: file.mimetype,
        ACL: 'public-read'
      };

      try {
        const data = await s3.upload(params).promise();
        return data.Location;
      } catch (err) {
        console.error("S3 Upload Error:", err);
        throw err;
      }
    }
    return null;
  },

  uploadMuxVideo: async (file) => {
    if (!file) return null;
    try {
      const mux = require('../config/mux');
      const axios = require('axios');

      const upload = await mux.video.uploads.create({
        new_asset_settings: { playback_policies: ['public'] },
        cors_origin: '*',
      });

      await axios.put(upload.url, file.data, {
        headers: { 'Content-Type': file.mimetype }
      });

      let playbackId = null;
      for (let i = 0; i < 30; i++) {
        const up = await mux.video.uploads.retrieve(upload.id);
        if (up.asset_id) {
          const asset = await mux.video.assets.retrieve(up.asset_id);
          if (asset.playback_ids && asset.playback_ids.length > 0) {
            playbackId = asset.playback_ids[0].id;
            break;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (playbackId) {
        return {
          videoUrl: `https://stream.mux.com/${playbackId}.m3u8`,
          thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg`
        };
      }
      return null;
    } catch (err) {
      console.log("Mux upload error", err);
      return null;
    }
  },
  success: function (res, message, body = {}, code = 200) {
    return res.status(code).json({
      success: true,
      code: code,
      message: message,
      body: body,
    });
  },

  // ❌ FAILED (validation errors, bad request, etc.)
  failed: function (res, message = "Request failed", body = {}, code = 400) {
    return res.status(code).json({
      success: false,
      code: code,
      message: message,
      body: body,
    });
  },

  // 🔐 UNAUTHORIZED
  unauthorized: function (res, message = "Unauthorized access", body = {}, code = 401) {
    return res.status(code).json({
      success: false,
      code: code,
      message: message,
      body: body,
    });
  },

  // 🚫 FORBIDDEN
  forbidden: function (res, message = "Forbidden", body = {}, code = 403) {
    return res.status(code).json({
      success: false,
      code: code,
      message: message,
      body: body,
    });
  },

  // 💥 SERVER ERROR
  error: function (res, message = "Internal server error", body = {}, code = 500) {
    return res.status(code).json({
      success: false,
      code: code,
      message: message,
      body: body,
    });
  },
  checkValidation: async (v) => {
    var errorsResponse;

    await v.check().then(function (matched) {
      if (!matched) {
        var valdErrors = v.errors;
        var respErrors = [];
        Object.keys(valdErrors).forEach(function (key) {
          if (valdErrors && valdErrors[key] && valdErrors[key].message) {
            respErrors.push(valdErrors[key].message);
          }
        });
        errorsResponse = respErrors.join(", ");
      }
    });
    return errorsResponse;
  },
  unixTimestamp: function () {
    var time = Date.now();
    var n = time / 1000;
    return (time = Math.floor(n));
  },
  sendEmail: async (to, subject, html) => {
    try {

      const transport = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER.trim(),
          pass: process.env.SMTP_PASSWORD.trim(),
        },
      });

      const mailOptions = {
        from: "ajay.cqlsysinfo@gmail.com",
        to,
        subject,
        html,
      };

      await transport.sendMail(mailOptions);
    } catch (err) {
      console.error("Email sending failed:", err);
      throw err;
    }
  },
  twillow_code: async (phoneNumber, otp) => {
    try {
      const cleanPhone = phoneNumber.replace(/\s+/g, "");

      const message = await client.messages.create({
        from: "whatsapp:+14155238886",
        to: `whatsapp:${cleanPhone}`,
        body: `Your OTP is ${otp}`,
      });

      console.log("WhatsApp SID:", message.sid);
      return true;

    } catch (error) {
      console.error("Twilio WhatsApp Error:", error);
      throw error;
    }
  },
  deleteFileIfExists: (filePath) => {
    try {
      console.log('filepath', filePath)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.log("File delete error:", err);
      throw err
    }
  },
  stripePayment: async (
    amounts,
    user_dtails,
    booking,
    account_destinationId,
    payment_type,
    vender_amount
  ) => {
    let data = "";
    const account = await stripe.accounts.retrieve(account_destinationId.stripeAccountId);

    if (payment_type === 1) {
      data = {
        booking_details: booking.id,
        package_id: 0,
      };
    } else {
      data = {
        booking_details: 0,
        package_details: booking.id,
      };
    }
    const ephemeralKey = await stripe.ephemeralKeys.create(
      {
        customer: user_dtails.stripe_id,
      },
      {
        apiVersion: "2024-12-18.acacia",
        // apiVersion: "2023-10-16",
      }
    );

    const paymentMethods = await stripe.paymentMethods.list({
      customer: account_destinationId.stripe_id,
      type: 'card',
    });
    console.log("paymentMethods", paymentMethods);
    // return

    let price = (vender_amount * 100)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amounts * 100),
      application_fee_amount: Math.round((amounts - vender_amount) * 100),    // You take commission
      currency: "USD",
      customer: user_dtails.stripe_id,
      payment_method_types: ["card"],
      //   transfer_data: {
      //     destination: account_destinationId.stripeAccountId, // connected account
      //     amount: Math.round(vender_amount * 100), // amount to send to lawyer
      // },
      // // Key change
      on_behalf_of: account_destinationId.stripeAccountId,

      // Make Stripe settle to connected account
      transfer_data: {
        destination: account_destinationId.stripeAccountId,
      },

      metadata: {
        data: JSON.stringify(data),
      },
    });
    let obj = {
      ephemeralKey: ephemeralKey,
      paymentIntent: paymentIntent,
    };


    return obj;
  },

  /**
   * Get active live channel viewers count & list from Socket.IO & memory
   */
  getLiveChannelViewers: async (channelName) => {
    if (!channelName) return { channelId: '', channelName: '', viewerCount: 0, totalViewers: 0, views: 0, viewers: [] };
    const cleanChannel = String(channelName).trim();
    const viewersMap = new Map();

    const io = global.io;
    if (io) {
      if (io.liveChannelViewers && io.liveChannelViewers.has(cleanChannel)) {
        const memMap = io.liveChannelViewers.get(cleanChannel);
        for (const [k, v] of memMap.entries()) {
          viewersMap.set(k, {
            id: v.id || 0,
            name: v.name || 'Viewer',
            profileImage: v.profileImage || ''
          });
        }
      }

      try {
        const sockets = await io.in(cleanChannel).fetchSockets();
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
    }

    const viewersList = Array.from(viewersMap.values());
    return {
      channelId: cleanChannel,
      channelName: cleanChannel,
      viewerCount: viewersList.length,
      totalViewers: viewersList.length,
      views: viewersList.length,
      viewers: viewersList
    };
  }
}
