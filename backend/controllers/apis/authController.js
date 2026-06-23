const envfile = process.env;
let CryptoJS = require("crypto-js");
const crypto = require('crypto');
const helper = require("../../helpers/helper");
const { Validator } = require("node-input-validator");
const moment = require('moment');
const path = require("path");
var bcrypt = require('bcrypt');
const sequelize = require("sequelize");
const Op = sequelize.Op;
let jwt = require("jsonwebtoken");
const { req } = require("express");
const stripe = require("stripe")(envfile.stripe_secret_key);
const { users, cms, notifications, services_categories, user_categories, contact_support, provider_categories, portfolio_images } = require("../../models");

user_categories.belongsTo(services_categories, { foreignKey: 'categoryId', as: 'categories' });
provider_categories.belongsTo(services_categories, { foreignKey: 'categoryId', as: 'categories' });

module.exports = {
  encryption: async (req, res) => {
    try {
      const v = new Validator(req.headers, {
        secret_key: "required|string",
        publish_key: "required|string",
      });

      let errorsResponse = await helper.checkValidation(v);

      if (errorsResponse) {
        return helper.failed(res, errorsResponse);
      }

      let sk_data = req.headers.secret_key;
      let pk_data = req.headers.publish_key;
      var encryptedSkBuffer = CryptoJS.AES.encrypt(
        sk_data,
        envfile.crypto_key
      ).toString();
      var encryptedPkBuffer = CryptoJS.AES.encrypt(
        pk_data,
        envfile.crypto_key
      ).toString();
      var decryptedSkBuffer = CryptoJS.AES.decrypt(
        encryptedSkBuffer,
        envfile.crypto_key
      );
      var originalskText = decryptedSkBuffer.toString(CryptoJS.enc.Utf8);
      var decryptedPkBuffer = CryptoJS.AES.decrypt(
        encryptedPkBuffer,
        envfile.crypto_key
      );
      var originalpkTextr = decryptedPkBuffer.toString(CryptoJS.enc.Utf8);

      return helper.success(res, "data", {
        encryptedSkBuffer,
        encryptedPkBuffer,
        originalskText,
        originalpkTextr,
      });
    } catch (err) {
      console.log(err, ">>>>>>>>>>");
      // return helper.failed (res, err);
    }
  },
  login: async (req, res) => {
    try {

      const v = new Validator(req.body, {
        email: "required|email",
        password: "required",

      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { email, password, fcmToken, deviceType } = req.body;

      const loginTime = helper.unixTimestamp();

      const user = await users.findOne({
        where: { email }
      });

      if (!user) {
        return helper.failed(res, "No account found with this email. Please sign up to continue.");
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return helper.failed(res, "Invalid password. Please try again.");
      }

      if (user.status === "inactive" || user.status === "blocked") {
        return helper.failed(res, "Your account is suspended. Please contact the admin.");
      }

      // Create stripe customer if not exists
      let customerId = user.customerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          name: user.name,
          email: user.email,
          phone: `${user.countryCode}${user.phone}`,
        });

        customerId = customer.id;

        await user.update({
          customerId: customerId
        });
      }

      await user.update({
        loginTime: loginTime,
        fcmToken: fcmToken,
        deviceType: deviceType
      });

      const token = jwt.sign(
        {
          data: {
            id: user.id,
            loginTime
          }
        },
        envfile.crypto_key,
        { expiresIn: "30d" }
      );

      return helper.success(res, "Login successful", {
        ...user.toJSON(),
        token
      });

    } catch (err) {
      console.log(err);
      return helper.error(res, err);
    }
  },
  signUp: async (req, res) => {
    try {

      const v = new Validator(req.body, {
        email: "required|email",
        password: "required|minLength:6",
        name: "required",
        userName: "required",
        countryCode: "required",
        phone: "required",
        dateOfBirth: "required",
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const {
        email,
        password,
        name,
        countryCode,
        phone,
        dateOfBirth,
        userName,
        deviceToken,
        deviceType,
        referCode
      } = req.body;

      const loginTime = helper.unixTimestamp();

      const existingUser = await users.findOne({
        where: { email, role: "user" }
      });

      if (existingUser) {
        return helper.failed(res, "Email already exists");
      }

      const existingPhone = await users.findOne({
        where: {
          role: "user",
          [Op.and]: [
            { phone: phone },
            { countryCode: countryCode }
          ]
        }
      });

      if (existingPhone) {
        return helper.failed(res, "Phone already exists");
      }
      const existingUserName = await users.findOne({
        where: {
          role: "user",
          userName: userName
        }
      });

      if (existingUserName) {
        return helper.failed(res, "Username already exists");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Create stripe customer
      const customer = await stripe.customers.create({
        name,
        email,
        phone: `${countryCode}${phone}`,
      });

      let referredByUserId = null;
      if (referCode) {
        const referrer = await users.findOne({ where: { referralCode: referCode } });
        if (!referrer) {
          return helper.failed(res, "Invalid referral code");
        }
        referredByUserId = referrer.id;
      }

      const generatedReferralCode = 'MH' + Math.random().toString(36).substring(2, 8).toUpperCase();

      const user = await users.create({
        countryCode,
        phone,
        email,
        name,
        dateOfBirth,
        userName,
        password: hashedPassword,
        loginTime: loginTime,
        fcmToken: deviceToken,
        deviceType: deviceType,
        customerId: customer.id,
        referralCode: generatedReferralCode,
        referredBy: referredByUserId
      });

      const token = jwt.sign(
        {
          data: {
            id: user.id,
            loginTime
          }
        },
        envfile.crypto_key,
        { expiresIn: "30d" }
      );

      const userData = user.toJSON();
      delete userData.password;

      return helper.success(res, "Signup successful", {
        ...userData,
        token
      });

    } catch (err) {
      console.log(err);
      return helper.error(res, err);
    }
  },
  completeProfile: async (req, res) => {
    try {

      console.log(req.body, "req.body");

      const v = new Validator(req.body, {
        bio: "required",
        profileImage: "required",
        categoryIds: "required",
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      let { bio, profileImage, categoryIds } = req.body;

      // Convert string to array
      if (typeof categoryIds === "string") {
        categoryIds = JSON.parse(categoryIds);
      }
      const user = await users.findOne({
        where: {
          id: req.auth.id,
        },
      });

      if (!user) {
        return helper.failed(res, "User not found");
      }

      let updateData = {
        bio,
        profileImage,
        isProfileComplete: 1, // 0=>Pending,1=>User,2=>Provider
        otp: 1111
      };

      // if (user.phone) {
      //   // Generate 4 digit OTP
      //   const otp = Math.floor(1000 + Math.random() * 9000).toString();
      //   updateData.otp = otp;

      //   // Send OTP using Twilio WhatsApp
      //   try {
      //     const fullPhone = `${user.countryCode || ''}${user.phone}`;
      //     await helper.twillow_code(fullPhone, otp);
      //   } catch (err) {
      //     console.log("Failed to send OTP:", err);
      //   }
      // }

      await user.update(updateData);


      // Remove old categories
      await user_categories.destroy({
        where: { userId: req.auth.id },
      });

      if (Array.isArray(categoryIds) && categoryIds.length > 0) {
        await user_categories.bulkCreate(
          categoryIds.map((categoryId) => ({
            userId: req.auth.id,
            categoryId,
          }))
        );
      }

      const updatedUser = await users.findOne({
        where: { id: req.auth.id },
        attributes: [
          "id",
          "name",
          "email",
          "bio",
          "profileImage",
          "isProfileComplete"
        ]
      });

      // const userCategories = await user_categories.findAll({
      //   where: { userId: req.auth.id },
      //   attributes: ["categoryId"]
      // });

      return helper.success(
        res,
        "Profile completed successfully", updatedUser

      );
    } catch (error) {
      console.log(error);
      return helper.error(res, error);
    }
  },
  completeProfileProvider: async (req, res) => {
    try {


      const v = new Validator(req.body, {
        profileImageProvider: "required",
        about: "required",
        categoryIds: "required",//array
        hourlyPrice: "required",
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      let { about, profileImageProvider, hourlyPrice, categoryIds, portfolio } = req.body;

      // Convert string to array
      if (typeof categoryIds === "string") {
        // categoryIds = JSON.parse(categoryIds);
        categoryIds = categoryIds;

      }
      if (typeof portfolio === "string") {

        // portfolio = JSON.parse(portfolio);
        portfolio = portfolio;

      }

      const user = await users.findOne({
        where: {
          id: req.auth.id,
        },
      });

      if (!user) {
        return helper.failed(res, "User not found");
      }

      let updateData = {
        about,
        isProvider: 1,
        profileImageProvider,
        hourlyPrice,
        isProfileComplete: 2, // 0=>Pending,1=>User,2=>Provider

      };

      await user.update(updateData);


      // Remove old categories
      await provider_categories.destroy({
        where: { providerId: req.auth.id },
      });

      if (Array.isArray(categoryIds) && categoryIds.length > 0) {
        await provider_categories.bulkCreate(
          categoryIds.map((categoryId) => ({
            providerId: req.auth.id,
            categoryId,
          }))
        );
      }

      if (portfolio && portfolio.length > 0) {
        // Remove old portfolios
        await portfolio_images.destroy({
          where: { providerId: req.auth.id },
        });

        await portfolio_images.bulkCreate(
          portfolio.map((image) => ({
            providerId: req.auth.id,
            imageUrl: image,
          }))
        );
      }

      const updatedUser = await users.findOne({
        where: { id: req.auth.id },
        attributes: [
          "id",
          "name",
          "email",
          "profileImageProvider",
          "about",
          "hourlyPrice",
          "isProfileComplete"
        ]
      });

      // const userCategories = await user_categories.findAll({
      //   where: { userId: req.auth.id },
      //   attributes: ["categoryId"]
      // });

      return helper.success(
        res,
        "Profile completed successfully", updatedUser

      );
    } catch (error) {
      console.log(error);
      return helper.error(res, error);
    }
  },
  verifyOtp: async (req, res) => {
    try {

      const v = new Validator(req.body, {
        otp: "required",
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { otp } = req.body;

      const user = await users.findOne({
        where: {
          id: req.auth.id,
        },
      });

      if (!user) {
        return helper.failed(res, "User not found");
      }

      if (user.otp !== otp) {
        return helper.failed(res, "Invalid OTP");
      }

      await user.update({
        otp: null,
        otpVerify: "verified"
      });

      return helper.success(res, "OTP verified successfully");
    } catch (error) {
      console.log(error);
      return helper.error(res, error);
    }
  },
  resendOtp: async (req, res) => {
    try {

      const user = await users.findOne({
        where: {
          id: req.auth.id,
        },
      });

      if (!user) {
        return helper.failed(res, "User not found");
      }

      // Generate new OTP
      // const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const otp = "1111";
      await user.update({
        otp,
        otpVerify: "pending"
      });

      // Send OTP using Twilio WhatsApp
      // try {
      //   const fullPhone = `${user.countryCode || ''}${user.phone}`;
      //   await helper.twillow_code(fullPhone, otp);
      // } catch (err) {
      //   console.log("Failed to send OTP:", err);
      // }

      return helper.success(res, "OTP sent successfully");
    } catch (error) {
      console.log(error);
      return helper.error(res, error);
    }
  },

  logout: async (req, res) => {
    try {
      let time = helper.unixTimestamp();
      const logout = await users.update(
        {
          loginTime: time,
          fcmToken: null
        },
        {
          where: {
            id: req.auth.id,
          },
        }
      );
      return helper.success(res, "Logout Successfully");
    } catch (error) {
      return helper.error(res, error);
    }
  },
  accountDeleted: async (req, res) => {
    try {
      const find_user = await users.findOne({
        where: {
          id: req.auth.id,

        },
        raw: true,
        nest: true,
      });
      if (find_user) {

        let User = users.destroy(

          {
            where: {
              id: req.auth.id,
            },
          }
        );
        return helper.success(res, "Account deleted succesfully!");
      } else {
        return helper.failed(res, "Account not found ");
      }
    } catch (error) {

      return helper.error(res, error);
    }
  },
  /////////
  editProfile: async (req, res) => {
    try {
      console.log(req.body, "EDIT PROFILE BODY");

      const userId = req.auth.id;

      let {
        email,
        phone,
        countryCode,
        name,
        profileImage,
        userName,
        hourlyPrice,
        bio,
        categoryIds
      } = req.body;

      /* =========================
         Parse categoryIds
      ========================= */
      if (categoryIds) {
        try {
          if (typeof categoryIds === "string") {
            categoryIds = JSON.parse(categoryIds);
          }

          if (!Array.isArray(categoryIds)) {
            return helper.failed(res, "categoryIds must be an array");
          }
        } catch (err) {
          return helper.failed(res, "Invalid categoryIds format");
        }
      }

      /* =========================
         Check User Exists
      ========================= */
      const user = await users.findOne({
        where: { id: userId }
      });

      if (!user) {
        return helper.failed(res, "User not found");
      }

      /* =========================
         Email Duplicate Check
      ========================= */
      if (email) {
        const emailExists = await users.findOne({
          where: {
            email,
            id: {
              [Op.ne]: userId
            }
          }
        });

        if (emailExists) {
          return helper.failed(res, "Email already exists");
        }
      }

      /* =========================
         Prepare Update Data
      ========================= */
      const updateData = {};

      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (countryCode) updateData.countryCode = countryCode;
      if (name) updateData.name = name;
      if (userName) updateData.userName = userName;
      if (hourlyPrice) updateData.hourlyPrice = hourlyPrice;
      if (bio) updateData.bio = bio;
      if (profileImage) updateData.profileImage = profileImage;

      /* =========================
         Update User
      ========================= */
      await users.update(updateData, {
        where: { id: userId }
      });

      /* =========================
         Update Categories
      ========================= */
      if (Array.isArray(categoryIds)) {

        if (req.auth.currentMode === "user") {

          await user_categories.destroy({
            where: { userId }
          });

          if (categoryIds.length > 0) {
            await user_categories.bulkCreate(
              categoryIds.map(categoryId => ({
                userId,
                categoryId
              }))
            );
          }

        } else if (req.auth.currentMode === "provider") {

          await provider_categories.destroy({
            where: { providerId: userId }
          });

          if (categoryIds.length > 0) {
            await provider_categories.bulkCreate(
              categoryIds.map(categoryId => ({
                providerId: userId,
                categoryId
              }))
            );
          }
        }
      }

      /* =========================
         Fetch Updated User
      ========================= */
      const updatedUser = await users.findOne({
        where: { id: userId },
        attributes: {
          exclude: ["password", "otp", "withdrawal_fees", "country_fees", "promotional_fee_waivers", "tax_rules", "payout_providers", "admin_commission", "govt_tax", "contact_email", "contact_phone", "supported_currencies"]
        }
      });

      let categoriesData = [];

      if (req.auth.currentMode === "user") {
        categoriesData = await user_categories.findAll({
          where: { userId },
          include: [
            {
              model: services_categories,
              as: "categories",

              attributes: ["id", "categoryName"]
            }]
        });
      } else {
        categoriesData = await provider_categories.findAll({
          where: { providerId: userId },
          include: [
            {
              model: services_categories,
              as: "categories",

              attributes: ["id", "categoryName"]
            }
          ]
        });
      }

      const response = updatedUser.toJSON();
      response.categories = categoriesData;

      return helper.success(
        res,
        "Profile Updated Successfully",
        response
      );

    } catch (error) {
      console.error("EDIT PROFILE ERROR:", error);
      return helper.error(res, error);
    }
  },
  changePassword: async (req, res) => {
    const { id } = req.auth;
    const { oldPassword, newPassword } = req.body;
    try {
      const getuser = await users.findOne({ where: { id } });
      if (!getuser) {
        return helper.failed(res, "user not found");
      }

      if (getuser.loginType !== 'email') {
        return helper.failed(res, "Password change is not applicable for social logins.");
      }

      const isValidPassword = await bcrypt.compare(oldPassword, getuser.password);
      if (!isValidPassword) {

        return helper.failed(res, "Incorrect old password");
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await users.update({ password: hashedPassword }, { where: { id } });
      return helper.success(res, "Password updated successfully");
    } catch (err) {
      console.log(err)
      return helper.error(res, "Something went wrong");

    }
  },
  getProfile: async (req, res) => {
    try {
      const userId = req.query.userId || req.auth.id;

      const user = await users.findOne({
        where: { id: userId },
        attributes: [
          "id",
          "name",
          "email",
          "countryCode",
          "phone",
          "profileImage",
          "profileImageProvider",
          "isNotification",
          "providerStatus",
          "currentMode",
          "status",
          "bio",
          "about",
          "hourlyPrice",
          "referralCode"
        ]
      });

      if (!user) {
        return helper.failed(res, "User not found");
      }

      let categoryData = [];

      if (user.currentMode === "provider") {
        categoryData = await provider_categories.findAll({
          where: { userId: user.id },
          attributes: ["id", "categoryId"],
          include: [
            {
              model: services_categories,
              as: "categories",

              attributes: ["id", "categoryName"]
            }
          ]
        });
      } else {
        categoryData = await user_categories.findAll({
          where: { userId: user.id },
          attributes: ["id", "categoryId"],
          include: [
            {
              model: services_categories,
              as: "categories",
              attributes: ["id", "categoryName"]
            }
          ]
        });
      }

      const obj = user.toJSON();
      obj.categories = categoryData;

      return helper.success(
        res,
        "User Profile retrieved successfully",
        obj
      );

    } catch (error) {
      return helper.error(res, error.message);
    }
  },
  socialLogin: async (req, res) => {
    try {

      console.log(req.body, "SOCIAL LOGIN BODY");

      const v = new Validator(req.body, {
        socialId: "required",
        loginType: "required|in:google,facebook,apple",
      });

      const errorsResponse = await helper.checkValidation(v);

      if (errorsResponse) {
        return helper.failed(res, errorsResponse);
      }

      const {
        socialId,
        loginType,
        email,
        name,
        countryCode,
        phone,
        deviceToken,
        profileImage,
        referCode,
      } = req.body;

      const loginTime = helper.unixTimestamp();

      let isSignup = false;

      const role = "user";

      /* =======================
         Find Existing User
      ======================= */
      let user = await users.findOne({
        where: {
          socialId,
          loginType,
          role,
          deletedAt: null,
        },
      });

      /* =======================
         Block Inactive User
      ======================= */
      if (user && user.status !== "active") {
        return helper.failed(
          res,
          "Your account is not active. Please contact admin."
        );
      }

      /* =======================
         Link Existing Email User
      ======================= */
      if (!user && email) {

        const existingUser = await users.findOne({
          where: {
            email,
            role,
            deletedAt: null,
          },
        });

        if (existingUser) {

          if (existingUser.status !== "active") {
            return helper.failed(
              res,
              "Your account is not active. Please contact admin."
            );
          }

          user = existingUser;

          await user.update({
            socialId,
            loginType,
            loginTime,
            fcmToken: deviceToken,
            ...(profileImage && { profileImage }),
          });
        }
      }

      /* =======================
         Create New User
      ======================= */
      if (!user) {

        isSignup = true;

        let referredByUserId = null;
        if (referCode) {
          const referrer = await users.findOne({ where: { referralCode: referCode } });
          if (!referrer) {
            return helper.failed(res, "Invalid referral code");
          }
          referredByUserId = referrer.id;
        }

        let oldUser = await users.findOne({
          where: {
            socialId,
            loginType,
            role,
          },
          paranoid: false,
        });

        if (!oldUser && email) {
          oldUser = await users.findOne({
            where: {
              email,
              role,
            },
            paranoid: false,
          });
        }

        const finalName = name || oldUser?.name || null;

        const finalEmail = email || oldUser?.email || null;

        const finalImage =
          profileImage ||
          oldUser?.profileImage ||
          null;

        const generatedReferralCode = 'MH' + Math.random().toString(36).substring(2, 8).toUpperCase();

        user = await users.create({
          name: finalName,
          email: finalEmail,
          phone: phone || null,
          countryCode: countryCode || null,
          role,
          profileImage: finalImage,
          socialId,
          loginType,
          loginTime,
          fcmToken: deviceToken,
          status: "active",
          isProfileComplte: 0, // Pending profile completion
          referralCode: generatedReferralCode,
          referredBy: referredByUserId
        });

      } else {

        await user.update({
          loginTime,
          fcmToken: deviceToken,
          ...(profileImage && { profileImage }),
        });
      }

      /* =======================
         Generate Token
      ======================= */
      const token = jwt.sign(
        {
          data: {
            id: user.id,
            loginTime,
          },
        },
        envfile.crypto_key,
        {
          expiresIn: "30d",
        }
      );

      /* =======================
         Refresh User Data
      ======================= */
      user = await users.findOne({
        where: { id: user.id },
      });

      user = user.get({ plain: true });

      delete user.password;
      delete user.otp;

      /* =======================
         Final Response
      ======================= */
      return helper.success(
        res,
        isSignup
          ? "Signup successful"
          : "Login successful",
        {
          ...user,
          token,
          isSignup,
          isProfileComplte: user.isProfileComplte || 0,
        }
      );

    } catch (error) {

      console.error("Social Login Error:", error);

      return helper.error(res, error);
    }
  },

  fileUpload: async (req, res) => {
    try {
      let folder = "users";
      let fileData = null;

      if (req.files && req.files.file) {
        fileData = await helper.fileUpload(req.files.file, folder);
      } else {
        return helper.failed(res, "No file uploaded");
      }

      return helper.success(res, "File uploaded successfully", {
        file: fileData,
      });
    } catch (error) {
      console.log(error);

      return helper.error(res, "Error occurred during file upload");
    }
  },
  ////////
  notificationOnOff: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        isNotification: "required|in:on,off", //0=>off,1=>on
      });

      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) return helper.failed(res, errorsResponse);

      const update = await users.update(req.body, {
        where: {
          id: req.auth.id,
        },
        raw: true,
      });
      let updateduser = await users.findOne({
        where: {
          id: req.auth.id,
        },
        raw: true,
        nest: true,
      });
      updateduser.password = undefined;
      updateduser.otp = undefined;
      return helper.success(res, "Notification setting updated successfully", updateduser);
    }
    catch (error) {
      return helper.error(res, error);
    }
  },

  getCms: async (req, res) => {
    try {
      const pageType = req.query.type;

      const cmsData = await cms.findOne({
        where: { type: pageType },
      });

      if (!cmsData) {
        return helper.failed(res, "CMS page not found");
      }

      return helper.success(res, "CMS page retrieved successfully", cmsData);
    } catch (error) {
      return helper.error(res, error.message);
    }
  },
  contactUs: async (req, res) => {
    const v = new Validator(req.body, {
      name: "required",
      email: "required|email",
      phone: "required",
      message: "required",
    });

    let errorsResponse = await helper.checkValidation(v);
    if (errorsResponse) return helper.failed(res, errorsResponse);
    const user = await users.findOne({
      where: {
        id: req.auth.id,
      },
      raw: true,
      nest: true,
    });
    const supportData = await contact_support.create({
      userId: req.auth.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      message: req.body.message,
    });
    return helper.success(res, "Support request received", supportData);
  },
  notificationList: async (req, res) => {
    try {

      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
      const offset = (page - 1) * limit;

      const whereCondition = {
        userId: req.auth.id,

      };

      const { count, rows } = await notifications.findAndCountAll({
        where: whereCondition,

        order: [["createdAt", "DESC"]],
        limit,
        offset,
        distinct: true // 🔥 important when using include
      });

      return helper.success(
        res,
        "Notifications list fetched successfully",
        {
          total: count,
          page,
          limit,
          total_pages: Math.ceil(count / limit),
          data: rows
        }
      );

    } catch (error) {
      console.error("Error in notifications_list:", error);
      return helper.error(res, error.message || "Internal server error");
    }
  },
  clearNotification: async (req, res) => {
    try {

      await notifications.destroy({
        where: {
          userId: req.auth.id
        }
      });

      return helper.success(res, "Notification deleted");

    } catch (error) {
      console.log(error);
      return helper.error(res, error);
    }
  },
  forgotPassword: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        email: "required|email",
      });

      const errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) return helper.failed(res, errorsResponse);

      const { email } = req.body;

      const user = await users.findOne({ where: { email } });
      if (!user) {
        return helper.failed(res, "Email not registered");
      }

      // 🔹 Generate token
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = moment().add(30, "minutes").toDate();

      // 🔹 Save token
      await users.update(
        {
          resetToken: token,
          resetTokenExpiry: expiry
        },
        { where: { id: user.id } }
      );

      // 🔹 Reset password link
      const resetLink = `${envfile.BASE_URL}resetPasswordPage?token=${token}`;

      const emailSubject = "Reset Your Muulahub Account Password";

      const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0"
          style="max-width:600px;background:#ffffff;border-radius:8px;
          box-shadow:0 4px 12px rgba(0,0,0,0.1);padding:30px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <h2 style="color:#2c3e50;margin:0;">Muulahub</h2>
              <p style="color:#888;margin-top:5px;">Secure Account Access</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="color:#333;font-size:15px;line-height:1.6;">
              <p>Hello <strong>${user.name || "User"}</strong>,</p>

              <p>
                We received a request to reset your password for your
                Muulahub account. Click the button below to set a new password.
              </p>

              <p style="text-align:center;margin:30px 0;">
                <a href="${resetLink}"
                  style="background:#4F46E5;color:#ffffff;text-decoration:none;
                  padding:14px 28px;border-radius:6px;font-weight:bold;
                  display:inline-block;">
                  Reset Password
                </a>
              </p>

              <p>
                This password reset link will expire in
                <strong>30 minutes</strong>.
              </p>

              <p>
                If you did not request a password reset, please ignore this
                email or contact our support team.
              </p>

              <p style="margin-top:30px;">
                Regards,<br/>
                <strong>Muulahub Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:20px;color:#999;font-size:12px;">
              © ${new Date().getFullYear()} Muulahub. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;


      await helper.sendEmail(email, emailSubject, emailBody);
      return helper.success(
        res,
        "Password reset link sent to your registered email"
      );

    } catch (error) {
      console.error(error);
      return helper.error(res, error);
    }
  },
  resetPasswordPage: async (req, res) => {
    try {
      let token = req.query.token

      res.render("reset_password", { token });

    } catch (err) {
      console.error(err);
      res.render("reset-password", {
        error: "Something went wrong. Please try again."
      });
    }
  },
  resetPassword: async (req, res) => {
    try {

      const v = new Validator(req.body, {
        token: "required",
        password: "required",
      });

      const errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) return helper.failed(res, errorsResponse);

      const { token, password } = req.body;

      const user = await users.findOne({
        where: {
          resetToken: token,
          resetTokenExpiry: { [Op.gt]: new Date() }
        }
      });

      if (!user) {
        res.render("expired", {});
      }

      // 🔹 Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 🔹 Update password
      await users.update(
        {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        },
        { where: { id: user.id } }
      );
      res.render("sucess", {});

    } catch (error) {
      console.error(error);
      return helper.error(res, error);
    }
  },
  categoryList: async (req, res) => {
    try {
      const categories = await services_categories.findAll({
        where: { status: 1 },
        order: [['categoryName', 'ASC']]
      });
      return helper.success(res, 'Categories fetched', categories);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

};
