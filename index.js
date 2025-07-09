const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');
const express = require('express'); // ДОБАВИЛИ EXPRESS

// 🔧 Express сервер для Railway
const app = express();
const PORT = process.env.PORT || 3000;

// Health endpoint для Railway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    bot: 'Hermes running'
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Hermes Bot is running!' });
});

// Запускаем Express сервер
app.listen(PORT, () => {
  console.log(`🚀 Health server running on port ${PORT}`);
});

// Загрузка переменных из Railway
const token = process.env.TELEGRAM_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!token || !openaiApiKey) {
  console.error('❌ Отсутствуют TELEGRAM_TOKEN или OPENAI_API_KEY');
  process.exit(1);
}

// Инициализация Telegram бота
const bot = new TelegramBot(token, { polling: true });

// Инициализация OpenAI
const openai = new OpenAI({ apiKey: openaiApiKey });

// Системная роль агента Гермес
const SYSTEM_PROMPT = `
Ты — Гермес, стратегический советник и партнёр.
Говоришь чётко, умно и уверенно, как опытный бизнес-консультант.
Отвечай как партнёр в команде, давай краткие и полезные советы.
Избегай воды и общих фраз. Примеры — живые, с практической силой.
Помогаешь в реализации проектов и решении задач.
`;

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🤖 **Гермес запущен**

Я — твой стратегический партнёр для решения задач.
Просто напиши свой вопрос, и получишь конкретный совет.

*Пример: "Как улучшить конверсию?" или "Помоги с запуском проекта"*`, 
  { parse_mode: 'Markdown' });
});

// Обработка сообщений от пользователя
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  // Исключаем команды
  if (!userMessage || userMessage.startsWith('/')) return;

  console.log(`📨 Сообщение от ${msg.from.first_name}: ${userMessage}`);

  try {
    // Показываем что бот печатает
    await bot.sendChatAction(chatId, 'typing');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Более экономичная модель
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const reply = response.choices[0]?.message?.content?.trim();
    
    if (reply) {
      await bot.sendMessage(chatId, reply);
      console.log(`✅ Отправлен ответ пользователю ${msg.from.first_name}`);
    } else {
      await bot.sendMessage(chatId, '🤔 Не могу сформулировать ответ. Попробуй переформулировать вопрос.');
    }

  } catch (err) {
    console.error('🔥 Ошибка OpenAI:', err.message);
    
    // Специфичные ошибки
    if (err.code === 'insufficient_quota') {
      await bot.sendMessage(chatId, '💳 Превышен лимит OpenAI API. Свяжитесь с администратором.');
    } else if (err.code === 'rate_limit_exceeded') {
      await bot.sendMessage(chatId, '⏱️ Слишком много запросов. Подождите минуту.');
    } else {
      await bot.sendMessage(chatId, '⚠️ Временная ошибка. Попробуйте ещё раз через минуту.');
    }
  }
});

// Обработка ошибок polling
bot.on('polling_error', (error) => {
  console.error('🔥 Polling error:', error.message);
});

console.log('🚀 Гермес-бот запущен и готов к работе!');




