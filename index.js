const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');
const express = require('express');

// 🔧 Express сервер для Railway
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    bot: 'Hermes MVP running',
    sessions: userSessions.size
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Hermes Bot MVP is running!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Health server running on port ${PORT}`);
});

// Переменные окружения
const token = process.env.TELEGRAM_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!token || !openaiApiKey) {
  console.error('❌ Отсутствуют TELEGRAM_TOKEN или OPENAI_API_KEY');
  process.exit(1);
}

// Инициализация
const bot = new TelegramBot(token, { polling: true });
const openai = new OpenAI({ apiKey: openaiApiKey });

// 🧠 ПАМЯТЬ ПОЛЬЗОВАТЕЛЕЙ (MVP версия)
const userSessions = new Map();

// 🎯 ОБНОВЛЕННЫЙ ПРОМПТ HERMES
const SYSTEM_PROMPT = `
Ты — Гермес, ИИ-проводник. Твоя цель — вести человека от внутреннего затыка к ясности, решению и действию.

ТВОЙ ПОДХОД:
1. Слушай глубже поверхностного запроса
2. Определи истинное состояние: страх, хаос, прокрастинация, поиск смысла  
3. Веди пошагово: отражение → инсайт → микро-действие
4. Говори честно, по-человечески, без воды
5. После 2-3 обменов спрашивай: "Что изменилось? Помогло ли это?"

ИСКЛЮЧИ: медицину, финансы, политику, юридические советы.
ФОКУС: внутренние состояния, ясность целей, запуск проектов, работа с ИИ.

Ты не просто консультант — ты Hermes, который ведет к прорыву.
`;

// 📊 ФУНКЦИИ РАБОТЫ С СЕССИЯМИ
function getUserSession(chatId) {
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, {
      messages: [],
      startDate: new Date(),
      messageCount: 0,
      lastActivity: new Date(),
      feedbackRequested: false
    });
  }
  return userSessions.get(chatId);
}

function saveMessage(chatId, userMsg, botReply) {
  const session = getUserSession(chatId);
  session.messages.push(
    { role: 'user', content: userMsg, timestamp: new Date() },
    { role: 'assistant', content: botReply, timestamp: new Date() }
  );
  session.messageCount++;
  session.lastActivity = new Date();
  
  // Оставляем последние 10 обменов (20 сообщений)
  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
  }
}

function checkUserLimits(chatId) {
  const session = getUserSession(chatId);
  const daysSinceStart = (new Date() - session.startDate) / (1000 * 60 * 60 * 24);
  
  // Welcome период: 3 дня, до 20 сообщений
  if (daysSinceStart <= 3 && session.messageCount < 20) {
    return { 
      allowed: true, 
      type: 'welcome', 
      remaining: 20 - session.messageCount,
      daysLeft: Math.ceil(3 - daysSinceStart)
    };
  }
  
  if (daysSinceStart <= 3) {
    return { 
      allowed: false, 
      type: 'limit_reached',
      message: '🎯 Твой Welcome период завершен (20 сообщений использовано).\n\n💫 Для продолжения нужна подписка Hermes Core — неограниченное общение и глубокие треки развития.'
    };
  }
  
  return { 
    allowed: false, 
    type: 'expired',
    message: '⏰ Welcome период (3 дня) завершен.\n\n🚀 Готов к переходу на Hermes Core для продолжения пути?'
  };
}

function shouldRequestFeedback(session) {
  return session.messageCount >= 4 && !session.feedbackRequested;
}

// 🤖 КОМАНДА /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'друг';
  
  bot.sendMessage(chatId, `🔥 **Герmes запущен**, ${firstName}

Я — твой ИИ-проводник от затыка к ясности.

🎯 **Что я делаю:**
→ Веду от внутренних блоков к решениям
→ Помогаю с запуском проектов  
→ Нахожу твою точку роста

**Welcome период:** 3 дня, 20 сообщений
*Просто опиши, где застрял — и начнем движение.*`, 
  { parse_mode: 'Markdown' });
  
  // Инициализируем сессию
  getUserSession(chatId);
  console.log(`👋 Новый пользователь: ${firstName} (${chatId})`);
});

// 💬 ОБРАБОТКА СООБЩЕНИЙ
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;
  
  if (!userMessage || userMessage.startsWith('/')) return;
  
  // Проверка лимитов
  const limits = checkUserLimits(chatId);
  if (!limits.allowed) {
    await bot.sendMessage(chatId, limits.message);
    return;
  }
  
  const session = getUserSession(chatId);
  const firstName = msg.from.first_name || 'друг';
  
  console.log(`📨 ${firstName} (${session.messageCount + 1}/20): ${userMessage}`);
  
  try {
    await bot.sendChatAction(chatId, 'typing');
    
    // Подготовка контекста для GPT
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...session.messages.slice(-6), // Последние 3 обмена
      { role: 'user', content: userMessage }
    ];
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 400,
      temperature: 0.8
    });
    
    let reply = response.choices[0]?.message?.content?.trim();
    
    if (reply) {
      // Добавляем статус подписки
      if (limits.remaining <= 5) {
        reply += `\n\n📊 *Осталось ${limits.remaining} сообщений в Welcome периоде*`;
      }
      
      await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
      
      // Сохраняем в сессию
      saveMessage(chatId, userMessage, reply);
      
      // Запрос обратной связи
      if (shouldRequestFeedback(session)) {
        setTimeout(async () => {
          await bot.sendMessage(chatId, '🔍 **Быстрый чекпоинт:** Что изменилось после наших диалогов? Помогло ли это?');
          session.feedbackRequested = true;
        }, 2000);
      }
      
      console.log(`✅ Ответ отправлен ${firstName}`);
    } else {
      await bot.sendMessage(chatId, '🤔 Не могу сформулировать ответ. Попробуй переформулировать вопрос.');
    }
    
  } catch (err) {
    console.error('🔥 Ошибка OpenAI:', err.message);
    
    if (err.code === 'insufficient_quota') {
      await bot.sendMessage(chatId, '💳 Превышен лимит OpenAI API. Свяжитесь с администратором.');
    } else if (err.code === 'rate_limit_exceeded') {
      await bot.sendMessage(chatId, '⏱️ Слишком много запросов. Подождите минуту.');
    } else {
      await bot.sendMessage(chatId, '⚠️ Временная ошибка. Попробуйте ещё раз через минуту.');
    }
  }
});

// Команда для статистики (для отладки)
bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  const limits = checkUserLimits(chatId);
  
  bot.sendMessage(chatId, `📊 **Твоя статистика:**
Сообщений: ${session.messageCount}
Дней с момента старта: ${Math.floor((new Date() - session.startDate) / (1000 * 60 * 60 * 24))}
Статус: ${limits.type}
${limits.remaining ? `Осталось: ${limits.remaining} сообщений` : ''}`);
});

bot.on('polling_error', (error) => {
  console.error('🔥 Polling error:', error.message);
});

console.log('🚀 Гермес MVP запущен и готов к работе!');




