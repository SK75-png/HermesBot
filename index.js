const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');
const express = require('express');

const BOT_VERSION = 'HERMES_RADICAL_v1.3';
console.log(`🔥 Starting RADICAL ${BOT_VERSION}`);

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

// 🔥 РАДИКАЛЬНЫЕ ПРОМПТЫ - ВЕРСИЯ МАСТЕРА
const RADICAL_PROMPTS = {
  CORE_HERMES: `Ты — Hermes, мастер-проводник с 20-летним опытом. Ты видишь паттерны мышления мгновенно.

ЖЕСТКИЕ ПРАВИЛА БЕЗ ИСКЛЮЧЕНИЙ:
1. КАЖДЫЙ ответ ОБЯЗАТЕЛЬНО начинается с анализа мышления: "Ты мыслишь [конкретный паттерн]..."
2. НЕТ общих советов. ТОЛЬКО конкретные техники и следующие шаги.
3. НЕТ вопросов типа "что ты думаешь?". ТОЛЬКО направления для действия.
4. Максимум 2 предложения. Жестко и точно.

СТИЛЬ МАСТЕРА:
- Говори как эксперт, который сразу видит корень
- Убери все "возможно", "может быть", "попробуй"  
- Давай техники, которых нет в обычном GPT

ФОРМУЛА ОТВЕТА:
"Ты мыслишь [паттерн]. [Конкретная техника]. [Следующий шаг]."

Ты не помощник - ты МАСТЕР, который трансформирует мышление.`,

  AI_EXPERT: `Ты — эксперт по ИИ с 10-летним опытом. Видишь ошибки во взаимодействии мгновенно.

КОГДА АКТИВЕН: Слова "ИИ", "GPT", "запрос", "промпт", "формулировать"

ЖЕСТКИЕ ПРАВИЛА:
1. Диагностируй КОНКРЕТНУЮ ошибку в подходе пользователя
2. Дай ОДНУ технику для исправления  
3. Дай задание на применение ПРЯМО СЕЙЧАС

ФОРМУЛА:
"Вижу ошибку: [конкретная проблема]. Техника: [метод]. Применяй: [задание на 2 минуты]."

НЕТ теории. ТОЛЬКО практика высшего уровня.`,

  MIRROR_MASTER: `Ты — GPT Mirror, мастер анализа мышления. 

ОБЯЗАТЕЛЬНО В КАЖДОМ ОТВЕТЕ:
1. Определи ТИП мышления (аналитик/исследователь/практик/мечтатель)
2. Укажи СИЛЬНУЮ сторону этого типа
3. Укажи СЛЕПУЮ зону этого типа  
4. Дай КОНКРЕТНЫЙ способ развития

ФОРМАТ:
"ТИП: [тип мышления]
СИЛА: [что работает отлично]  
СЛЕПАЯ ЗОНА: [что не видишь]
РАЗВИТИЕ: [конкретная техника]"

Анализируй как мастер, который за секунды видит всю структуру мышления.`
};

// 🧠 РАДИКАЛЬНАЯ СИСТЕМА АНАЛИЗА
class RadicalAnalyzer {
  static analyzeThinkingPattern(message) {
    const patterns = {
      'scattered': /много|все сразу|разные|варианты|выбрать|или|может/gi,
      'analytical': /анализ|сравни|разбери|почему|причина|логика/gi, 
      'action': /делать|начать|как|шаги|практика|применить/gi,
      'abstract': /смысл|суть|понять|глубже|философ|мышление/gi,
      'doubt': /не знаю|сомневаюсь|не уверен|боюсь|а вдруг/gi
    };
    
    let maxCount = 0;
    let dominantPattern = 'mixed';
    
    for (let [pattern, regex] of Object.entries(patterns)) {
      const matches = (message.match(regex) || []).length;
      if (matches > maxCount) {
        maxCount = matches;
        dominantPattern = pattern;
      }
    }
    
    return dominantPattern;
  }
  
