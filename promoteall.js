// Promote All Members to Admin Command
module.exports = async function promoteall({
  conn,
  m,
  jid,
  isGroup,
  reply,
  sender,
}) {
  if (!isGroup) {
    return reply("❌ *This command only works in groups!*");
  }

  try {
    const groupMetadata = await conn.groupMetadata(jid);
    const userJid = m.key.fromMe
      ? conn.user.id.split(":")[0] + "@s.whatsapp.net"
      : m.key.participant || m.key.remoteJid;
    const userAdmin = groupMetadata.participants.find((p) => p.id === userJid);

    if (!userAdmin?.admin) {
      return reply("❌ *Only admins can promote members!*");
    }

    const nonAdmins = groupMetadata.participants.filter((p) => !p.admin);

    if (nonAdmins.length === 0) {
      return reply("ℹ️ *Everyone is already an admin!*");
    }

    const nonAdminJids = nonAdmins.map((p) => p.id);

    await conn.groupParticipantsUpdate(jid, nonAdminJids, "promote");
    reply(
      `✅ *${nonAdminJids.length} members have been promoted to admin!*`
    );
  } catch (err) {
    console.error("PromoteAll Error:", err);
    reply("❌ *Error promoting members!*");
  }
};
