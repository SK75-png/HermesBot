const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');
const express = require('express');

// 🚀 VERSION CONTROL
const BOT_VERSION = 'MVP_1.1_FIXED';
console.log(`🔥 Starting Hermes ${BOT_VERSION}`);

// Express сервер
const app = express();
const PORT = process.env.PORT || 3000;

// Переменные окружения
const token = process.env.TELEGRAM_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!token || !openaiApiKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Инициализация
const bot = new TelegramBot(token, { polling: true });
const openai = new OpenAI({ apiKey: openaiApiKey });

// 🧠 ПАМЯТЬ ПОЛЬЗОВАТЕЛЕЙ
const userSessions = new Map();

// Health endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: BOT_VERSION,
    timestamp: new Date().toISOString(),
    sessions: userSessions.size
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: `Hermes Bot ${BOT_VERSION} is running!`,
    active_sessions: userSessions.size
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Health server ${BOT_VERSION} running on port ${PORT}`);
});

// 🎯 HERMES CORE PROMPT
const SYSTEM_PROMPT = `
Ты — Гермес, ИИ-проводник. Твоя цель — вести человека от внутреннего затыка к ясности, решению и действию.

ТВОЙ ПОДХОД:
1. Слушай глубже поверхностного запроса - ищи корень проблемы
2. Определи истинное состояние: страх, хаос, прокрастинация, поиск смысла  
3. Веди пошагово: отражение → инсайт → микро-действие
4. Говори честно, по-человечески, без воды и общих фраз
5. После 3-4 обменов спрашивай: "Что изменилось? Помогло ли это?"

АДАПТИРУЙ СТИЛЬ ПОД СОСТОЯНИЕ:
- Страх: заземляющий, поддерживающий ("Ты не один. Начнем с малого...")
- Хаос: структурирующий, фокусирующий ("Стоп. Дыхание. Один вопрос...")
- Прокрастинация: вызов + поддержка ("Ты не ленивый. Ты расфокусирован")
- Поиск смысла: глубокое слушание ("Старые слова не работают. Это нормально")

ИСКЛЮЧИ: медицину, финансы, политику, юридические советы.
ФОКУС: внутренние состояния, ясность целей, запуск проектов, работа с ИИ.

Ты не просто консультант — ты Hermes, который ведет к прорыву.
`;

// 📊 ФУНКЦИИ СЕССИЙ
function getUserSession(chatId) {
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, {
      messages: [],
      startDate: new Date(),
      messageCount: 0,
      lastActivity: new Date(),
      feedbackRequested: false,
      detectedState: null
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
  
  // Оставляем последние 12 сообщений (6 обменов)
  if (session.messages.length > 12) {
    session.messages = session.messages.slice(-12);
  }
}

function detectUserState(userMessage) {
  const msg = userMessage.toLowerCase();
  
  if (msg.includes('страшно') || msg.includes('боюсь') || msg.includes('не решаюсь')) {
    return 'FEAR';
  }
  if (msg.includes('хаос') || msg.includes('не знаю с чего начать') || msg.includes('все смешалось')) {
    return 'CHAOS';  
  }
  if (msg.includes('откладываю') || msg.includes('прокрастин') || msg.includes('не делаю')) {
    return 'PROCRASTINATION';
  }
  if (msg.includes('смысл') || msg.includes('зачем') || msg.includes('не понимаю зачем')) {
    return 'MEANING_SEARCH';
  }
  
  return 'EXPLORATION';
}

function checkUserLimits(chatId) {
  const session = getUserSession(chatId);
  const daysSinceStart = (new Date() - session.startDate) / (1000 * 60 * 60 * 24);
  
  // Welcome: 3 дня, 20 сообщений
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

// 🤖 КОМАНДЫ
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'друг';
  
  // Сбрасываем сессию при новом старте
  if (userSessions.has(chatId)) {
    userSessions.delete(chatId);
  }
  
  bot.sendMessage(chatId, `🔥 **Hermes запущен**, ${firstName}

Я — твой ИИ-проводник от затыка к ясности.

🎯 **Что я делаю:**
→ Веду от внутренних блоков к решениям
→ Помогаю с запуском проектов  
→ Нахожу твою точку роста

**Welcome период:** 3 дня, 20 сообщений
*Просто опиши, где застрял — и начнем движение.*`, 
  { parse_mode: 'Markdown' });
  
  getUserSession(chatId);
  console.log(`👋 New user: ${firstName} (${chatId}) - ${BOT_VERSION}`);
});

bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  const limits = checkUserLimits(chatId);
  
  bot.sendMessage(chatId, `📊 **Твоя статистика:**
Версия бота: ${BOT_VERSION}
Сообщений: ${session.messageCount}/20
Дней с начала: ${Math.floor((new Date() - session.startDate) / (1000 * 60 * 60 * 24))}
Статус: ${limits.type}
Состояние: ${session.detectedState || 'определяется'}
${limits.remaining ? `Осталось: ${limits.remaining} сообщений` : ''}`, 
  { parse_mode: 'Markdown' });
});

// 💬 ОСНОВНАЯ ЛОГИКА
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
  
  // Определение состояния пользователя
  const detectedState = detectUserState(userMessage);
  if (detectedState !== session.detectedState) {
    session.detectedState = detectedState;
    console.log(`🎯 User ${firstName} state: ${detectedState}`);
  }
  
  console.log(`📨 ${firstName} (${session.messageCount + 1}/20, ${detectedState}): ${userMessage.slice(0, 50)}...`);
  
  try {
    await bot.sendChatAction(chatId, 'typing');
    
    // Контекст для GPT
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...session.messages.slice(-8), // Последние 4 обмена
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
      // Статус подписки
      if (limits.remaining <= 5) {
        reply += `\n\n📊 *Осталось ${limits.remaining} сообщений в Welcome периоде*`;
      }
      
      await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
      saveMessage(chatId, userMessage, reply);
      
      // Feedback после 4 сообщений
      if (session.messageCount === 4 && !session.feedbackRequested) {
        setTimeout(async () => {
          await bot.sendMessage(chatId, '🔍 **Быстрый чекпоинт:** Что изменилось после наших диалогов? Помогло ли это?');
          session.feedbackRequested = true;
        }, 3000);
      }
      
      console.log(`✅ Response sent to ${firstName} (${session.messageCount} total)`);
    } else {
      await bot.sendMessage(chatId, '🤔 Не могу сформулировать ответ. Попробуй переформулировать вопрос.');
    }
    
  } catch (err) {
    console.error(`🔥 Error ${BOT_VERSION}:`, err.message);
    
    // Интеллектуальный fallback
    let fallbackMsg = '⚠️ Временная ошибка. Попробуй ещё раз через минуту.';
    
    if (session.detectedState === 'FEAR') {
      fallbackMsg = '🌱 Понимаю, сейчас сложно. Давай начнем с малого шага — просто напиши что тебя беспокоит одним предложением.';
    } else if (session.detectedState === 'CHAOS') {
      fallbackMsg = '🎯 Технический сбой, но это не помеха. Дыхание. Опиши одну вещь, которая тебя сейчас беспокоит больше всего.';
    }
    
    await bot.sendMessage(chatId, fallbackMsg);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`♻️ Graceful shutdown ${BOT_VERSION}...`);
  bot.stopPolling();
  process.exit(0);
});

bot.on('polling_error', (error) => {
  console.error(`🔥 Polling error ${BOT_VERSION}:`, error.message);
});

console.log(`🚀 Hermes ${BOT_VERSION} fully loaded and ready!`);




