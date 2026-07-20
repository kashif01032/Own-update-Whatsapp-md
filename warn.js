// Warning System Command
const fs = require("fs");
const path = require("path");

const warningsFile = path.join(__dirname, "warnings.json");

function loadWarnings() {
  if (fs.existsSync(warningsFile)) {
    return JSON.parse(fs.readFileSync(warningsFile, "utf8"));
  }
  return {};
}

function saveWarnings(warnings) {
  fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2));
}

module.exports = async function warn({
  conn,
  m,
  args,
  jid,
  isGroup,
  reply,
  sender,
}) {
  if (!isGroup) {
    return reply("❌ *This command only works in groups!*");
  }

  const groupMetadata = await conn.groupMetadata(jid);
  const sender_obj = groupMetadata.participants.find(
    (p) => p.id === m.key.fromMe
      ? conn.user.id.split(":")[0] + "@s.whatsapp.net"
      : m.key.participant || m.key.remoteJid
  );

  // Check if user is admin
  if (!sender_obj?.admin) {
    return reply("❌ *Only admins can warn members!*");
  }

  const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const reason = args.join(" ") || "No reason specified";

  if (!mentionedJid || mentionedJid.length === 0) {
    return reply("⚠️ *Mention a user to warn them*");
  }

  const warnings = loadWarnings();
  const targetJid = mentionedJid[0];
  const groupWarnings = warnings[jid] || {};

  if (!groupWarnings[targetJid]) {
    groupWarnings[targetJid] = 0;
  }

  groupWarnings[targetJid]++;
  warnings[jid] = groupWarnings;
  saveWarnings(warnings);

  const warnCount = groupWarnings[targetJid];

  let response = `⚠️ *User Warned!*\n`;
  response += `👤 *Target:* @${targetJid.split("@")[0]}\n`;
  response += `📌 *Reason:* ${reason}\n`;
  response += `🚨 *Warnings:* ${warnCount}/3\n`;

  if (warnCount >= 3) {
    response += `\n❌ *User has received 3 warnings and will be kicked!*`;
    await conn.groupParticipantsUpdate(jid, [targetJid], "remove");
  }

  reply(response);
};
