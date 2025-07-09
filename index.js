const TelegramBot = require('node-telegram-bot-api');
const { Configuration, OpenAIApi } = require('openai');
const express = require('express');
require('dotenv').config();

// ENV
const token = process.env.TELEGRAM_TOKEN;
const openaiKey = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;

// OpenAI
const configuration = new Configuration({
  apiKey: openaiKey,
});
const openai = new OpenAIApi(configuration);

// Telegram
const bot = new TelegramBot(token, { polling: true });

// Hermes system prompt
const systemPrompt = {
  role: "system",
  content: "Ты — Гермес, стратегический GPT-партнёр. Отвечай умно, чётко, полезно, с логикой, как человек, без воды."
};

// Храни последние 10 сообщений на пользователя
const userSessions = new Map();
const MAX_MESSAGES = 10;

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  try {
    // Обновляем сессию
    const session = userSessions.get(chatId) || [];
    session.push({ role: "user", content: text });
    const messages = [systemPrompt, ...session.slice(-MAX_MESSAGES)];

    // Запрос к OpenAI
    const response = await openai.createChatCompletion({
      model: "gpt-4o", // или gpt-4o-mini
      messages,
    });

    const reply = response.data.choices[0].message.content;
    bot.sendMessage(chatId, reply);

    // Сохраняем ответ
    session.push({ role: "assistant", content: reply });
    userSessions.set(chatId, session);

  } catch (err) {
    console.error("Ошибка:", err.message);
    bot.sendMessage(chatId, "⚠️ Ошибка. Попробуй позже.");
  }
});

// Express health check
const app = express();
app.get('/health', (req, res) => {
  res.send({ status: 'ok', timestamp: new Date().toISOString() });
});
app.listen(PORT, () => {
  console.log(`Health check запущен на порту ${PORT}`);
});




