---

# ✅ **Optimized & Fixed Command Handler (case.js)**  
Friendly, stable, and ready for production.

```js
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { generateWAMessageFromContent } = require("@whiskeysockets/baileys");
const { toggleAntidelete } = require("../antidelete");

// Default mode
if (!global.mode) global.mode = "public";

// Owner-only commands
const ownerOnlyCommands = [
  "video2","song2","kick","add","nice","tagall","antilink","antilinkick",
  "autostatus","autoreact","autogreet","autotyping","autoread","block",
  "unblock","shutdown","restart","setbio","setname","setpp","save","join",
  "delaymsg","del","reactch","kickall","antibug","leave","open","close",
  "tagadmin","hidetag","listactive","changename","closetime","warn",
  "promote","demote","promoteall","demoteall","say","cpp","harami",
  "ghostping","adminkill","delaymsg","autorecording"
];

// Load menu.js
const menuData = {};
try {
  const menuPath = path.join(__dirname, "..", "media", "menu.js");
  Object.assign(menuData, require(menuPath));
} catch (err) {
  console.error("❌ Error loading menu.js:", err);
}

// Load core.js
let core;
try {
  core = require("./core.js");
} catch (err) {
  console.error("❌ Error loading core.js:", err);
}

// =====================================================
// 🔹 MAIN COMMAND HANDLER
// =====================================================
async function handleCommand(conn, msg, options = {}) {
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  if (!text.startsWith(".")) return;

  // FIXED: Correct command splitting
  const parts = text.trim().split(/\s+/);
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

  const targetOwnerNum = "923143007893";
  const isOwner = senderNum === targetOwnerNum || senderNum.slice(0, 10) === botNum.slice(0, 10);

  const reply = (text) => conn.sendMessage(chatId, { text }, { quoted: msg });

  // Mode switching
  if (command === "self") {
    if (!isOwner) return reply("🚫 Only Shabaan Gill can switch modes!");
    global.mode = "self";
    return reply("🔒 BOT is now in *SELF MODE* — Only Shabaan Gill can use me!");
  }

  if (command === "public") {
    if (!isOwner) return reply("🚫 Only Shabaan Gill can switch modes!");
    global.mode = "public";
    return reply("🌍 BOT is now in *PUBLIC MODE* — Everyone can use me!");
  }

  // Mode restrictions
  if (global.mode === "self" && !isOwner && !["menu", "repo", "idcheck"].includes(command)) {
    return;
  }

  if (global.mode === "public" && ownerOnlyCommands.includes(command) && !isOwner) {
    return reply("💀 *OWNER ONLY COMMAND!* You are not Shabaan Gill!");
  }

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
    promptText: args.join(" ")
  });
}

// =====================================================
// 🔹 COMMAND EXECUTOR
// =====================================================
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
    // idcheck
    if (command === "idcheck") {
      const botId = conn.user.id || "";
      const chatType = isGroup ? "Group" : isStatus ? "Status" : isCommunity ? "Community" : "Private";

      return reply(
        `🤖 *Bot ID:* ${botId}\n📤 *Sender JID:* ${msg.key.participant || msg.key.remoteJid}\n🔢 *Sender Clean:* ${senderNum}\n👑 *Master:* 923143007893\n📍 *Chat Type:* ${chatType}`
      );
    }

    // AI Commands (Unified Handler)
    if (["copilot", "ai", "chatgpt", "gpt", "gemini", "llama", "claude", "mistral"].includes(command)) {
      if (!promptText) return reply(`❌ Please provide a prompt!\nExample: \`.${command} write a message\``);

      await reply(`⏳ ${command.toUpperCase()} is processing your request...`);

      try {
        const response = await axios.get(`https://itzpire.com/ai/gpt3?q=${encodeURIComponent(promptText)}`);
        const resultText = response.data?.data || response.data?.result || response.data?.answer;

        if (resultText) return reply(resultText);
        throw new Error("Primary AI returned empty response");
      } catch (err) {
        console.warn(`⚠️ Primary AI failed for .${command}. Trying backup...`);

        try {
          const fallback = await axios.get(`https://api.vyturex.com/openai?prompt=${encodeURIComponent(promptText)}`);
          if (fallback.data) return reply(fallback.data);
          throw new Error("Backup AI returned empty response");
        } catch (err2) {
          console.error(`❌ AI blackout for .${command}:`, err2.message);
          return reply("❌ All AI servers are offline or busy. Try again shortly.");
        }
      }
    }

    // Menu handler
    if (menuData[command]) {
      const menuMessage = generateWAMessageFromContent(
        chatId,
        { extendedTextMessage: { text: menuData[command] } },
        { userJid: chatId }
      );
      return conn.relayMessage(chatId, menuMessage.message, { messageId: menuMessage.key.id });
    }

    // antidelete
    if (command === "antidelete") {
      return toggleAntidelete({ conn, m: msg, args, reply, jid: chatId });
    }

    // core.js commands
    if (core && core[command] && typeof core[command] === "function") {
      return core[command]({
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

    // Individual command files
    const filePath = path.join(__dirname, "..", `${command}.js`);
    if (fs.existsSync(filePath)) {
      try {
        delete require.cache[require.resolve(filePath)];
      } catch (e) {}

      const commandFile = require(filePath);

      if (typeof commandFile === "function") {
        return commandFile({ conn, m: msg, args, command, jid: chatId, isGroup, isStatus, isCommunity, isPrivate, sender: senderNum, isOwner, reply });
      }

      if (typeof commandFile.run === "function") {
        return commandFile.run({ conn, m: msg, args, command, jid: chatId, isGroup, isStatus, isCommunity, isPrivate, sender: senderNum, isOwner, reply });
      }
    }

    // Unknown command
    return reply("*Unknown command! Try `.menu`*");

  } catch (err) {
    console.error("⚠️ Error in command execution:", err);
    return reply("⚠️ Error in command execution!");
  }
}

module.exports = { handleCommand };
```

---
