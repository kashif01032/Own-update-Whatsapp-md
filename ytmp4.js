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

    // Call public Cobalt API to bypass Railway IP block
    const cobaltRes = await axios.post('https://api.cobalt.tools/api/json', {
      url: url,
      videoQuality: '720'
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const data = cobaltRes.data;
    if (!data || data.status === 'error' || !data.url) {
      return reply('❌ Could not fetch video stream from YouTube.');
    }

    // Download video file stream to temporary path
    const downloadRes = await axios({
      method: 'get',
      url: data.url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(tmpVideo);
    downloadRes.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const maxSize = 100 * 1024 * 1024; // 100 MB
    const stats = fs.statSync(tmpVideo);
    if (stats.size > maxSize) {
      return reply('❌ Video file size is too large to send via WhatsApp (Limit: 100MB).');
    }

    // Send video via WhatsApp
    await conn.sendMessage(jid, {
      video: { url: tmpVideo },
      caption: 'Downloaded successfully! 🎬',
      mimetype: 'video/mp4'
    }, { quoted: m });

  } catch (err) {
    console.error('ytmp4 error:', err);
    reply('❌ Failed to download video: ' + (err.response?.data?.text || err.message || err));
  } finally {
    // Clean up temporary file after delivery
    setTimeout(() => {
      if (fs.existsSync(tmpVideo)) {
        try { fs.unlinkSync(tmpVideo); } catch (e) {}
      }
    }, 10000);
  }
};
