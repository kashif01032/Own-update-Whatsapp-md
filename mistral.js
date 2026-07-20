// Mistral AI Command Handler
const axios = require("axios");

module.exports = async function mistral({ conn, m, args, jid, reply }) {
  if (!args.length) {
    return reply(
      "⚡ *Usage:* `.mistral your question here`\n\n_Powered by Mistral AI_"
    );
  }

  const question = args.join(" ");
  const loadingMsg = await reply("⏳ *Thinking...* 🤔");

  try {
    // Using Mistral API
    const response = await axios.post(
      `https://api.deepinfra.com/v1/inference`,
      {
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        input: {
          prompt: question,
        },
      }
    );

    const result = response.data?.results?.[0]?.generated_text || "No response";

    await conn.sendMessage(
      jid,
      { text: `⚡ *Mistral AI Response:*\n\n${result}` },
      { quoted: m }
    );
  } catch (err) {
    console.error("Mistral Error:", err.message);
    reply("❌ *Mistral Service Error*\nPlease try again later.");
  }
};
