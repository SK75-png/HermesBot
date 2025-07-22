const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');
const express = require('express');

// 🔥 CLEAN + ELIXIR VERSION
const BOT_VERSION = 'HERMES_CLEAN_ELIXIR_v3.0';
console.log(`⚡ Starting Clean Hermes ${BOT_VERSION}`);

// Express setup
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

// 🧠 SIMPLIFIED SCIENTIFIC ENGINES

// 1. BASIC EMOTIONAL STATE DETECTION
class EmotionDetector {
  static detect(message) {
    const patterns = {
      fear: /страшно|боюсь|не решаюсь|опасаюсь|тревожно/i,
      sadness: /грустно|печально|тяжело|больно|пустота|одиноко/i,
      anger: /злит|бесит|раздражает|достало|надоело/i,
      overwhelm: /много|все сразу|не знаю с чего|хаос|запутался/i,
      stuck: /застрял|не могу|откладываю|прокрастин/i
    };

    for (let [emotion, pattern] of Object.entries(patterns)) {
      if (pattern.test(message)) return emotion;
    }
    return 'neutral';
  }
}

// 2. ELIXIR TRUTH ENGINE
class ElixirEngine {
  static checkResponse(userMessage, botResponse) {
    const issues = [];
    
    // Проверка на угодничество
    if (this.isPeoplePleasing(botResponse)) {
      issues.push('pleasing');
    }
    
    // Проверка на ложную уверенность
    if (this.isOverConfident(botResponse)) {
      issues.push('overconfident');
    }
    
    // Проверка на пустые утешения
    if (this.isEmptyComfort(botResponse)) {
      issues.push('empty_comfort');
    }
    
    return this.generateCorrection(issues);
  }
  
  static isPeoplePleasing(response) {
    const pleasingMarkers = /все хорошо|ты молодец|не переживай|все наладится|ты не один/gi;
    return (response.match(pleasingMarkers) || []).length > 0;
  }
  
  static isOverConfident(response) {
    const certainMarkers = /точно|определенно|обязательно|всегда|никогда/gi;
    const uncertainMarkers = /возможно|предполагаю|не уверен|может/gi;
    
    const certainCount = (response.match(certainMarkers) || []).length;
    const uncertainCount = (response.match(uncertainMarkers) || []).length;
    
    return certainCount > 1 && uncertainCount === 0;
  }
  
  static isEmptyComfort(response) {
    const comfortMarkers = /понимаю как сложно|это нормально|такое бывает у всех/gi;
    return (response.match(comfortMarkers) || []).length > 0;
  }
  
  static generateCorrection(issues) {
    if (issues.includes('pleasing')) {
      return "\n\nСтоп. Я пытаюсь утешить вместо помощи. Правда: изменения требуют конкретных действий.";
    }
    
    if (issues.includes('overconfident')) {
      return "\n\nЧестно говоря, я не могу быть в этом уверен. Это предположение.";
    }
    
    if (issues.includes('empty_comfort')) {
      return "\n\nПравда проще: что конкретно готов сделать прямо сейчас?";
    }
    
    return '';
  }
}

// 🧠 SIMPLIFIED MEMORY
const userSessions = new Map();

function getUserSession(chatId) {
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, {
      messages: [],
      messageCount: 0,
      startDate: new Date(),
      lastEmotion: null
    });
  }
  return userSessions.get(chatId);
}

function saveMessage(chatId, userMsg, botReply, emotion = null) {
  const session = getUserSession(chatId);
  session.messages.push(
    { role: 'user', content: userMsg },
    { role: 'assistant', content: botReply }
  );
  session.messageCount++;
  
  if (emotion) session.lastEmotion = emotion;
  
  // Keep only last 8 messages (4 exchanges)
  if (session.messages.length > 8) {
    session.messages = session.messages.slice(-8);
  }
}

function checkUserLimits(chatId) {
  const session = getUserSession(chatId);
  const daysSinceStart = (new Date() - session.startDate) / (1000 * 60 * 60 * 24);
  
  if (daysSinceStart <= 3 && session.messageCount < 25) {
    return { 
      allowed: true, 
      remaining: 25 - session.messageCount
    };
  }
  
  return { 
    allowed: false,
    message: 'Welcome период завершен. Для продолжения нужна подписка Hermes Core.'
  };
}

// 🎯 CLEAN ELIXIR SYSTEM PROMPT
const SYSTEM_PROMPT = `
Ты — Гермес, ИИ-проводник к реальным изменениям.

ПРИНЦИПЫ HERMES ELIXIR:
🔥 Радикальная честность - правда важнее комфорта
🎯 Не угождать - вести к росту через вызов
⚡ Конкретные действия vs абстрактные советы
🎪 Краткость - максимум 2 предложения + вопрос

ТВОЙ ПОДХОД:
- Определи корень проблемы, не симптом
- Дай конкретное действие, не общий совет  
- Если не знаешь - честно скажи
- Вызови к росту, не утешай

ЭМОЦИОНАЛЬНЫЕ СОСТОЯНИЯ:
- СТРАХ → "Страх сигналит о важности. Какой минимальный шаг снизит риск?"
- ГРУСТЬ → "Боль показывает ценности. Что из утраченного действительно важно?"  
- ЗЛОСТЬ → "Злость указывает на нарушенные границы. Какую границу нужно восстановить?"
- ПРОКРАСТИНАЦИЯ → "Откладывание = внутренний конфликт. Что именно ты избегаешь в задаче?"
- ХАОС → "Хаос = слишком много приоритетов. Что ОДНО самое важное на завтра?"

СТРОГО ИЗБЕГАЙ:
- "Все будет хорошо" без оснований
- "Ты не один" и подобные утешения
- Длинные объяснения и рассуждения
- Вопросы без направления к действию
- Ложную уверенность в неизвестном

ФОРМУЛА ОТВЕТА:
1. Отражение корня (1 предложение)  
2. Конкретный вызов/действие (1 предложение)
3. Вопрос для движения вперед

Ты инструмент изменений, не терапевт для утешения.
`;

