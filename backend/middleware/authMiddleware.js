const { Validator } = require("node-input-validator");
const db = require('../models');
const ENV = process.env;
const helper = require("../helpers/helper");
const jwt = require("jsonwebtoken")

module.exports = {
  isAuthenticated: async (req, res, next) => {
    try {
      if (!req.session.authAdmin) {
        return res.redirect('/subAdmin/login');
      } else {
        res.locals.authAdmin = req.session.authAdmin
        next();
      }

    } catch (error) {
      return res.redirect('/subAdmin/login');
    }
  },
  authenticateJWT: async (req, res, next) => {
    try {



      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          code: 401,
          msg: "Unauthorized: Token missing",
          body: {},
        });
      }

      const token = authHeader.split(" ")[1];

      let payload;
      try {
        payload = jwt.verify(token, ENV.crypto_key);
      } catch (err) {
        return res.status(403).json({
          success: false,
          code: 403,
          msg: "Forbidden: Invalid or expired token",
          body: {},
        });
      }

      const userId = payload?.data?.id;
      const loginTime = payload?.data?.loginTime;

      // 🛑 HARD CHECK (prevents undefined crash)
      if (!userId || !loginTime) {
        return res.status(403).json({
          success: false,
          code: 403,
          msg: "Invalid token payload. Please login again.",
          body: {},
        });
      }

      const user = await db.users.findOne({
        where: {
          id: userId,
          loginTime: loginTime,
          status: "active"
        },
        raw: true
      });

      if (!user) {
        return res.status(403).json({
          success: false,
          code: 403,
          msg: "Session expired. Please login again.",
          body: {},
        });
      }

      req.auth = user;
      next();

    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        code: 500,
        msg: "Internal Server Error",
        body: {},
      });
    }
  },

  authenticateHeader: async function (req, res, next) {
    const v = new Validator(req.headers, {
      secret_key: "required|string",
      publish_key: "required|string",
    });

    let errorsResponse = await helper.checkValidation(v);

    if (errorsResponse) {
      return helper.failed(res, errorsResponse);
    }

    if (
      req.headers.secret_key == ENV.secret_key &&
      req.headers.publish_key == ENV.publish_key
    ) {
      next();
    } else {
      return helper.failed(res, "Key not matched!");
    }
  },
  authenticateToken: async function (req, res) {
    try {

      const token = req;

      const decoded = jwt.verify(token, ENV.crypto_key);

      const userDetails = await db.users.findOne({
        where: {
          id: decoded.data.id,
          loginTime: decoded.data.loginTime
        },
        raw: true,
      });

      if (userDetails) {
        return {
          success: true,
          user: userDetails
        };
      } else {
        return {
          success: false,
          user: null
        };
      }

    } catch (error) {
      console.log(error);
      return {
        success: false,
        user: null
      };
    }
  },
  authenticateAdminJWT: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(403).json({
          success: false,
          code: 403,
          msg: "Unauthorized: Token missing",
          body: {},
        });
      }

      const token = authHeader.split(" ")[1];

      let payload;
      try {
        payload = jwt.verify(token, ENV.crypto_key);
      } catch (err) {
        return res.status(403).json({
          success: false,
          code: 403,
          msg: "Forbidden: Invalid or expired token",
          body: {},
        });
      }

      const userId = payload?.data?.id;

      // 🛑 HARD CHECK (prevents undefined crash)
      if (!userId) {
        return res.status(403).json({
          success: false,
          code: 403,
          msg: "Invalid token payload. Please login again.",
          body: {},
        });
      }

      const user = await db.users.findOne({
        where: {
          id: userId,
          deletedAt: null
        },
        raw: true
      });

      if (!user) {
        return res.status(403).json({
          success: false,
          code: 403,
          msg: "Session expired. Please login again.",
          body: {},
        });
      }

      if (user.role !== "admin") {
        return res.status(403).json({
          success: false,
          code: 403,
          msg: "Forbidden: admin access required",
          body: {},
        });
      }

      req.auth = user;
      next();

    } catch (error) {
      console.log(error);
      return res.status(403).json({
        success: false,
        code: 403,
        msg: "Internal Server Error",
        body: {},
      });
    }
  },
}