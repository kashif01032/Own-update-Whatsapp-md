// Updated to clear module cache before requiring command files so edits show without restart
const fs = require("fs");
const path = require("path");
const { generateWAMessageFromContent } = require("@whiskeysockets/baileys");
const { toggleAntidelete } = require("../antidelete");

// ✅ FIX: START IN PUBLIC MODE - Bot works everywhere
if (!global.mode) global.mode = "public";

// Owner-only commands list
const ownerOnlyCommands = [
  "video2", "song2", "kick", "add", "nice", "tagall",
  "antilink", "antilinkick", "autostatus", "autoreact",
  "autogreet", "autotyping", "autoread", "block", "unblock",
  "shutdown", "restart", "setbio", "setname", "setpp", "save",
  "join", "delaymsg", "del", "reactch", "kickall", "antibug",
  "leave", "open", "close", "tagadmin", "hidetag", "listactive",
  "changename", "closetime", "warn", "promote", "demote",
  "promoteall", "demoteall", "say", "cpp", "harami", "ghostping",
  "adminkill", "delaymsg", "autorecording"
];

// Load menu.js
const menuData = {};
try {
  const menuPath = path.join(__dirname, "..", "media", "menu.js");
  Object.assign(menuData, require(menuPath));
} catch (err) {
  console.error("❌ Error loading menu.js:", err);
}

// Load core.js if exists
let core;
try {
  const corePath = path.join(__dirname, "./core.js");
  core = require(corePath);
} catch (err) {
  console.error("❌ Error loading core.js:", err);
}

// ===============================
// 🔹 MAIN COMMAND HANDLER
// ===============================
async function handleCommand(conn, msg, options = {}) {
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  if (!text.startsWith(".")) return;

  const parts = text.trim().split(/ +/);
  const command = parts[0].slice(1).toLowerCase();
  const args = parts.slice(1);

  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const isStatus = chatId === "status@broadcast";
  const isCommunity = chatId.includes("@newsletter") || chatId.includes("@community");
  const isPrivate = !isGroup && !isStatus && !isCommunity;
  
  const senderId = msg.key.fromMe
    ? conn.user.id.split(":")[0] + "@s.whatsapp.net"
    : msg.key.participant || msg.key.remoteJid;

  const senderNum = senderId.replace(/\D/g, "");
  const botNum = (conn.user.id || "").replace(/\D/g, "");
  
  // Strict Owner Checks (Matches your absolute number OR if the bot sends a command to itself)
  const targetOwnerNum = "923143007893"; 
  const isOwner = senderNum === targetOwnerNum || senderNum.slice(0, 10) === botNum.slice(0, 10);

  const reply = (text) => conn.sendMessage(chatId, { text }, { quoted: msg });

  // 🔸 Mode control - OWNER ONLY
  if (command === "self") {
    if (!isOwner)
      return reply("🚫 *Only Shabaan Gill can switch modes!*");

    global.mode = "self";
    return reply("🔒 BOT IS NOW IN *SELF MODE* — Only Shabaan Gill can use me!");
  }

  if (command === "public") {
    if (!isOwner)
      return reply("🚫 *Only Shabaan Gill can switch modes!*");

    global.mode = "public";
    return reply("🌍 BOT IS NOW IN *PUBLIC MODE* — Everyone can use me!");
  }

  // 🔸 Mode restrictions
  // In SELF mode: only owner + allowed public commands
  if (global.mode === "self" && !isOwner && !["menu", "repo", "idcheck"].includes(command)) {
    return; // Silent return in self mode for non-owners
  }

  // In PUBLIC mode: owner-only commands restricted to owner only
  if (global.mode === "public" && ownerOnlyCommands.includes(command) && !isOwner) {
    return reply("💀 *OWNER ONLY COMMAND!* You are not Shabaan Gill!");
  }

  // Default execution path
  return runCommand({
    conn,
    msg,
    args,
    command,
    chatId,
    isGroup,
    isStatus,
    isCommunity,
    isPrivate,
    senderNum,
    isOwner,
    reply
  });
}

// ===============================
// 🔹 COMMAND EXECUTOR
// ===============================
async function runCommand({
  conn,
  msg,
  args,
  command,
  chatId,
  isGroup,
  isStatus,
  isCommunity,
  isPrivate,
  senderNum,
  isOwner,
  reply
}) {
  try {
    // 🔸 idcheck
    if (command === "idcheck") {
      const botId = conn.user.id || "";
      const chatType = isGroup ? "Group" : isStatus ? "Status" : isCommunity ? "Community" : "Private";
      return reply(
        `🤖 *Bot ID:* ${botId}\n📤 *Sender JID:* ${
          msg.key.participant || msg.key.remoteJid
        }\n🔢 *Sender Clean:* ${senderNum}\n👑 *Configured Master:* 923143007893\n📍 *Chat Type:* ${chatType}`
      );
    }

    // 🔸 menu message
    if (menuData[command]) {
      const menuMessage = generateWAMessageFromContent(
        chatId,
        { extendedTextMessage: { text: menuData[command] } },
        { userJid: chatId }
      );
      return await conn.relayMessage(chatId, menuMessage.message, {
        messageId: menuMessage.key.id
      });
    }

    // 🔸 antidelete handler
    if (command === "antidelete") {
      return toggleAntidelete({ conn, m: msg, args, reply, jid: chatId });
    }

    // 🔸 core functions
    if (core && core[command] && typeof core[command] === "function") {
      return await core[command]({
        conn,
        m: msg,
        args,
        command,
        jid: chatId,
        isGroup,
        isStatus,
        isCommunity,
        isPrivate,
        sender: senderNum,
        isOwner,
        reply
      });
    }

    // 🔸 individual command files (clear cache so edits show)
    const filePath = path.join(__dirname, "..", `${command}.js`);
    if (fs.existsSync(filePath)) {
      try {
        delete require.cache[require.resolve(filePath)];
      } catch (e) {}
      const commandFile = require(filePath);
      if (typeof commandFile === "function") {
        return await commandFile({ conn, m: msg, args, command, jid: chatId, isGroup, isStatus, isCommunity, isPrivate, sender: senderNum, isOwner, reply });
      }
      if (typeof commandFile.run === "function") {
        return await commandFile.run({ conn, m: msg, args, command, jid: chatId, isGroup, isStatus, isCommunity, isPrivate, sender: senderNum, isOwner, reply });
      }
    }

    // 🔸 unknown command
    return reply("*ᴜɴᴋɴᴏᴡɴ ᴄᴏᴍᴍᴀɴᴅ! ᴛʀʏ `.ᴍᴇɴᴜ` ʙᴇꜰᴏʀᴇ sʜᴏᴡɪɴɢ ᴏꜰꜰ 𓄀*");

  } catch (err) {
    console.error("⚠️ Error in command execution:", err);
    return reply("⚠️ Error in command execution!");
  }
}

// ===============================
// 🔹 Export
// ===============================
module.exports = {
  handleCommand
};
