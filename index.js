// 📦 Подключение библиотек
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// 📌 Assistants API
const ASSISTANT_ID = process.env.ASSISTANT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

if (!ASSISTANT_ID || !OPENAI_API_KEY || !TELEGRAM_TOKEN) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// 🌐 Express сервер
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: 'MVP_1.1_FIXED', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Hermes 1.0 listening on port ${PORT}`);
});

// 🤖 Telegram бот
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// 🧠 Контекст сессий
const userThreads = new Map();

// 📤 Получение ответа от Assistants API
async function getAssistantReply(chatId, userMessage) {
  let threadId = userThreads.get(chatId);

  // 1. Создать нить если новой пользователь
  if (!threadId) {
    const threadRes = await axios.post(
      'https://api.openai.com/v1/threads',
      {},
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    threadId = threadRes.data.id;
    userThreads.set(chatId, threadId);
  }

  // 2. Добавить сообщение пользователя
  await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { role: 'user', content: userMessage },
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
  );

  // 3. Запустить ассистента
  const run = await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/runs`,
    { assistant_id: ASSISTANT_ID },
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
  );

  // 4. Ждать завершения выполнения
  let status = 'queued';
  let result;
  while (status !== 'completed') {
    await new Promise((r) => setTimeout(r, 1000));
    result = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/runs/${run.data.id}`,
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    status = result.data.status;
  }

  // 5. Получить сообщение ассистента
  const messages = await axios.get(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
  );

  const reply = messages.data.data.find((m) => m.role === 'assistant');
  return reply?.content?.[0]?.text?.value || '⚠️ Не удалось получить ответ.';
}

// 💬 Основная логика
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  if (!userMessage || userMessage.startsWith('/')) return;

  try {
    await bot.sendChatAction(chatId, 'typing');
    const reply = await getAssistantReply(chatId, userMessage);
    await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('🔥 Ошибка:', err.message);
    await bot.sendMessage(chatId, '⚠️ Временная ошибка. Попробуй ещё раз.');
  }
});







