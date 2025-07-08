const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');
const fs = require('fs');
const redis = require('redis');
require('dotenv').config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const REDIS_URL = process.env.REDIS_URL;

if (!TELEGRAM_TOKEN || !OPENAI_API_KEY || !REDIS_URL) {
  console.error('❌ Ошибка: TELEGRAM_TOKEN, OPENAI_API_KEY или REDIS_URL отсутствуют. Добавь их в .env!');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const redisClient = redis.createClient({ url: REDIS_URL });
redisClient.on('error', (err) => console.error('Redis ошибка:', err.message));
redisClient.connect().then(() => console.log('✅ Redis подключён.')).catch(err => {
  console.error('❌ Redis ошибка:', err.message);
  process.exit(1);
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userInput = msg.text;

  if (!userInput) return;

  try {
    await bot.sendChatAction(chatId, 'typing');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Ты — Гермес, говори как партнёр, без сухости и шаблонов.' },
        { role: 'user', content: userInput }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const reply = response.choices[0]?.message?.content?.trim() || 'Что-то пошло не так. Попробуем ещё раз?';
    await bot.sendMessage(chatId, reply);

  } catch (err) {
    console.error('❌ Ошибка GPT:', err.message);
    await bot.sendMessage(chatId, 'Произошла ошибка при обращении к ИИ. Попробуй позже!');
  }
});

console.log('🤖 Гермес запущен и ждёт сообщений...');



