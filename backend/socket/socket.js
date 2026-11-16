
const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const { users, rooms, chats, reports, block_users, deleted_chats } = require("../models");
const helper = require("../helpers/helper");
const Sequelize = require('sequelize');
const middleware = require('../middleware/authMiddleware');
const envfile = process.env;
//  >>>>>>>>>>>>>>>>>>>   Audios /Viedos Call All Datials  <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< //
// const { RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole, } = require("agora-token");

// const appID = envfile.APP_ID
// const appCertificate = envfile.APP_CERTIFICATE

// async function generateRandomString(length) {
//   var characters =
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   var result = "";
//   var charactersLength = characters.length;

//   for (var i = 0; i < length; i++) {
//     var randomIndex = Math.floor(Math.random() * charactersLength);
//     result += characters.charAt(randomIndex);
//   }

//   return result;
// }

//  >>>>>>>>>>>>>>>>>>>   Audios /Viedos Call All Datials  <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< //

module.exports = function (io) {

  io.on('connection', function (socket) {
    socket.on('connectUser', async (data) => {
      try {

        const isValidToken = await middleware.authenticateToken(data.token);

        if (!isValidToken.success) {
          socket.emit("connectUser", {
            code: 401,
            message: "Session Expired",
          });
          return;
        }

        let userId = isValidToken.user.id;
        let socketId = socket.id;

        let check_user = await users.findOne({
          where: {
            id: userId,
          }
        });

        if (check_user) {
          await users.update({
            isOnline: "online",
            socketId,
          }, {
            where: {
              id: userId,
            }
          });
          socket.emit('connectUser', {
            code: 200,
            message: 'User connected successfully',
            body: {}
          });
        } else {
          socket.emit("connectUser", {
            code: 404,
            message: "User not found",
            body: {}
          });
        }

      } catch (error) {
        // Catch and emit internal server error status code 500
        socket.emit("connectUser", {
          code: 500,
          message: "Internal Server Error",
        });
        console.error(error);
      }
    });

    socket.on('disconnect', async (reason) => {
      try {
        const socketId = socket.id;

        let updatedata = await users.update(
          { isOnline: "offline" },
          {
            where: {
              socketId,
            },
          }
        );
        console.log(`User offline, socketId: ${socketId}, reason: ${reason}`)

        if (socket.activeLiveChannel) {
          const ch = socket.activeLiveChannel;
          socket.leave(ch);
          const roomSize = io.sockets.adapter.rooms.get(ch)?.size || 0;
          io.to(ch).emit('userLeftLiveStream', {
            channelName: ch,
            userId: socket.liveUser ? socket.liveUser.id : 0,
            viewerCount: roomSize
          });
        }

      } catch (error) {
        console.error('Error during disconnection:', error);
      }
    });

    socket.on('sendMessage', async (get_data) => {
      try {
        const isValidToken = await middleware.authenticateToken(get_data.token);

        if (!isValidToken.success) {
          socket.emit("sendMessage", {
            code: 401,
            body: "Session Expired",
          });
          return;
        }

        const senderId = isValidToken.user.id;

        let roomWhere = {
          [Op.or]: [
            { senderId: senderId, receiverId: get_data.receiverId },
            { senderId: get_data.receiverId, receiverId: senderId }
          ]
        };

        if (get_data.bookingId) {
          roomWhere.bookingId = get_data.bookingId;
        }

        const findConstant = await rooms.findOne({
          where: roomWhere,
          raw: true
        });

        let createMessage;

        if (findConstant) {

          createMessage = await chats.create({
            senderId: senderId,
            roomId: findConstant.id,
            receiverId: get_data.receiverId,
            message: get_data.message,
            messageType: get_data.messageType,
            bookingId: get_data.bookingId || null,
          });

          await rooms.update(
            { lastMsgId: createMessage.id },
            { where: { id: findConstant.id } }
          );

        } else {

          const createConstant = await rooms.create({
            senderId: senderId,
            receiverId: get_data.receiverId,
            bookingId: get_data.bookingId || null,
          });


          createMessage = await chats.create({
            senderId: senderId,
            receiverId: get_data.receiverId,
            roomId: createConstant.id,
            message: get_data.message,
            messageType: get_data.messageType,
            bookingId: get_data.bookingId || null,
          });

          await rooms.update(
            { lastMsgId: createMessage.id },
            { where: { id: createConstant.id } }
          );
        }


        const senderName = [Sequelize.literal(`(SELECT name FROM users WHERE users.id = sender_user_id)`), 'senderName'];
        const senderImage = [Sequelize.literal(`(SELECT profileImage FROM users WHERE users.id = sender_user_id)`), 'senderImage'];
        const receiverName = [Sequelize.literal(`(SELECT name FROM users WHERE users.id = receiver_user_id)`), 'receiverName'];
        const receiverImage = [Sequelize.literal(`(SELECT profileImage FROM users WHERE users.id = receiver_user_id)`), 'receiverImage'];

        const isBlockedByOther = await block_users.findOne({
          where: {
            blockBy: get_data.receiverId,
            blockTo: senderId
          }
        });


        const message = await chats.findOne({
          attributes: {
            include: [[Sequelize.literal(`CASE WHEN chats.receiverId = ${get_data.receiverId} THEN chats.senderId ELSE chats.receiverId END`), 'sender_user_id'],
            [Sequelize.literal(`CASE WHEN chats.senderId = ${senderId} THEN chats.receiverId ELSE chats.senderId END`), 'receiver_user_id'],
              senderName,
              senderImage,
              receiverName,
              receiverImage
            ]
          },
          where: { id: createMessage.id }
        });
        if (isBlockedByOther) {
          await deleted_chats.create({
            chatId: createMessage.id,          // ✅ IMPORTANT
            deletedBy: get_data.receiverId    // deleted for receiver
          });

          // ✅ Send only to sender
          socket.emit('sendMessage', {
            success_message: 'Message sent successfully',
            code: 200,
            body: message
          });

          return; // ❌ STOP HERE (do not send to receiver)
        }



        const successMessage = {
          success_message: 'Message sent successfully',
          code: 200,
          body: message
        };



        const findSender = await users.findOne({
          where: { id: senderId },
          raw: true
        });
        const findReceiver = await users.findOne({
          where: { id: get_data.receiverId },
          raw: true
        });
        if (findReceiver && findReceiver.isNotification !== "off" && findReceiver.deviceToken) {
          const pushTitle = findSender ? findSender.name : "Muulahub";
          let pushBody = "You received a new message";
          if (get_data.messageType === 'image') {
            pushBody = "Sent an image";
          } else if (get_data.messageType === 'audio') {
            pushBody = "Sent an audio message";
          } else if (get_data.message && String(get_data.message).trim() !== '') {
            pushBody = String(get_data.message);
          }

          const ndata = {
            token: findReceiver.deviceToken,
            title: pushTitle,
            body: pushBody,
            msg: pushBody,
            message: pushBody,
            bookingId: get_data.bookingId || '',
            roomId: createMessage ? createMessage.roomId : '',
            msg_type: get_data.messageType || 'text',
            sender_id: senderId,
            sender_name: findSender ? findSender.name : '',
            sender_image: findSender ? findSender.profileImage : '',
            type: 'chat'
          };

          console.log("Chat push sent to receiver:", get_data.receiverId);

          helper.sendPushNotification(ndata);

        } else {
          console.log("Notification turned off or no deviceToken for receiver:", get_data.receiverId);
        }
        /* ------------------ WHERE CONDITION ------------------ */

        socket.emit('sendMessage', successMessage);

        io.to(findReceiver.socketId).emit('sendMessage', successMessage);
        io.to(findReceiver.socketId).emit('message_alert', successMessage);

      } catch (error) {
        console.log(error);
      }
    });

    socket.on('inbox', async (get_data) => {
      try {

        const isValidToken = await middleware.authenticateToken(get_data.token);

        if (!isValidToken.success) {
          socket.emit("inbox", {
            code: 401,
            body: "Session Expired",
          });
          return;
        }

        const senderId = isValidToken.user.id;

        // pagination
        const page = parseInt(get_data.page) || 1;
        const limit = parseInt(get_data.limit) || 10;
        const offset = (page - 1) * limit;

        const lastMsgId = [Sequelize.literal(`(SELECT message FROM chats WHERE chats.id = rooms.lastMsgId)`), "lastMsgId"];
        const receiverUserIdLiteral = `CASE WHEN rooms.receiverId = ${senderId} THEN rooms.senderId ELSE rooms.receiverId END`;
        const receiverName = [Sequelize.literal(`(SELECT name FROM users WHERE users.id = ${receiverUserIdLiteral})`), 'receiverName'];
        const imgquery = [Sequelize.literal(`(SELECT profileImage FROM users WHERE users.id = ${receiverUserIdLiteral})`), 'receiverImage'];
        const unread_msg = [Sequelize.literal(`(SELECT COUNT(*) FROM chats WHERE chats.roomId = rooms.id AND chats.receiverId = ${senderId} AND chats.isRead = '0')`), 'unread_msg'];
        const lastMsgTime = [Sequelize.literal(`(SELECT createdAt FROM chats WHERE chats.roomId = rooms.id ORDER BY id DESC LIMIT 1)`), 'createdAt_time'];
        const categoryName = [Sequelize.literal(`(SELECT categoryName FROM services_categories WHERE id = (SELECT serviceId FROM bookings WHERE id = rooms.bookingId))`), 'categoryName'];
        const bookingStatus = [Sequelize.literal(`(SELECT bookingStatus FROM bookings WHERE id = rooms.bookingId)`), 'bookingStatus'];

        /* ------------------ MAIN QUERY ------------------ */
        const { count, rows } = await rooms.findAndCountAll({
          attributes: {
            include: [lastMsgTime, unread_msg, lastMsgId, receiverName, imgquery, categoryName, bookingStatus]
          },
          where: {
            [Op.or]: [{ senderId: senderId }, { receiverId: senderId }
            ]
          },
          order: [[Sequelize.literal('createdAt_time'), 'DESC']],
          limit,
          offset,
          raw: true
        });

        const success_message = {
          success_message: 'Chat inbox listing get successfully',
          code: 200,
          pagination: {
            total: count,
            total_pages: Math.ceil(count / limit),
            current_page: page,
            limit: limit
          },
          body: rows
        };

        socket.emit('inbox', success_message);

      } catch (error) {
        console.error(error);
        socket.emit('inbox', {
          code: 500,
          message: "Internal Server Error"
        });
      }
    });

    socket.on('getMessages', async (get_data) => {
      try {
        const isValidToken = await middleware.authenticateToken(get_data.token);

        if (!isValidToken.success) {
          socket.emit("getMessages", {
            code: 401,
            body: "Session Expired",
          });
          return;
        }

        const senderId = isValidToken.user.id;

        /* ------------------ Pagination ------------------ */
        const page = parseInt(get_data.page) || 1;
        const limit = parseInt(get_data.limit) || 20;
        const offset = (page - 1) * limit;

        /* ------------------ Sub Queries ------------------ */
        const senderName = [Sequelize.literal(`(SELECT name FROM users WHERE users.id = sender_user_id)`), 'senderName'];
        const senderImage = [Sequelize.literal(`(SELECT profileImage FROM users WHERE users.id = sender_user_id)`), 'senderImage'];
        const receiverName = [Sequelize.literal(`(SELECT name FROM users WHERE users.id = receiver_user_id)`), 'receiverName'];
        const receiverImage = [Sequelize.literal(`(SELECT profileImage FROM users WHERE users.id = receiver_user_id)`), 'receiverImage'];

        /* ------------------ WHERE CONDITION ------------------ */
        const whereCondition = {
          [Op.and]: [
            {
              [Op.or]: [
                {
                  senderId: senderId,
                  receiverId: get_data.receiverId,

                },
                {
                  senderId: get_data.receiverId,
                  receiverId: senderId,

                }
              ]
            },

            // ❌ Exclude deleted messages for this user
            Sequelize.literal(`NOT EXISTS (SELECT 1 FROM deleted_chats WHERE deleted_chats.chatId = chats.id AND deleted_chats.deletedBy = ${senderId})`)
          ]
        };

        if (get_data.bookingId) {
          whereCondition[Op.and].push({ bookingId: get_data.bookingId });
        }

        /* ------------------ COUNT (for pagination) ------------------ */
        const totalMessages = await chats.count({
          where: whereCondition
        });

        /* ------------------ FETCH MESSAGES ------------------ */
        const allMsg = await chats.findAll({
          where: whereCondition,
          order: [['id', 'DESC']], // latest first
          limit,
          offset,
          attributes: {
            include: [[Sequelize.literal(`CASE WHEN chats.receiverId = ${get_data.receiverId} THEN chats.senderId ELSE chats.receiverId END`), 'sender_user_id'],
            [Sequelize.literal(`CASE WHEN chats.senderId = ${senderId} THEN chats.receiverId ELSE chats.senderId END`), 'receiver_user_id'],
              senderName,
              senderImage,
              receiverName,
              receiverImage
            ]
          }
        });

        const isBlockedByMe = await block_users.findOne({
          where: {
            blockBy: senderId,
            blockTo: get_data.receiverId
          }
        });
        const isBlockedByOther = await block_users.findOne({
          where: {
            blockTo: senderId,
            blockBy: get_data.receiverId
          }
        });
        const blockByMe = isBlockedByMe ? 1 : 0;
        const blockByOther = isBlockedByOther ? 1 : 0;

        /* ------------------ RESPONSE ------------------ */
        socket.emit('getMessages', {
          success_message: 'Messages Listing',
          code: 200,
          pagination: {
            total: totalMessages,
            page,
            limit,
            total_pages: Math.ceil(totalMessages / limit),
            blockByMe: blockByMe,
            blockByOther: blockByOther
          },
          body: allMsg
        });

      } catch (error) {
        console.log(error);
        socket.emit('getMessages', {
          code: 500,
          message: 'Something went wrong'
        });
      }
    });
    // //////////////////////////
    socket.on('readMsg', async (data) => {
      try {
        const isValidToken = await middleware.authenticateToken(data.token);

        if (!isValidToken.success) {
          socket.emit("chat_list", {
            code: 401,
            body: "Session Expired",
          });
          return;
        }

        const senderId = isValidToken.user.id;

        let updateWhere = {
          senderId: data.receiverId,
          receiverId: senderId,
        };

        if (data.bookingId) {
          updateWhere.bookingId = data.bookingId;
        }

        let update_read_status = await chats.update({
          isRead: 1
        }, {
          where: updateWhere
        })

        success_message = {
          success_message: "message read successfully",
        };
        socket.emit("readMsg", success_message);
      } catch (error) {
        console.log(error, "Kerorroororoor");
      }

    });

    socket.on('blockUser', async (data) => {
      try {
        const isValidToken = await middleware.authenticateToken(data.token);

        if (!isValidToken.success) {
          socket.emit("blockUser", {
            code: 401,
            body: "Session Expired",
          });
          return;
        }

        const blockBy = isValidToken.user.id;

        const { blockTo } = data;
        let msg = '';
        let data1 = {};

        if (blockTo === blockBy) {
          msg = "Cannot block yourself";
          socket.emit("blockUser", { success_message: { msg } });
          return;
        }

        const userToBlock = await users.findByPk(blockTo);

        if (!userToBlock) {

          msg = "User to be blocked does not exist";
          socket.emit("blockUser", { success_message: { msg } });
          return;
        }

        const existingBlock = await block_users.findOne({ where: { blockTo, blockBy } });
        let isBlocked = false;

        if (existingBlock) {
          await block_users.destroy({ where: { blockTo, blockBy } });
          msg = "User unblocked successfully";
          data1 = { blockByMe: 0, blockByOther: 0 };
          isBlocked = false;
        } else {
          await block_users.create({ blockTo, blockBy });
          msg = "User blocked successfully";
          data1 = { blockByMe: 1, blockByOther: 0 };
          isBlocked = true;
        }

        const socketUser = await users.findOne({ where: { id: blockTo }, raw: true });


        if (socketUser) {
          const notificationData = isBlocked ? { blockByMe: 0, blockByOther: 1 } : { blockByMe: 0, blockByOther: 0 };

          io.to(socketUser.socketId).emit('blockUser', { success_message: { msg, data1: notificationData } });
        }

        // Notify the blocking/unblocking user
        socket.emit("blockUser", { success_message: { msg, data1 } });

      } catch (error) {
        console.error(error);
        socket.emit('blockUser', { error: error.message || "An error occurred while processing the request." });
      }
    });
    socket.on('clearChat', async (get_data) => {
      try {
        const isValidToken = await middleware.authenticateToken(get_data.token);

        if (!isValidToken.success) {
          socket.emit("clearChat", {
            code: 401,
            message: "Session Expired"
          });
          return;
        }

        const user_id = isValidToken.user.id;

        /* ------------------ FIND ROOM ------------------ */
        const room = await rooms.findOne({
          where: {
            id: get_data.roomId

          }
        });

        if (!room) {
          socket.emit('clearChat', {
            code: 404,
            message: "Chat room not found"
          });
          return;
        }

        /* ------------------ GET ONLY NON-DELETED MESSAGES ------------------ */
        const chatIds = await chats.findAll({
          where: {
            roomId: room.id,
            [Op.and]: [
              Sequelize.literal(`
                NOT EXISTS (
                  SELECT 1 
                  FROM deleted_chats 
                  WHERE deleted_chats.chatId = chats.id
                  AND deleted_chats.deletedBy = ${user_id}
                )
              `)
            ]
          },
          attributes: ['id'],
          raw: true
        });

        if (!chatIds.length) {
          socket.emit('clearChat', {
            code: 200,
            message: "Chat already cleared"
          });
          return;
        }

        /* ------------------ PREPARE BULK DELETE ------------------ */
        const deleteData = chatIds.map(item => ({
          chatId: item.id,
          deletedBy: user_id
        }));

        /* ------------------ INSERT ------------------ */
        await deleted_chats.bulkCreate(deleteData);

        /* ------------------ RESPONSE ------------------ */
        socket.emit('clearChat', {
          code: 200,
          message: "Chat cleared successfully"
        });

      } catch (error) {
        console.error(error);
        socket.emit('clearChat', {
          code: 500,
          message: "Something went wrong"
        });
      }
    });

    /* ==========================================================================
       LIVE STREAMING REAL-TIME CHAT & REACTIONS (SOCKET.IO)
       ========================================================================== */

    // Helper to resolve user details from token or userId
    async function resolveLiveUser(data) {
      if (data && data.token) {
        try {
          const authRes = await middleware.authenticateToken(data.token);
          if (authRes && authRes.success && authRes.user) {
            return authRes.user;
          }
        } catch (_) { }
      }
      const rawUserId = data && (data.userId || data.senderId);
      if (rawUserId) {
        try {
          const u = await users.findOne({
            where: { id: rawUserId },
            attributes: ['id', 'name', 'profileImage'],
            raw: true
          });
          if (u) return u;
        } catch (_) { }
      }
      return {
        id: rawUserId || 0,
        name: (data && (data.userName || data.senderName)) || 'Viewer',
        profileImage: (data && data.senderImage) || ''
      };
    }

    // 1. Join Channel / Live Room
    const handleJoinChannel = async (data) => {
      try {
        const channel = data && (data.channelId || data.channelName || data.channel || data.eventId);
        const channelName = String(channel || '').trim();
        if (!channelName) return;

        socket.join(channelName);
        socket.activeLiveChannel = channelName;

        const liveUser = await resolveLiveUser(data);
        socket.liveUser = liveUser;

        const roomSize = io.sockets.adapter.rooms.get(channelName)?.size || 1;

        // Notify room
        const joinPayload = {
          channelId: channelName,
          channelName: channelName,
          user: {
            id: liveUser.id,
            name: liveUser.name,
            profileImage: liveUser.profileImage
          },
          viewerCount: roomSize
        };
        socket.to(channelName).emit('userJoinedLiveStream', joinPayload);
        socket.to(channelName).emit('userJoinedChannel', joinPayload);

        // Acknowledge to joining user
        const ackPayload = {
          code: 200,
          channelId: channelName,
          channelName: channelName,
          viewerCount: roomSize
        };
        socket.emit('liveStreamJoined', ackPayload);
        socket.emit('channelJoined', ackPayload);

      } catch (err) {
        console.error('[Socket Live] Error in joinChannel:', err);
      }
    };
    socket.on('joinLiveStream', handleJoinChannel);
    socket.on('joinChannel', handleJoinChannel);

    // 2. Send Real-Time Message to Channel
    const handleSendMessage = async (data) => {
      try {
        const channel = data && (data.channelId || data.channelName || data.channel || socket.activeLiveChannel);
        const channelName = String(channel || '').trim();
        if (!channelName) {
          socket.emit('sendMessageError', { message: 'channelId is required' });
          return;
        }

        const messageText = data && (data.message || data.text || data.comment);
        if (!messageText || String(messageText).trim() === '') {
          return;
        }

        const liveUser = socket.liveUser || await resolveLiveUser(data);

        const commentPayload = {
          id: uuidv4(),
          channelId: channelName,
          channelName: channelName,
          userId: liveUser.id,
          userName: liveUser.name || 'Viewer',
          userImage: liveUser.profileImage || '',
          senderId: liveUser.id,
          senderName: liveUser.name || 'Viewer',
          senderImage: liveUser.profileImage || '',
          message: String(messageText).trim(),
          type: (data && data.type) || 'text',
          createdAt: new Date().toISOString()
        };

        console.log(`💬 [Socket Live] Message in ${channelName} from ${commentPayload.userName}: "${commentPayload.message}"`);

        // Broadcast to EVERYONE in the channel (including sender)
        io.to(channelName).emit('receiveChannelMessage', commentPayload);
        io.to(channelName).emit('channelMessage', commentPayload);
        io.to(channelName).emit('newLiveMessage', commentPayload);
        io.to(channelName).emit('newLiveComment', commentPayload);

      } catch (err) {
        console.error('[Socket Live] Error in sendChannelMessage:', err);
      }
    };
    socket.on('sendLiveMessage', handleSendMessage);
    socket.on('sendChannelMessage', handleSendMessage);

    // 3. Send Live Stream Reaction (e.g. Heart / Like / Gift)
    socket.on('sendLiveReaction', async (data) => {
      try {
        const channelName = data && (data.channelName || data.channel || socket.activeLiveChannel);
        if (!channelName) return;

        const liveUser = socket.liveUser || await resolveLiveUser(data);
        const reactionType = (data && (data.reaction || data.type)) || 'heart';

        const reactionPayload = {
          channelName: channelName,
          senderId: liveUser.id,
          senderName: liveUser.name || 'Viewer',
          reaction: reactionType,
          createdAt: new Date().toISOString()
        };

        console.log(`❤️ [Socket Live] Reaction in ${channelName} from ${reactionPayload.senderName}: ${reactionType}`);

        // Broadcast reaction to room
        io.to(channelName).emit('newLiveReaction', reactionPayload);

      } catch (err) {
        console.error('[Socket Live] Error in sendLiveReaction:', err);
      }
    });

    // 4. Leave Channel / Live Room
    const handleLeaveChannel = async (data) => {
      try {
        const channel = (data && (data.channelId || data.channelName || data.channel)) || socket.activeLiveChannel;
        const channelName = String(channel || '').trim();
        if (!channelName) return;

        socket.leave(channelName);
        const liveUser = socket.liveUser || await resolveLiveUser(data);
        const roomSize = io.sockets.adapter.rooms.get(channelName)?.size || 0;

        console.log(`👋 [Socket Live] User ${liveUser.id} left room: ${channelName}. Remaining: ${roomSize}`);

        const leavePayload = {
          channelId: channelName,
          channelName: channelName,
          userId: liveUser.id,
          viewerCount: roomSize
        };
        io.to(channelName).emit('userLeftLiveStream', leavePayload);
        io.to(channelName).emit('userLeftChannel', leavePayload);

        if (socket.activeLiveChannel === channelName) {
          socket.activeLiveChannel = null;
        }

      } catch (err) {
        console.error('[Socket Live] Error in leaveChannel:', err);
      }
    };
    socket.on('leaveLiveStream', handleLeaveChannel);
    socket.on('leaveChannel', handleLeaveChannel);

    // 5. Get Active Viewers in Room
    const handleGetViewers = async (data) => {
      try {
        const channel = data.channelName
        const channelName = String(channel || '').trim();
        if (!channelName) return;

        const sockets = await io.in(channelName).fetchSockets();
        const viewers = sockets.map(s => s.liveUser || { id: 0, name: 'Viewer', profileImage: '' });

        const payload = {
          channelId: channelName,
          channelName: channelName,
          viewerCount: sockets.length,
          viewers: viewers
        };

        socket.emit('getViewers', payload);
        socket.emit('channelViewers', payload);
      } catch (err) {
        console.error('[Socket Live] Error in getViewers:', err);
      }
    };
    socket.on('getViewers', handleGetViewers);
    socket.on('getLiveViewers', handleGetViewers);

  });


};
