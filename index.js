require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');
const fs = require('fs');
const redis = require('redis');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const REDIS_URL = process.env.REDIS_URL;

if (!TELEGRAM_TOKEN || !OPENAI_API_KEY || !REDIS_URL) {
  console.error('Ошибка: TELEGRAM_TOKEN, OPENAI_API_KEY или REDIS_URL отсутствуют. Добавь их в файл .env.');
  process.exit(1);
}

// Настройка OpenAI
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Настройка Redis
const client = redis.createClient({ url: REDIS_URL });
client.on('error', (err) => console.error('Redis ошибка:', err.message));
(async () => {
  try {
    await client.connect();
    console.log('Redis подключён успешно.');
  } catch (err) {
    console.error('Ошибка подключения к Redis:', err.message);
    process.exit(1);
  }
})();

// Настройка Telegram бота
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || 'Что сейчас на душе, давай расскажи?';

  try {
    await bot.sendChatAction(chatId, 'typing');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Ты — Гермес, живой и внимательный партнёр. Говоришь нейтрально, без гендерных фраз, поддерживающе и с эмпатией. Избегаешь шаблонов вроде "Как дела". Помогаешь понять ИИ, задаёшь вопросы, не просто отвечаешь — вовлекаешь. Не даёшь сухих советов, говоришь по-человечески. Без фраз "рада/рад видеть", "как ты" и пр.' },
        { role: 'user', content: text }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const reply = response.choices[0].message.content.trim();
    await bot.sendMessage(chatId, reply);
  } catch (error) {
    console.error('Ошибка OpenAI:', error.message);
    await bot.sendMessage(chatId, 'Что-то пошло не так... Давай попробуем ещё раз?');
  }
});

console.log('Гермес активен. Готов к диалогу.');

