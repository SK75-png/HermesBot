const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');

// Загрузка переменных из Railway
const token = process.env.TELEGRAM_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;

// Инициализация Telegram бота
const bot = new TelegramBot(token, { polling: true });

// Инициализация OpenAI
const openai = new OpenAI({ apiKey: openaiApiKey });

// Системная роль агента Гермес
const SYSTEM_PROMPT = `
Ты — Гермес, стратегический советник, говоришь чётко, умно и уверенно.
Отвечай как партнёр в команде, давай краткие и полезные советы.
Избегай воды. Примеры — живые, с силой.
`;

// Обработка сообщений от пользователя
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  // Исключаем команды
  if (userMessage.startsWith('/')) return;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });

    const reply = response.choices[0]?.message?.content?.trim();
    bot.sendMessage(chatId, reply || 'Не могу ответить.');
  } catch (err) {
    console.error('Ошибка OpenAI:', err);
    bot.sendMessage(chatId, '⚠️ Ошибка при обращении к GPT');
  }
});




