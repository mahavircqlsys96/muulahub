const fs = require('fs');
const axios = require('axios');
require('dotenv').config();
const mux = require('./config/mux');

async function test() {
  try {
    const upload = await mux.video.uploads.create({
      new_asset_settings: { playback_policies: ['public'] },
      cors_origin: '*',
    });
    console.log("Upload created:", upload.id, upload.url);
    
    fs.writeFileSync('dummy.mp4', 'dummy data');
    
    const stream = fs.createReadStream('dummy.mp4');
    await axios.put(upload.url, stream, {
      headers: { 'Content-Type': 'video/mp4' }
    });
    
    console.log("File uploaded.");
    
    for (let i = 0; i < 30; i++) {
       const up = await mux.video.uploads.retrieve(upload.id);
       if (up.asset_id) {
           console.log("Asset ID:", up.asset_id);
           const asset = await mux.video.assets.retrieve(up.asset_id);
           console.log("Asset status:", asset.status);
           if (asset.playback_ids && asset.playback_ids.length > 0) {
              console.log("Playback ID:", asset.playback_ids[0].id);
              break;
           }
       }
       await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch(e) {
    console.error(e);
  }
}

test();
