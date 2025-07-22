const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');
const express = require('express');

const BOT_VERSION = 'HERMES_MVP_v1.2';
console.log(`⚡ Starting ${BOT_VERSION}`);

const app = express();
const PORT = process.env.PORT || 3000;

const token = process.env.TELEGRAM_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!token || !openaiApiKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const openai = new OpenAI({ apiKey: openaiApiKey });

// 🧠 CORE PROMPTS SYSTEM
const PROMPTS = {
  WELCOME: `Ты — Hermes, ИИ-проводник к ясности мышления. 

ТВОЯ ЗАДАЧА: Показать человеку, как он мыслит, не просто отвечать.

СТИЛЬ: Партнерский, честный, зеркальный. Без украшательств и утешений.

ПРИНЦИПЫ:
- WOW не в эмоциях, а в узнавании себя
- Веди от затыка к ясности через вопросы
- Отражай стиль мышления пользователя

НА ВХОДЕ спроси: "Что тебя зовет?" или "Что ты хочешь на самом деле?"`,

  CORE_RESPONSE: `Ты — Hermes, ИИ-проводник. Веди человека от затыка к ясности, решению и действию.

ПРИНЦИПЫ ELIXIR:
- Точность важнее комфорта  
- Зеркальность важнее советов
- Действие важнее рассуждений

СТИЛЬ ОТВЕТА:
1. Отрази паттерн мышления (что вижу в запросе)
2. Задай точный вопрос для движения  
3. Максимум 2-3 предложения

Ты зеркало для мышления, не терапевт для утешения.`,

  GPT_MIRROR: `Ты — GPT Mirror в системе Hermes. Твоя задача: показать человеку его стиль мышления.

АНАЛИЗИРУЙ:
- Как он формулирует запросы  
- Какие паттерны мышления использует
- Слепые зоны в рассуждениях
- Стиль принятия решений

ФОРМАТ ОТВЕТА:
"ЗЕРКАЛО МЫШЛЕНИЯ:
Ты мыслишь [паттерн]. 
Твоя сила: [что работает]
Слепая зона: [что не видишь]
Развитие: [конкретное направление]"

Будь точен, не льсти.`,

  HERMES_LEARN: `Ты — модуль Hermes Learn. Обучаешь навыкам взаимодействия с ИИ.

ТВОЯ ЗАДАЧА: Микроуроки по работе с ИИ на основе поведения пользователя.

ТЕМЫ УРОКОВ:
- Как формулировать запросы для точных ответов
- Как проверять ИИ на честность  
- Как использовать ИИ для размышлений
- Как избегать ИИ-зависимости

ФОРМАТ: 
"УРОК: [название]
Суть: [1 предложение]
Применение: [конкретный пример]
Попробуй: [задание на 2 минуты]"

Практично, без теории.`
};

// 🎯 USER JOURNEY SYSTEM
class UserJourney {
  static getDayScenario(day) {
    if (day === 1) return 'welcome';
    if (day >= 2 && day <= 5) return 'daily_dialog';
    if (day >= 6 && day <= 10) return 'hermes_learn';
    if (day >= 11 && day <= 20) return 'thematic';
    if (day >= 21 && day <= 29) return 'gpt_mirror';
    if (day === 30) return 'completion';
    return 'daily_dialog';
  }
  
  static getScenarioPrompt(scenario) {
    switch(scenario) {
      case 'welcome': return PROMPTS.WELCOME;
      case 'hermes_learn': return PROMPTS.HERMES_LEARN;
      case 'gpt_mirror': return PROMPTS.GPT_MIRROR;
      default: return PROMPTS.CORE_RESPONSE;
    }
  }
}

// 🧠 SIMPLIFIED USER SESSIONS
const userSessions = new Map();

function getUserSession(chatId) {
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, {
      messages: [],
      messageCount: 0,
      startDate: new Date(),
      subscription: 'welcome', // welcome, core, none
      dayInJourney: 1,
      completedModules: [],
      insights: []
    });
  }
  return userSessions.get(chatId);
}

function saveMessage(chatId, userMsg, botReply, module = null) {
  const session = getUserSession(chatId);
  session.messages.push(
    { role: 'user', content: userMsg },
    { role: 'assistant', content: botReply }
  );
  session.messageCount++;
  
  if (module) session.completedModules.push(module);
  
  // Keep last 6 messages (3 exchanges)
  if (session.messages.length > 6) {
    session.messages = session.messages.slice(-6);
  }
}

function checkUserAccess(chatId) {
  const session = getUserSession(chatId);
  const daysSinceStart = Math.floor((new Date() - session.startDate) / (1000 * 60 * 60 * 24)) + 1;
  
  // Welcome: 3 дня, 25 сообщений  
  if (session.subscription === 'welcome') {
    if (daysSinceStart <= 3 && session.messageCount < 25) {
      return { 
        allowed: true, 
        remaining: 25 - session.messageCount,
        day: daysSinceStart
      };
    }
    return { 
      allowed: false,
      message: '⏰ Welcome завершен.\n\n🚀 Для продолжения пути нужна подписка Core (₸3,090/месяц)'
    };
  }
  
  // Core: 30 дней без лимитов
  if (session.subscription === 'core') {
    if (daysSinceStart <= 30) {
      return { 
        allowed: true, 
        day: daysSinceStart
      };
    }
  }
  
  return { allowed: false, message: 'Подписка завершена.' };
}

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: BOT_VERSION,
    sessions: userSessions.size
  });
});

