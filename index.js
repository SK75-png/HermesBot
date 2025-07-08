const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
require('dotenv').config();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: userMessage }],
    });

    const reply = completion.choices[0].message.content.trim();
    await bot.sendMessage(chatId, reply);
  } catch (error) {
    console.error('Ошибка OpenAI:', error.message);
    await bot.sendMessage(chatId, '🚫 Ошибка при обращении к ИИ. Попробуй позже.');
  }
});




