const https = require('https');
const helper = require('./helper');

/**
 * Agora Cloud Recording Service configured for AWS S3 Storage
 * Stores recordings directly in the AWS S3 bucket: muulahublive
 */

const AWS_S3_REGION_CODES = {
  'us-east-1': 0,
  'us-east-2': 1,
  'us-west-1': 2,
  'us-west-2': 3,
  'eu-west-1': 4,
  'eu-west-2': 5,
  'eu-west-3': 6,
  'eu-central-1': 7,
  'ap-southeast-1': 8,
  'ap-southeast-2': 9,
  'ap-northeast-1': 10,
  'ap-northeast-2': 11,
  'sa-east-1': 12,
  'ca-central-1': 13,
  'ap-south-1': 14,
};

class AgoraRecordingService {
  constructor() {
    this.apiHost = 'api.agora.io';
  }

  getCredentials() {
    const env = process.env;
    const appId = String(env.AGORA_APP_ID || '35e33cd325614d06a51b1e02628599d4').replace(/['"]/g, '').trim();
    let appCertificate = String(env.AGORA_APP_CERTIFICATE || 'e211879925b14332b4c77d63578b5763').replace(/['"]/g, '').trim();
    if (appCertificate.length === 33 && appCertificate.endsWith('A')) {
      appCertificate = appCertificate.slice(0, 32);
    }
    const customerId = (env.AGORA_CUSTOMER_ID || env.AGORA_CUSTOMER_KEY || '').trim();
    const customerSecret = (env.AGORA_CUSTOMER_SECRET || '').trim();

    const awsAccessKey = (env.AWS_ACCESS_KEY_ID || '').trim();
    const awsSecretKey = (env.AWS_SECRET_ACCESS_KEY || '').trim();
    const awsRegion = (env.AWS_REGION || 'us-east-1').trim().toLowerCase();
    const awsBucket = (env.AWS_S3_BUCKET_NAME || 'muulahublive').trim();

    return {
      appId,
      appCertificate,
      customerId,
      customerSecret,
      awsAccessKey,
      awsSecretKey,
      awsRegion,
      awsBucket,
      awsRegionCode: AWS_S3_REGION_CODES[awsRegion] !== undefined ? AWS_S3_REGION_CODES[awsRegion] : 0
    };
  }

  isConfigured() {
    const creds = this.getCredentials();
    return !!(
      creds.appId &&
      creds.customerId &&
      creds.customerSecret &&
      creds.awsAccessKey &&
      creds.awsSecretKey &&
      creds.awsBucket
    );
  }

  hasAwsConfigured() {
    const creds = this.getCredentials();
    return !!(creds.awsAccessKey && creds.awsSecretKey && creds.awsBucket);
  }

  request(method, path, body = null) {
    const creds = this.getCredentials();
    const basicAuth = Buffer.from(`${creds.customerId}:${creds.customerSecret}`).toString('base64');

    return new Promise((resolve, reject) => {
      const payloadStr = body ? JSON.stringify(body) : null;
      const headers = {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      };
      if (payloadStr) {
        headers['Content-Length'] = Buffer.byteLength(payloadStr);
      }

      const options = {
        hostname: this.apiHost,
        path: path,
        method: method,
        headers: headers,
        timeout: 15000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.message || `Agora API error (${res.statusCode}): ${data}`));
            }
          } catch (e) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ raw: data });
            } else {
              reject(new Error(`Agora API HTTP ${res.statusCode}: ${data}`));
            }
          }
        });
      });

      req.on('error', err => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Agora API request timed out'));
      });

      if (payloadStr) {
        req.write(payloadStr);
      }
      req.end();
    });
  }

  /**
   * 1. Acquire resourceId for recording
   */
  async acquire(channelName, recordingUid) {
    const creds = this.getCredentials();
    const path = `/v1/apps/${creds.appId}/cloud_recording/acquire`;
    const body = {
      cname: channelName,
      uid: String(recordingUid),
      clientRequest: {
        resourceExpiredHour: 24,
        scene: 0
      }
    };
    const res = await this.request('POST', path, body);
    return res.resourceId;
  }

  /**
   * 2. Start Cloud Recording and stream into AWS S3
   */
  async start(channelName, recordingUid, resourceId, eventId) {
    const creds = this.getCredentials();
    const token = helper.buildAgoraRtcToken(
      creds.appId,
      creds.appCertificate,
      channelName,
      parseInt(recordingUid, 10) || 0,
      'publisher',
      86400
    );

    const path = `/v1/apps/${creds.appId}/cloud_recording/resourceid/${resourceId}/mode/mix/start`;
    const body = {
      cname: channelName,
      uid: String(recordingUid),
      clientRequest: {
        token: token,
        recordingConfig: {
          channelType: 1, // 1: Live Broadcasting
          streamTypes: 2, // 2: Audio & Video
          decryptionMode: 0,
          audioProfile: 1,
          videoStreamType: 0,
          maxIdleTime: 120, // stop after 120s of no publishers
          transcodingConfig: {
            width: 720,
            height: 1280,
            fps: 30,
            bitrate: 2000,
            mixedVideoLayout: 1, // floating/grid composite
            backgroundColor: '#000000'
          }
        },
        recordingFileConfig: {
          avFileType: ['hls', 'mp4']
        },
        storageConfig: {
          vendor: 1, // 1: Amazon S3
          region: creds.awsRegionCode,
          bucket: creds.awsBucket,
          accessKey: creds.awsAccessKey,
          secretKey: creds.awsSecretKey,
          fileNamePrefix: ['recordings', String(eventId || channelName)]
        }
      }
    };

    const res = await this.request('POST', path, body);
    return {
      sid: res.sid,
      resourceId: res.resourceId
    };
  }

  /**
   * 3. Stop Cloud Recording and collect S3 URLs
   */
  async stop(channelName, recordingUid, resourceId, sid, eventId = null) {
    const creds = this.getCredentials();
    const path = `/v1/apps/${creds.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`;
    const body = {
      cname: channelName,
      uid: String(recordingUid),
      clientRequest: {}
    };

    const res = await this.request('POST', path, body);
    const serverResponse = res.serverResponse || {};
    const fileList = serverResponse.fileList || [];

    let recordingUrl = null;
    const s3BaseUrl = `https://${creds.awsBucket}.s3.${creds.awsRegion}.amazonaws.com`;

    // Prefer mp4 if available, otherwise hls (.m3u8)
    const mp4File = fileList.find(f => f.fileName && f.fileName.endsWith('.mp4'));
    const m3u8File = fileList.find(f => f.fileName && f.fileName.endsWith('.m3u8'));

    if (mp4File) {
      recordingUrl = `${s3BaseUrl}/${mp4File.fileName}`;
    } else if (m3u8File) {
      recordingUrl = `${s3BaseUrl}/${m3u8File.fileName}`;
    } else if (fileList.length > 0 && fileList[0].fileName) {
      recordingUrl = `${s3BaseUrl}/${fileList[0].fileName}`;
    } else if (sid && channelName) {
      // Deterministic S3 recording URL using Agora Cloud Recording storage convention
      const prefix = eventId ? `recordings/${eventId}` : `recordings/${channelName}`;
      recordingUrl = `${s3BaseUrl}/${prefix}/${sid}_${channelName}.m3u8`;
    }

    return {
      resourceId: res.resourceId,
      sid: res.sid,
      uploadingStatus: serverResponse.uploadingStatus || 'uploaded',
      fileList: fileList,
      recordingUrl: recordingUrl
    };
  }

  /**
   * 4. Query recording status
   */
  async query(resourceId, sid) {
    const creds = this.getCredentials();
    const path = `/v1/apps/${creds.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`;
    return await this.request('GET', path);
  }

  /**
   * High-level helper: Start recording for an event
   */
  async startRecordingForEvent({ channelName, recordingUid, eventId }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Agora REST API credentials (AGORA_CUSTOMER_ID / AGORA_CUSTOMER_SECRET) or AWS S3 credentials are not fully configured in .env'
      };
    }

    try {
      const resourceId = await this.acquire(channelName, recordingUid);
      const startRes = await this.start(channelName, recordingUid, resourceId, eventId);
      return {
        success: true,
        resourceId,
        sid: startRes.sid,
        recordingUid
      };
    } catch (error) {
      console.error('Agora startRecording error:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * High-level helper: Stop recording for an event
   */
  async stopRecordingForEvent({ channelName, recordingUid, resourceId, sid, eventId }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Agora recording credentials not configured'
      };
    }

    try {
      const stopRes = await this.stop(channelName, recordingUid, resourceId, sid, eventId);
      return {
        success: true,
        ...stopRes
      };
    } catch (error) {
      console.error('Agora stopRecording error:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new AgoraRecordingService();
