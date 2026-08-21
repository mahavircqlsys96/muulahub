const helper = require('../../helpers/helper');
const mux = require('../../config/mux');
const db = require('../../models');
const MuxVideos = db.mux_videos;
const Mux = require('@mux/mux-node');

module.exports = {
  createUpload: async (req, res) => {
    try {
      const userId = req.auth.id;

      // Step 1: Create DB record
      const newVideo = await MuxVideos.create({
        userId: userId,
        status: 'waiting'
      });

      // Step 2: Create Mux Direct Upload
      const upload = await mux.video.uploads.create({
        new_asset_settings: {
          playback_policies: ['public'],
          passthrough: String(newVideo.id),
        },
        cors_origin: '*',
      });

      // Step 3: Save the returned Mux upload ID
      await newVideo.update({
        mux_upload_id: upload.id
      });

      return helper.success(res, "Upload URL created successfully", {
        video_id: newVideo.id,
        mux_upload_id: upload.id,
        upload_url: upload.url
      });

    } catch (error) {
      console.error("Mux Create Upload Error:", error);
      return helper.error(res, "Failed to create upload URL", error.message);
    }
  },

  webhook: async (req, res) => {
    try {
      const signature = req.headers['mux-signature'];
      if (!signature) {
        return helper.failed(res, "Missing signature", {}, 401);
      }

      const webhookSecret = process.env.MUX_WEBHOOK_SECRET;

      let event;
      try {
        // req.rawBody was populated by our express.json middleware
        event = Mux.Webhooks.verifySignature(req.rawBody, signature, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return helper.failed(res, "Invalid signature", {}, 400);
      }

      const { type, data } = event;

      // Ensure we have a passthrough to identify the record
      const videoId = data.passthrough || (data.new_asset_settings && data.new_asset_settings.passthrough);

      if (!videoId) {
        // If there's no passthrough, we can't link it to our DB.
        return res.status(200).send("No passthrough, ignored.");
      }

      const video = await MuxVideos.findByPk(videoId);
      if (!video) {
        return res.status(200).send("Video not found, ignored.");
      }

      switch (type) {
        case 'video.upload.asset_created':
          await video.update({
            mux_asset_id: data.asset_id,
            status: 'processing'
          });
          break;

        case 'video.asset.ready':
          // Extract playback ID
          let playbackId = null;
          if (data.playback_ids && data.playback_ids.length > 0) {
            playbackId = data.playback_ids[0].id;
          }

          await video.update({
            mux_asset_id: data.id,
            mux_playback_id: playbackId,
            status: 'ready'
          });
          break;

        case 'video.asset.errored':
          await video.update({
            status: 'errored'
          });
          break;

        default:
          // Ignore other events
          break;
      }

      // Return 200 OK so Mux knows we received it
      return res.status(200).send("Webhook received");

    } catch (error) {
      console.error("Mux Webhook Error:", error);
      return res.status(500).send("Webhook Error");
    }
  },

  getVideoDetails: async (req, res) => {
    try {
      const { id } = req.params;

      const video = await MuxVideos.findByPk(id);

      if (!video) {
        return helper.failed(res, "Video not found", {}, 404);
      }

      let video_url = null;
      let thumbnail = null;

      if (video.status === 'ready' && video.mux_playback_id) {
        video_url = `https://stream.mux.com/${video.mux_playback_id}.m3u8`;
        thumbnail = `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg`;
      }

      return helper.success(res, "Video details fetched successfully", {
        id: video.id,
        status: video.status,
        mux_asset_id: video.mux_asset_id,
        mux_playback_id: video.mux_playback_id,
        video_url: video_url,
        thumbnail: thumbnail
      });

    } catch (error) {
      console.error("Mux Video Details Error:", error);
      return helper.error(res, "Failed to get video details", error.message);
    }
  }
};
