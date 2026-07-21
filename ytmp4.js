const fs = require('fs');
const axios = require('axios');
const os = require('os');
const path = require('path');

module.exports = async ({ conn, m, args, command, jid, isGroup, sender, reply }) => {
  const url = args[0] || (m.quoted && (m.quoted.message?.conversation || m.quoted.message?.extendedTextMessage?.text));
  if (!url) return reply('❗️ Provide a YouTube URL. Usage: .ytmp4 <url>');

  const tmpVideo = path.join(os.tmpdir(), `${Date.now()}_video.mp4`);

  try {
    reply('⏳ Downloading video, please wait...');

    let downloadUrl = null;
    let videoTitle = 'video';

    // Primary Attempt: Cobalt v10 API
    try {
      const cobaltRes = await axios.post('https://api.cobalt.tools/', {
        url: url,
        videoQuality: '720',
        filenamePattern: 'basic'
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (cobaltRes.data && cobaltRes.data.url) {
        downloadUrl = cobaltRes.data.url;
      }
    } catch (e) {
      console.log('Cobalt v10 primary failed, trying fallback API...');
    }

    // Secondary Attempt: Fallback Downloader API
    if (!downloadUrl) {
      const fallbackRes = await axios.get(`https://api.dreaded.site/api/ytdl/video?url=${encodeURIComponent(url)}`, { timeout: 15000 });
      if (fallbackRes.data && fallbackRes.data.result && fallbackRes.data.result.downloadUrl) {
        downloadUrl = fallbackRes.data.result.downloadUrl;
        videoTitle = fallbackRes.data.result.title || videoTitle;
      }
    }

    if (!downloadUrl) {
      return reply('❌ Could not retrieve video stream. Please check the link and try again.');
    }

    // Stream video to temporary directory
    const downloadRes = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(tmpVideo);
    downloadRes.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const maxSize = 100 * 1024 * 1024; // 100 MB limit
    const stats = fs.statSync(tmpVideo);
    if (stats.size > maxSize) {
      return reply('❌ Video file size exceeds WhatsApp limit (100MB).');
    }

    // Send video
    await conn.sendMessage(jid, {
      video: { url: tmpVideo },
      caption: videoTitle,
      mimetype: 'video/mp4'
    }, { quoted: m });

  } catch (err) {
    console.error('ytmp4 error:', err);
    reply('❌ Failed to download video: ' + (err.response?.data?.text || err.message || err));
  } finally {
    // Clean up temporary local file
    setTimeout(() => {
      if (fs.existsSync(tmpVideo)) {
        try { fs.unlinkSync(tmpVideo); } catch (e) {}
      }
    }, 10000);
  }
};
