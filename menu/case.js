. copilot // Updated to clear module cache before requiring command files so edits show without restart
const fs = require("fs");
const path = require("path");
const axios = require("axios"); // Added axios for working AI integrations
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
    reply,
    promptText: args.join(" ") // Passed parameters forward into executor
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
  reply,
  promptText
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

    // 🔸 UNIFIED AI HANDLER (Supports copilot, ai, chatgpt, gpt, gemini, llama, claude, mistral)
    if (["copilot", "ai", "chatgpt", "gpt", "gemini", "llama", "claude", "mistral"].includes(command)) {
      if (!promptText) return reply(`❌ Please provide a prompt or question!\nExample: \`.${command} write a quick message\``);
      
      await reply(`⏳ ${command.toUpperCase()} is processing your request... 🚀`);

      // Provider 1: Core AI router
      try {
        const response = await axios.get(`https://itzpire.com/ai/gpt3?q=${encodeURIComponent(promptText)}`);
        const resultText = response.data?.data || response.data?.result || response.data?.answer;
        
        if (resultText) return reply(resultText);
        throw new Error("Empty endpoint response from primary AI engine");

      } catch (primaryErr) {
        console.warn(`⚠️ Primary AI route failed for .${command}. Attempting backup cluster...`);

        // Provider 2: Backup AI cluster
        try {
          const fallbackResponse = await axios.get(`https://api.vyturex.com/openai?prompt=${encodeURIComponent(promptText)}`);
          if (fallbackResponse.data) return reply(fallbackResponse.data);
          throw new Error("Fallback failed to yield response data");

        } catch (fallbackErr) {
          console.error(`❌ Total service blackout for .${command}:`, fallbackErr.message);
          return reply("❌ All remote AI generation servers are currently offline or busy. Please try your command again shortly.");
        }
      }
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


This is case.js fix this code that ai commands and copilot works perfectly