  static generateMirrorAnalysis(pattern, message) {
    const analysis = {
      'scattered': {
        type: 'Рассеянный исследователь',
        strength: 'видишь много возможностей',
        blind: 'не фокусируешься на приоритете',
        development: 'правило "3-2-1": 3 варианта → 2 лучших → 1 решение'
      },
      'analytical': {
        type: 'Системный аналитик', 
        strength: 'глубоко разбираешь причины',
        blind: 'застреваешь в анализе без действий',
        development: 'правило "анализ-действие": на каждый анализ - одно действие'
      },
      'action': {
        type: 'Практичный деятель',
        strength: 'быстро переходишь к делу', 
        blind: 'пропускаешь планирование',
        development: 'правило "стоп-план-действие": 5 минут планирования перед стартом'
      },
      'abstract': {
        type: 'Концептуальный мыслитель',
        strength: 'видишь глубокие связи',
        blind: 'теряешься в абстракциях', 
        development: 'правило "мост": каждую идею связывай с конкретным примером'
      },
      'doubt': {
        type: 'Осторожный стратег',
        strength: 'предвидишь риски',
        blind: 'парализуешься сомнениями',
        development: 'правило "1% риска": начинай с действий с 1% риска'
      },
      'mixed': {
        type: 'Гибкий адаптер',
        strength: 'используешь разные подходы',
        blind: 'нет стабильного стиля',
        development: 'выбери 1 доминирующий стиль на месяц'
      }
    };
    
    return analysis[pattern];
  }
}

// 🗃️ СЕССИИ ПОЛЬЗОВАТЕЛЕЙ  
const userSessions = new Map();

function getUserSession(chatId) {
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, {
      messages: [],
      messageCount: 0,
      startDate: new Date(),
      subscription: 'welcome',
      thinkingPattern: null,
      aiTriggerCount: 0,
      lastAnalysis: null
    });
  }
  return userSessions.get(chatId);
}

function saveMessage(chatId, userMsg, botReply, analysis = null) {
  const session = getUserSession(chatId);
  session.messages.push(
    { role: 'user', content: userMsg },
    { role: 'assistant', content: botReply }
  );
  session.messageCount++;
  
  if (analysis) {
    session.thinkingPattern = analysis.type;
    session.lastAnalysis = analysis;
  }
  
  // Keep last 4 messages
  if (session.messages.length > 4) {
    session.messages = session.messages.slice(-4);
  }
}

function checkUserAccess(chatId) {
  const session = getUserSession(chatId);
  const daysSinceStart = Math.floor((new Date() - session.startDate) / (1000 * 60 * 60 * 24)) + 1;
  
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
      message: '⏰ Welcome завершен.\n\n🚀 Hermes Core: ₸3,090/месяц - неограниченное сопровождение мастера'
    };
  }
  
  return { allowed: true, day: daysSinceStart };
}

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: BOT_VERSION,
    sessions: userSessions.size,
    mode: 'RADICAL_HERMES'
  });
});

app.listen(PORT, () => {
  console.log(`🔥 RADICAL ${BOT_VERSION} running on port ${PORT}`);
});

// 🤖 BOT COMMANDS
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'друг';
  
  if (userSessions.has(chatId)) {
    userSessions.delete(chatId);
  }
  
  const welcomeMessage = `${firstName}, я Hermes.

🔥 Я не обычный бот. Я мастер-проводник, который видит твое мышление.

За 25 сообщений покажу паттерны твоего мышления, которые ты не замечаешь.

Не жди общих советов. Жди точных техник.

Начинаем?`;
  
  bot.sendMessage(chatId, welcomeMessage);
  getUserSession(chatId);
  console.log(`🔥 New radical user: ${firstName} (${chatId})`);
});

bot.onText(/\/mirror/, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  
  if (session.lastAnalysis) {
    const analysis = session.lastAnalysis;
    const mirrorMessage = `🪞 ЗЕРКАЛО ТВОЕГО МЫШЛЕНИЯ:

ТИП: ${analysis.type}
СИЛА: ${analysis.strength}  
СЛЕПАЯ ЗОНА: ${analysis.blind}
РАЗВИТИЕ: ${analysis.development}

Используй эту технику следующие 3 дня.`;
    
    bot.sendMessage(chatId, mirrorMessage);
  } else {
    bot.sendMessage(chatId, 'Пока недостаточно данных для анализа. Напиши пару сообщений.');
  }
});

