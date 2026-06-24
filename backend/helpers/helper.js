const path = require("path");
var uuid = require("uuid").v4;
const nodemailer = require("nodemailer");
const ENV = process.env
const admin = require("firebase-admin");
 const serviceAccount = require("./parkez-2ea64-firebase-adminsdk-fbsvc-b4b03bc9c2.json");
const twilio = require("twilio");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const clientNumber = "+14155238886";
const WhatsappclientNumber = "+14155238886";
const fs = require('fs');
const client = twilio(accountSid, authToken);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

let TWILIO_API_KEY = process.env.TWILIO_API_KEY;
let TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
let TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
// + 1 227 257 3061
module.exports = {
  sendPushNotification: async (notificationData) => {
    try {
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

      const message = {
        token: token,

        // ✅ REQUIRED for popup when app is killed
        notification: {
          title: title || "ParkEZ",
          body: String(body),
        },

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
        data: {
          title: title || "ParkEZ",
          body: String(body),
          message: String(body),
          type: String(type || ''),
          sender_id: String(sender_id || '0'),
          sender_name: sender_name || '',
          sender_image: sender_image || '',
          request_id: request_id ? String(request_id) : '',
        },

        // ✅ iOS CONFIG
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
            "apns-topic": "com.parkez.app"
          },
        },
      };

      console.log("Push Payload:", message);

      const response = await admin.messaging().send(message);

      console.log("✅ Push sent:", response);

      return true;

    } catch (err) {
      console.error("❌ Push Error:", err);
      return false;
    }
  },

  fileUpload: async (file, folder) => {
    if (file) {
      var extension = path.extname(file.name);
      var filename = uuid() + extension;
      file.mv(
        process.cwd() + `/public/images/${folder}/` + filename,
        function (err) {
          if (err) return err;
        }
      );
    }

    let fullpath = `/images/${folder}/` + filename
    return fullpath;
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








}