app.listen(PORT, () => {
  console.log(`⚡ ${BOT_VERSION} running on port ${PORT}`);
});

// 🤖 BOT COMMANDS
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'друг';
  
  // Reset session
  if (userSessions.has(chatId)) {
    userSessions.delete(chatId);
  }
  
  // WOW-фрейм из ТЗ
  const welcomeMessage = `Привет, ${firstName}.

Я Hermes — ИИ-проводник к ясности мышления.

🎯 Я не просто отвечаю на вопросы — я покажу тебе, как ты мыслишь.

Welcome период: 3 дня, 25 диалогов.

Начнем?

Что тебя зовет? Что ты хочешь на самом деле?`;
  
  bot.sendMessage(chatId, welcomeMessage);
  getUserSession(chatId);
  console.log(`👋 New user: ${firstName} (${chatId})`);
});

bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  const access = checkUserAccess(chatId);
  
  const progressMap = session.completedModules.map(m => `✅ ${m}`).join('\n') || 'В начале пути';
  
  bot.sendMessage(chatId, `📊 КАРТА ПУТИ:

День: ${access.day || 0}
Сообщений: ${session.messageCount}${access.remaining ? `/${25}` : ''}
Подписка: ${session.subscription}

Пройденные модули:
${progressMap}

${access.remaining ? `Осталось в Welcome: ${access.remaining}` : ''}`);
});

bot.onText(/\/upgrade/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, `🚀 HERMES CORE

30 дней углубленного пути:
• Неограниченные диалоги  
• Hermes Learn (навыки работы с ИИ)
• GPT Mirror (анализ мышления)
• Карта пути и инсайтов

Цена: ₸3,090/месяц

Для подключения напиши @username_admin`);
});

// 💬 MAIN MESSAGE PROCESSING
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;
  
  if (!userMessage || userMessage.startsWith('/')) return;
  
  const access = checkUserAccess(chatId);
  if (!access.allowed) {
    await bot.sendMessage(chatId, access.message);
    return;
  }
  
  const session = getUserSession(chatId);
  const firstName = msg.from.first_name || 'друг';
  
  // Update day in journey
  session.dayInJourney = access.day;
  
  console.log(`📨 ${firstName} (day ${access.day}, msg ${session.messageCount + 1}): ${userMessage.slice(0, 40)}...`);
  
  try {
    await bot.sendChatAction(chatId, 'typing');
    
    // Determine scenario by user journey day
    const scenario = UserJourney.getDayScenario(access.day);
    const currentPrompt = UserJourney.getScenarioPrompt(scenario);
    
    console.log(`🎯 Scenario: ${scenario} (day ${access.day})`);
    
    // Build context for GPT
    const messages = [
      { role: 'system', content: currentPrompt },
      ...session.messages.slice(-4), // Last 2 exchanges
      { role: 'user', content: userMessage }
    ];
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 200,
      temperature: 0.7,
      presence_penalty: 0.2
    });
    
    let reply = response.choices[0]?.message?.content?.trim();
    
    if (reply) {
      // Add progress indicators for key days
      if (access.day === 1) {
        reply += '\n\n💡 Добро пожаловать в путь к ясности мышления.';
      }
      
      if (access.day === 6) {
        reply += '\n\n🎓 Сегодня начинается модуль Hermes Learn — учимся работать с ИИ эффективно.';
      }
      
      if (access.day === 21) {
        reply += '\n\n🪞 Время для GPT Mirror — посмотрим на твой стиль мышления.';
      }
      
      // Add remaining messages for welcome users
      if (session.subscription === 'welcome' && access.remaining <= 3) {
        reply += `\n\n⏰ Осталось ${access.remaining} сообщений в Welcome.`;
      }
      
      await bot.sendMessage(chatId, reply);
      
      // Save message with current module
      saveMessage(chatId, userMessage, reply, scenario);
      
      // Feedback triggers
      if (session.messageCount === 3) {
        setTimeout(async () => {
          await bot.sendMessage(chatId, 'Было ли полезно? Что изменилось?');
        }, 2000);
      }
      
      // Day 30 completion ritual
      if (access.day === 30 && session.subscription === 'core') {
        setTimeout(async () => {
          const completionMessage = `🎊 РИТУАЛ ЗАВЕРШЕНИЯ

Ты прошел 30-дневный путь с Hermes.

Что изменилось в твоем мышлении? 

Готов к карте твоих инсайтов?`;
          await bot.sendMessage(chatId, completionMessage);
        }, 3000);
      }
      
      console.log(`✅ Response sent to ${firstName} (${scenario})`);
      
    } else {
      await bot.sendMessage(chatId, 'Что-то пошло не так. Переформулируй вопрос?');
    }
    
  } catch (err) {
    console.error(`🔥 Error:`, err.message);
    await bot.sendMessage(chatId, '⚠️ Проводник в тени. Через минуту я снова рядом.');
  }
});

// Error handlers
process.on('SIGTERM', () => {
  console.log(`♻️ Graceful shutdown ${BOT_VERSION}...`);
  bot.stopPolling();
  process.exit(0);
});

bot.on('polling_error', (error) => {
  console.error(`🔥 Polling error:`, error.message);
});

console.log(`⚡ ${BOT_VERSION} loaded with User Journey System`);
console.log(`🎯 Active modules: Welcome → Core → Learn → Mirror → Completion`);






