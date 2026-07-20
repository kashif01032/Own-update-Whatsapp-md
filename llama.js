// LLama AI Command Handler
const axios = require("axios");

module.exports = async function llama({ conn, m, args, jid, reply }) {
  if (!args.length) {
    return reply(
      "🦙 *Usage:* `.llama your question here`\n\n_Powered by Meta LLama AI_"
    );
  }

  const question = args.join(" ");
  const loadingMsg = await reply("⏳ *Thinking...* 🤔");

  try {
    // Using free LLama API
    const response = await axios.post(`https://api.deepinfra.com/v1/inference`, {
      model: "meta-llama/Llama-2-70b-chat-hf",
      input: {
        prompt: question,
      },
    });

    const result = response.data?.results?.[0]?.generated_text || "No response";

    await conn.sendMessage(
      jid,
      { text: `🦙 *LLama AI Response:*\n\n${result}` },
      { quoted: m }
    );
  } catch (err) {
    console.error("LLama Error:", err.message);
    reply("❌ *LLama Service Error*\nPlease try again later.");
  }
};