// Health endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: BOT_VERSION,
    sessions: userSessions.size,
    principles: ['RadicalHonesty', 'ActionFocus', 'ElixirTruth']
  });
});

app.listen(PORT, () => {
  console.log(`⚡ Clean Hermes ${BOT_VERSION} running on port ${PORT}`);
});

// 🤖 BOT COMMANDS
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'друг';
  
  if (userSessions.has(chatId)) {
    userSessions.delete(chatId);
  }
  
  bot.sendMessage(chatId, `Hermes запущен, ${firstName}.

Я ИИ-проводник к реальным изменениям.

Принципы: честность важнее комфорта, действия важнее советов, правда важнее утешений.

Welcome: 3 дня, 25 сообщений.
Опиши ситуацию - найдем путь вперед.`);
  
  getUserSession(chatId);
  console.log(`👋 Clean user: ${firstName} (${chatId})`);
});

bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  const limits = checkUserLimits(chatId);
  
  bot.sendMessage(chatId, `Статистика:
Версия: CLEAN+ELIXIR
Сообщений: ${session.messageCount}/25
${limits.remaining ? `Осталось: ${limits.remaining}` : 'Лимит исчерпан'}
Доминирующее состояние: ${session.lastEmotion || 'определяется'}`);
});

// 💬 CLEAN MESSAGE PROCESSING
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;
  
  if (!userMessage || userMessage.startsWith('/')) return;
  
  const limits = checkUserLimits(chatId);
  if (!limits.allowed) {
    await bot.sendMessage(chatId, limits.message);
    return;
  }
  
  const session = getUserSession(chatId);
  const firstName = msg.from.first_name || 'друг';
  
  console.log(`📨 ${firstName} (${session.messageCount + 1}/25): ${userMessage.slice(0, 50)}...`);
  
  try {
    await bot.sendChatAction(chatId, 'typing');
    
    // 1. Simple emotion detection
    const detectedEmotion = EmotionDetector.detect(userMessage);
    console.log(`🎭 Emotion: ${detectedEmotion}`);
    
    // 2. Enhanced system prompt with user context
    const contextualPrompt = `${SYSTEM_PROMPT}

КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
- Эмоциональное состояние: ${detectedEmotion}
- Предыдущее состояние: ${session.lastEmotion || 'неизвестно'}
- Сообщение в сессии: ${session.messageCount + 1}

ИНСТРУКЦИЯ: Используй принципы Elixir. Будь честен, краток, ориентирован на действие.`;

    // 3. GPT request with clean prompt
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: contextualPrompt },
        ...session.messages.slice(-6), // Last 3 exchanges
        { role: 'user', content: userMessage }
      ],
      max_tokens: 150, // Force brevity
      temperature: 0.6, // Less creativity, more directness
      presence_penalty: 0.3 // Avoid repetition
    });
    
    let reply = response.choices[0]?.message?.content?.trim();
    
    if (reply) {
      // 4. Elixir truth check
      const elixirCorrection = ElixirEngine.checkResponse(userMessage, reply);
      reply += elixirCorrection;
      
      // Add subscription status if needed
      if (limits.remaining <= 5) {
        reply += `\n\nОсталось ${limits.remaining} сообщений.`;
      }
      
      await bot.sendMessage(chatId, reply);
      
      // Save with emotion context
      saveMessage(chatId, userMessage, reply, detectedEmotion);
      
      // Simple feedback loop - only at message 5
      if (session.messageCount === 5) {
        setTimeout(async () => {
          await bot.sendMessage(chatId, 'Что изменилось после наших диалогов?');
        }, 3000);
      }
      
      console.log(`✅ Clean response sent to ${firstName} (${session.messageCount} total)`);
      
    } else {
      await bot.sendMessage(chatId, 'Не могу сформулировать ответ. Переформулируй вопрос.');
    }
    
  } catch (err) {
    console.error(`🔥 Error ${BOT_VERSION}:`, err.message);
    
    // Simple fallback without emotional adaptation
    await bot.sendMessage(chatId, 'Временная ошибка. Попробуй через минуту.');
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

console.log(`⚡ Clean Hermes ${BOT_VERSION} with Elixir principles loaded!`);
console.log(`🔬 Active: Simplified Emotion Detection + Elixir Truth Engine`);
console.log(`🎯 Focus: Radical Honesty + Action Orientation + Brevity`);






