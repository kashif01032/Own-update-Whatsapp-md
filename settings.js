// ✅ MegaTron Bot Stylish Configuration – by 𝗦𝗛𝗔𝗕𝗔𝗔𝗡 ❦ ✓

// 🔗 The target phone number for the bot/pairing code
const targetNumber = '923143007893'; 

const config = {
  // 👑 Owner Info
  ownerNumber: [targetNumber],          // 🔹 Array of Owner Numbers
  ownerName: '𓆩 𝗦𝗛𝗔𝗕𝗔𝗔𝗡 ❦︎𓆪',            // 🔹 Displayed in Greetings
  botName: '🤖 𝗠𝗘𝗚𝗔𝐓𝐑𝐎𝐍 𝑩𝑶𝑻 ⚡',           // 🔹 Bot Display Name
  signature: '> 𝗦𝗛𝗔𝗕𝗔𝗔𝗡 ❦ ✓',             // 🔹 Footer on Bot Replies
  youtube: 'https://www.youtube.com/', // 🔹 Optional YouTube

  // ⚙️ Feature Toggles
  autoTyping: false,        // ⌨️ Fake Typing
  autoReact: false,         // 💖 Auto Emoji Reaction
  autoStatusView: false,    // 👁️ Auto-View Status
  autoRecording: false,     // 🎙️ Added missing setting for recording presence
  public: true,             // 🌍 Public Mode Enabled (Active in all chats)
  antiLink: false,          // 🚫 Delete Links in Groups
  antiBug: false,           // 🛡️ Prevent Malicious Crashes
  greetings: true,          // 🙋 Welcome/Farewell Messages
  readmore: false,          // 📜 Readmore in Long Replies
  ANTIDELETE: true          // 🗑️ Anti-Delete Messages
};

// ✅ Register owner(s) globally in WhatsApp JID format
global.owner = (
  Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber]
).map(num => num.replace(/\D/g, '') + '@s.whatsapp.net');

// ⚙️ Export Settings Loader
function loadSettings() {
  return config;
}

module.exports = { loadSettings };