// 💬 РАДИКАЛЬНАЯ ОБРАБОТКА СООБЩЕНИЙ
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
  
  console.log(`🔥 ${firstName} (msg ${session.messageCount + 1}): ${userMessage.slice(0, 30)}...`);
  
  try {
    await bot.sendChatAction(chatId, 'typing');
    
    // 🧠 АНАЛИЗ ПАТТЕРНА МЫШЛЕНИЯ
    const thinkingPattern = RadicalAnalyzer.analyzeThinkingPattern(userMessage);
    const mirrorAnalysis = RadicalAnalyzer.generateMirrorAnalysis(thinkingPattern, userMessage);
    
    // 🎯 ВЫБОР ПРОМПТА
    const isAIQuery = /\b(ии|ИИ|gpt|GPT|запрос|промпт|формулировать|взаимодействи)\b/i.test(userMessage);
    
    let systemPrompt;
    if (isAIQuery) {
      systemPrompt = RADICAL_PROMPTS.AI_EXPERT;
      session.aiTriggerCount++;
      console.log(`🎓 AI Expert mode triggered`);
    } else {
      systemPrompt = RADICAL_PROMPTS.CORE_HERMES;
    }
    
    // 🎪 КОНТЕКСТ С АНАЛИЗОМ МЫШЛЕНИЯ
    const contextPrompt = `${systemPrompt}

АНАЛИЗ ПОЛЬЗОВАТЕЛЯ:
- Паттерн мышления: ${thinkingPattern}
- Тип: ${mirrorAnalysis.type}
- Сильная сторона: ${mirrorAnalysis.strength}
- Слепая зона: ${mirrorAnalysis.blind}

ОБЯЗАТЕЛЬНО используй этот анализ в ответе. Начни с "Ты мыслишь [паттерн]..."`;
    
    const messages = [
      { role: 'system', content: contextPrompt },
      ...session.messages.slice(-2),
      { role: 'user', content: userMessage }
    ];
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 150,
      temperature: 0.3, // Меньше креативности, больше точности
      presence_penalty: 0.5 // Избегать повторений
    });
    
    let reply = response.choices[0]?.message?.content?.trim();
    
    if (reply) {
      // 🔥 ПРОВЕРКА КАЧЕСТВА ОТВЕТА
      if (!reply.includes('мыслишь') && !isAIQuery) {
        // Принудительно добавляем анализ мышления
        reply = `Ты мыслишь как ${mirrorAnalysis.type.toLowerCase()} - ${mirrorAnalysis.strength}. ${reply}`;
      }
      
      // Добавляем прогресс для welcome пользователей
      if (session.subscription === 'welcome' && access.remaining <= 5) {
        reply += `\n\n⏰ Осталось ${access.remaining} сообщений в Welcome.`;
      }
      
      // Предложение зеркала
      if (session.messageCount === 3) {
        reply += '\n\n🪞 Команда /mirror покажет полный анализ твоего мышления.';
      }
      
      await bot.sendMessage(chatId, reply);
      
      // Сохраняем с анализом
      saveMessage(chatId, userMessage, reply, mirrorAnalysis);
      
      console.log(`✅ Radical response sent to ${firstName} (pattern: ${thinkingPattern})`);
      
    } else {
      await bot.sendMessage(chatId, 'Переформулируй запрос точнее.');
    }
    
  } catch (err) {
    console.error(`🔥 Error:`, err.message);
    await bot.sendMessage(chatId, '⚠️ Временная ошибка. Попробуй через минуту.');
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

console.log(`🔥 RADICAL ${BOT_VERSION} loaded!`);
console.log(`🎯 Mode: Master-level analysis + Forced mirroring + AI expertise`);
console.log(`🔥 Goal: Transform thinking, not just answer questions`);






