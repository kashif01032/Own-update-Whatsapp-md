const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
const os = require('os');
const path = require('path');

module.exports = async ({ conn, m, args, command, jid, isGroup, sender, reply }) => {
  const url = args[0] || (m.quoted && (m.quoted.message?.conversation || m.quoted.message?.extendedTextMessage?.text));
  if (!url) return reply('❗️ Provide a YouTube URL. Usage: .ytmp4 <url>');

  const tmpVideo = path.join(os.tmpdir(), `${Date.now()}_video.mp4`);

  try {
    if (!ytdl.validateURL(url)) return reply('❌ Invalid YouTube URL provided!');

    const info = await ytdl.getInfo(url);
    const title = (info.videoDetails.title || 'video').replace(/[<>:"/\\|?*]/g, '').slice(0, 50);

    // Download progressive audio+video stream directly
    await new Promise((resolve, reject) => {
      ytdl(url, { 
        filter: 'audioandvideo', 
        quality: 'highestvideo',
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      })
      .pipe(fs.createWriteStream(tmpVideo))
      .on('finish', resolve)
      .on('error', reject);
    });

    const maxSize = 100 * 1024 * 1024; // 100 MB
    const stats = fs.statSync(tmpVideo);
    if (stats.size > maxSize) {
      return reply('❌ Video file size is too large to send via WhatsApp (Limit: 100MB).');
    }

    // Send video using direct file path (Supported natively by Baileys)
    await conn.sendMessage(jid, {
      video: { url: tmpVideo },
      caption: title,
      mimetype: 'video/mp4'
    }, { quoted: m });

  } catch (err) {
    console.error('ytmp4 error:', err);
    reply('❌ Failed to download video: ' + (err.message || err));
  } finally {
    // Delay removal slightly so Baileys finishes uploading the file stream
    setTimeout(() => {
      if (fs.existsSync(tmpVideo)) {
        try { fs.unlinkSync(tmpVideo); } catch (e) {}
      }
    }, 10000);
  }
};
