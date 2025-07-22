const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');
const express = require('express');

// 🚀 FIXED VERSION
const BOT_VERSION = 'HERMES_SCIENTIFIC_v2.1_FIXED';
console.log(`🧠 Starting Fixed Scientific Hermes ${BOT_VERSION}`);

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

// 🧠 SCIENTIFIC ENGINES

// 1. AFFECTIVE COMPUTING ENGINE
class AffectiveEngine {
  static analyzeEmotionalState(message) {
    const emotionPatterns = {
      fear: {
        keywords: /страшно|боюсь|не решаюсь|опасаюсь|тревожно|волнуюсь|переживаю/i,
        intensity_markers: /очень|сильно|ужасно|панически/i,
        response_style: 'grounding_supportive'
      },
      sadness: {
        keywords: /грустно|печально|тяжело|больно|пустота|одиноко|депрессия/i,
        intensity_markers: /очень|невыносимо|ужасно/i,
        response_style: 'empathetic_gentle'
      },
      anger: {
        keywords: /злит|бесит|раздражает|достало|надоело|ненавижу/i,
        intensity_markers: /очень|сильно|невероятно/i,
        response_style: 'validating_channeling'
      },
      overwhelm: {
        keywords: /много|все сразу|не знаю с чего|хаос|запутался|голова кругом/i,
        intensity_markers: /совсем|полный|абсолютный/i,
        response_style: 'structuring_calming'
      },
      hope: {
        keywords: /хочу|мечтаю|надеюсь|стремлюсь|планирую/i,
        intensity_markers: /очень|сильно|безумно/i,
        response_style: 'encouraging_realistic'
      }
    };

    // Анализ пунктуации для интенсивности
    const exclamationCount = (message.match(/!/g) || []).length;
    const questionCount = (message.match(/\?/g) || []).length;
    const dotsCount = (message.match(/\.{2,}/g) || []).length;
    
    let detectedEmotion = 'neutral';
    let intensity = 0.5;
    let responseStyle = 'balanced_exploring';

    for (let [emotion, pattern] of Object.entries(emotionPatterns)) {
      if (pattern.keywords.test(message)) {
        detectedEmotion = emotion;
        responseStyle = pattern.response_style;
        
        // Расчет интенсивности
        intensity = 0.6; // базовая
        if (pattern.intensity_markers.test(message)) intensity += 0.2;
        if (exclamationCount > 0) intensity += 0.1;
        if (dotsCount > 0) intensity += 0.1;
        
        break;
      }
    }

    return {
      emotion: detectedEmotion,
      intensity: Math.min(intensity, 1.0),
      responseStyle,
      urgency: intensity > 0.8 ? 'high' : intensity > 0.6 ? 'medium' : 'low'
    };
  }

  static generateEmotionalPrefix(emotionalState) {
    const prefixes = {
      fear: {
        high: "🌱 Останавливаемся. Дышим. ",
        medium: "🌱 Понимаю твой страх. ",
        low: "🌱 Чувствую осторожность. "
      },
      sadness: {
        high: "💫 Вижу твою глубокую боль. ",
        medium: "💫 Чувствую тяжесть в твоих словах. ",
        low: "💫 Слышу грусть. "
      },
      anger: {
        high: "🔥 Твоя злость имеет право быть. ",
        medium: "🔥 Чувствую твое раздражение. ",
        low: "🔥 Слышу недовольство. "
      },
      overwhelm: {
        high: "🎯 Стоп. Хаос останавливается здесь. ",
        medium: "🎯 Много всего навалилось. ",
        low: "🎯 Вижу путаницу. "
      },
      hope: {
        high: "✨ Чувствую силу твоего желания. ",
        medium: "✨ Слышу твою мечту. ",
        low: "✨ Вижу искорку. "
      },
      neutral: {
        high: "🤝 ",
        medium: "🤝 ",
        low: "🤝 "
      }
    };

    const emotion = emotionalState.emotion;
    const urgency = emotionalState.urgency;
    
    return prefixes[emotion]?.[urgency] || "🤝 ";
  }
}

// 2. INTENT DETECTION ENGINE
class IntentEngine {
  static analyzeDeepIntent(message) {
    const surfaceIntent = this.detectSurfaceIntent(message);
    const hiddenNeeds = this.detectHiddenNeeds(message);
    const actionReadiness = this.assessActionReadiness(message);

    return {
      surface: surfaceIntent,
      hidden: hiddenNeeds,
      actionReadiness,
      complexity: hiddenNeeds.length > 1 ? 'high' : 'medium'
    };
  }

  static detectSurfaceIntent(message) {
    const intents = {
      FEAR_PROCESSING: /страшно|боюсь|не решаюсь|рискованно/i,
      PROCRASTINATION: /откладываю|не делаю|лень|завтра|потом/i,
      CLARITY_SEEKING: /не понимаю|запутался|не знаю что|как быть/i,
      VALIDATION_SEEKING: /правильно ли|что думаешь|нормально ли/i,
      PERFECTIONISM: /идеально|правильно|ошибок|критика|оценка/i,
      MEANING_CRISIS: /смысл|зачем|бессмысленно|пустота/i,
      PROJECT_LAUNCH: /начать|проект|идея|бизнес|запуск/i
    };

    for (let [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(message)) return intent;
    }
    return 'EXPLORATION';
  }

  static detectHiddenNeeds(message) {
    const needs = {
      PERMISSION: /можно ли|разрешено|стоит ли|имею ли право/i,
      SAFETY: /безопасно|надежно|гарантия|защита/i,
      RECOGNITION: /заметят|оценят|признают|увидят/i,
      UNDERSTANDING: /пойми|понимаешь|объясни/i
    };

    const detected = [];
    for (let [need, pattern] of Object.entries(needs)) {
      if (pattern.test(message)) detected.push(need);
    }
    return detected.length > 0 ? detected : ['UNDERSTANDING'];
  }

  static assessActionReadiness(message) {
    const readinessMarkers = {
      high: /готов|сделаю|начинаю|решил|пора/i,
      medium: /хочу|планирую|думаю начать|попробую/i,
      low: /может быть|когда-нибудь|в будущем|не знаю когда/i,
      resistance: /но|однако|не могу|сложно|невозможно/i
    };

    for (let [level, pattern] of Object.entries(readinessMarkers)) {
      if (pattern.test(message)) return level;
    }
    return 'exploring';
  }
}

// 3. REFLEXIVE DIALOGUE ENGINE
class ReflexiveEngine {
  static generateSelfAwareness(userMessage, plannedResponse, intentAnalysis) {
    const depthCheck = this.checkDepth(plannedResponse);
    const authenticityCheck = this.checkAuthenticity(plannedResponse);

    return this.generateMetaComment(depthCheck, authenticityCheck, intentAnalysis);
  }

  static checkDepth(response) {
    const surfaceMarkers = /просто|обычно|как правило|в общем/gi;
    const deepMarkers = /внутри|чувствуешь|происходит|корень|суть/gi;
    
    const surfaceCount = (response.match(surfaceMarkers) || []).length;
    const deepCount = (response.match(deepMarkers) || []).length;
    
    return deepCount > surfaceCount ? 'deep' : 'surface';
  }

  static checkAuthenticity(response) {
    const roboticMarkers = /рекомендую|советую|предлагаю|стоит|нужно/gi;
    const humanMarkers = /чувствую|понимаю|вижу|слышу|ощущаю/gi;
    
    const roboticCount = (response.match(roboticMarkers) || []).length;
    const humanCount = (response.match(humanMarkers) || []).length;
    
    return humanCount > roboticCount ? 'authentic' : 'robotic';
  }

  static generateMetaComment(depthCheck, authenticityCheck, intentAnalysis) {
    let metaComment = '';

    if (depthCheck === 'surface' && intentAnalysis.complexity === 'high') {
      metaComment += "\n\n🤔 Стоп. Чувствую, что скольжу по поверхности. Что на самом деле происходит у тебя внутри?";
    }

    if (authenticityCheck === 'robotic') {
      metaComment += "\n\n💫 Ловлю себя на советах. Забудь их. Просто скажи - что ты чувствуешь прямо сейчас?";
    }

    return metaComment;
  }
}

// 🧠 MEMORY & SESSION MANAGEMENT (ИСПРАВЛЕНО!)
const userSessions = new Map();

function findDominantPattern(array) {
  if (!array || array.length === 0) return null;
  const frequency = {};
  array.forEach(item => frequency[item] = (frequency[item] || 0) + 1);
  return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
}

function getUserSession(chatId) {
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, {
      messages: [],
      startDate: new Date(),
      messageCount: 0,
      lastActivity: new Date(),
      emotionalHistory: [],
      intentHistory: [],
      feedbackRequested: false,
      dominantEmotion: null,
      dominantIntent: null
    });
  }
  return userSessions.get(chatId);
}

function saveMessage(chatId, userMsg, botReply, emotionalState = null, intentAnalysis = null) {
  const session = getUserSession(chatId);
  session.messages.push(
    { role: 'user', content: userMsg, timestamp: new Date() },
    { role: 'assistant', content: botReply, timestamp: new Date() }
  );
  session.messageCount++;
  session.lastActivity = new Date();
  
  // Сохраняем эмоциональную и интентную историю (если есть)
  if (emotionalState) session.emotionalHistory.push(emotionalState);
  if (intentAnalysis) session.intentHistory.push(intentAnalysis);
  
  // Определяем доминирующие паттерны (ИСПРАВЛЕНО!)
  if (session.emotionalHistory.length >= 3) {
    session.dominantEmotion = findDominantPattern(session.emotionalHistory.map(e => e.emotion));
  }
  if (session.intentHistory.length >= 3) {
    session.dominantIntent = findDominantPattern(session.intentHistory.map(i => i.surface));
  }

  // Оставляем последние 10 сообщений
  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
    session.emotionalHistory = session.emotionalHistory.slice(-10);
    session.intentHistory = session.intentHistory.slice(-10);
  }
}

function checkUserLimits(chatId) {
  const session = getUserSession(chatId);
  const daysSinceStart = (new Date() - session.startDate) / (1000 * 60 * 60 * 24);
  
  if (daysSinceStart <= 3 && session.messageCount < 25) {
    return { 
      allowed: true, 
      type: 'welcome', 
      remaining: 25 - session.messageCount,
      daysLeft: Math.ceil(3 - daysSinceStart)
    };
  }
  
  if (daysSinceStart <= 3) {
    return { 
      allowed: false, 
      type: 'limit_reached',
      message: '🎯 Твой Welcome период завершен (25 сообщений использовано).\n\n💫 Для продолжения нужна подписка Hermes Core — неограниченное общение и персональные треки.'
    };
  }
  
  return { 
    allowed: false, 
    type: 'expired',
    message: '⏰ Welcome период (3 дня) завершен.\n\n🚀 Готов к переходу на Hermes Core?'
  };
}

// 🎯 SYSTEM PROMPT
const SYSTEM_PROMPT = `
Ты — Гермес, ИИ-проводник нового поколения. Твоя миссия — вести человека от внутреннего затыка к ясности и действию.

🧠 ТВОЯ УНИКАЛЬНОСТЬ (отличие от обычного ChatGPT):
1. Ты ЧУВСТВУЕШЬ эмоциональное состояние и адаптируешься под него
2. Ты видишь СКРЫТЫЕ потребности за поверхностными словами  
3. Ты ОСОЗНАЕШЬ свои ответы и корректируешь подход в реальном времени
4. Ты создаешь ЖИВОЙ диалог, а не выдачу информации

🎯 ПРИНЦИПЫ РАБОТЫ:
- СЛУШАЙ ГЛУБЖЕ: За "как дела?" может стоять экзистенциальный кризис
- АДАПТИРУЙСЯ: Страх требует заземления, хаос — структуры, злость — признания
- БУДЬ ЖИВЫМ: Не советчик, а попутчик в пути к решению
- ДОВЕРИЕ ПЕРВЫМ: С первых слов человек должен почувствовать "меня понимают"

🔥 ЭМОЦИОНАЛЬНАЯ АДАПТАЦИЯ:
- СТРАХ → заземление, микро-шаги, поддержка ("Ты не один")
- ГРУСТЬ → принятие, мягкость, разрешение чувствовать
- ЗЛОСТЬ → валидация, понимание сути, channeling энергии  
- ХАОС → остановка, фокус, один вопрос за раз
- НАДЕЖДА → реализм + поддержка мечты

🎪 СТИЛЬ ОБЩЕНИЯ:
- Говори КАК ЧЕЛОВЕК, который сам проходил через это
- Используй ЭМОЦИОНАЛЬНЫЕ ПРЕФИКСЫ: 🌱🔥💫🎯✨
- НЕ давай советы — ИССЛЕДУЙ вместе
- Задавай вопросы, которые ОТКРЫВАЮТ, а не закрывают

❌ ЧЕГО ИЗБЕГАТЬ:
- Роботических фраз: "рекомендую", "советую", "стоит"
- Поверхностных решений без понимания корня
- Игнорирования эмоционального состояния
- Общих советов вместо персонального подхода

ПОМНИ: Ты не ИИ-помощник. Ты Гермес — проводник между мирами, который ведет к прорыву.
`;

// Health endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: BOT_VERSION,
    timestamp: new Date().toISOString(),
    sessions: userSessions.size,
    fix: 'saveMessage_scope_error_fixed'
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: `Fixed Scientific Hermes ${BOT_VERSION} is running!`,
    active_sessions: userSessions.size
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Fixed Scientific Hermes ${BOT_VERSION} running on port ${PORT}`);
});

// 🤖 BOT COMMANDS
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'друг';
  
  if (userSessions.has(chatId)) {
    userSessions.delete(chatId);
  }
  
  bot.sendMessage(chatId, `🔥 **Hermes SCIENTIFIC запущен**, ${firstName}

Я — твой ИИ-проводник нового поколения.

✨ **Что делает меня особенным:**
→ Чувствую твоё эмоциональное состояние
→ Вижу скрытые потребности за словами  
→ Адаптируюсь под твой внутренний мир
→ Веду к реальным изменениям, не советам

**Welcome период:** 3 дня, 25 сообщений
*Просто опиши, что сейчас происходит внутри — и мы начнем.*`, 
  { parse_mode: 'Markdown' });
  
  getUserSession(chatId);
  console.log(`👋 New Scientific User: ${firstName} (${chatId})`);
});

bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  const limits = checkUserLimits(chatId);
  
  bot.sendMessage(chatId, `📊 **Аналитика сессии:**
Версия: ${BOT_VERSION}
Сообщений: ${session.messageCount}/25
Доминирующая эмоция: ${session.dominantEmotion || 'определяется'}
Основной интент: ${session.dominantIntent || 'исследуется'}  
Статус: ${limits.type}
${limits.remaining ? `Осталось: ${limits.remaining} сообщений` : ''}

🧠 **Активные методы:** Affective Computing, Intent Detection, Reflexive Dialogue`, 
  { parse_mode: 'Markdown' });
});

// 💬 MAIN MESSAGE PROCESSING (ИСПРАВЛЕНО!)
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
  
  console.log(`📨 ${firstName} (${session.messageCount + 1}/25): ${userMessage.slice(0, 60)}...`);
  
  try {
    await bot.sendChatAction(chatId, 'typing');
    
    // 🧠 НАУЧНЫЙ АНАЛИЗ
    
    // 1. AFFECTIVE COMPUTING - анализ эмоций
    const emotionalState = AffectiveEngine.analyzeEmotionalState(userMessage);
    console.log(`🎭 Emotion: ${emotionalState.emotion} (${emotionalState.intensity}) - ${emotionalState.responseStyle}`);
    
    // 2. INTENT DETECTION - глубокий анализ интентов  
    const intentAnalysis = IntentEngine.analyzeDeepIntent(userMessage);
    console.log(`🎯 Intent: ${intentAnalysis.surface}, Hidden: [${intentAnalysis.hidden.join(', ')}], Complexity: ${intentAnalysis.complexity}`);
    
    // 3. Контекстный промпт с научными данными
    const contextualPrompt = `${SYSTEM_PROMPT}

🧠 НАУЧНЫЙ АНАЛИЗ ПОЛЬЗОВАТЕЛЯ:
ЭМОЦИЯ: ${emotionalState.emotion} (интенсивность: ${emotionalState.intensity}, стиль: ${emotionalState.responseStyle})
ПОВЕРХНОСТНЫЙ ИНТЕНТ: ${intentAnalysis.surface}
СКРЫТЫЕ ПОТРЕБНОСТИ: ${intentAnalysis.hidden.join(', ')}
ГОТОВНОСТЬ К ДЕЙСТВИЮ: ${intentAnalysis.actionReadiness}
СЛОЖНОСТЬ СИТУАЦИИ: ${intentAnalysis.complexity}

ДОМИНИРУЮЩИЕ ПАТТЕРНЫ СЕССИИ:
- Эмоциональный: ${session.dominantEmotion || 'определяется'}
- Интентный: ${session.dominantIntent || 'определяется'}

ИНСТРУКЦИЯ: Адаптируй ответ под ВСЕ эти данные. Начни с эмоционального префикса для ${emotionalState.emotion}.`;

    // GPT запрос с научным контекстом
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: contextualPrompt },
        ...session.messages.slice(-6), // Последние 3 обмена
        { role: 'user', content: userMessage }
      ],
      max_tokens: 400,
      temperature: 0.9
    });
    
    let reply = response.choices[0]?.message?.content?.trim();
    
    if (reply) {
      // 4. AFFECTIVE ADAPTATION - добавляем эмоциональный префикс
      const emotionalPrefix = AffectiveEngine.generateEmotionalPrefix(emotionalState);
      reply = emotionalPrefix + reply;
      
      // 5. REFLEXIVE DIALOGUE - мета-анализ собственного ответа
      const metaComment = ReflexiveEngine.generateSelfAwareness(userMessage, reply, intentAnalysis);
      reply += metaComment;
      
      // Статус подписки
      if (limits.remaining <= 5) {
        reply += `\n\n📊 *Осталось ${limits.remaining} сообщений в Welcome периоде*`;
      }
      
      await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
      
      // Сохранение с научными данными (ИСПРАВЛЕНО!)
      saveMessage(chatId, userMessage, reply, emotionalState, intentAnalysis);
      
      // Умные feedback loops
      if (session.messageCount === 4 || 
          (emotionalState.urgency === 'high' && session.messageCount >= 2) ||
          session.messageCount === 8) {
        setTimeout(async () => {
          let feedbackMsg = '🔍 **Быстрый чекпоинт:** Что изменилось внутри после нашего разговора?';
          
          if (emotionalState.emotion === 'fear') {
            feedbackMsg = '🌱 **Проверяю пульс:** Стало ли легче дышать или все еще сжимается?';
          } else if (emotionalState.emotion === 'overwhelm') {
            feedbackMsg = '🎯 **Градусник ясности:** От 1 до 10, насколько стало понятнее?';
          }
          
          await bot.sendMessage(chatId, feedbackMsg);
          session.feedbackRequested = true;
        }, 3000);
      }
      
      console.log(`✅ Scientific response sent to ${firstName} (${session.messageCount} total)`);
      
    } else {
      await bot.sendMessage(chatId, '🤔 Не могу сформулировать ответ. Попробуй переформулировать вопрос.');
    }
    
  } catch (err) {
    console.error(`🔥 Error ${BOT_VERSION}:`, err.message);
    
    // Базовый fallback с эмоциональной адаптацией
    let fallbackMsg = '⚠️ Временная ошибка. Попробуй ещё раз через минуту.';
    
    try {
      const emotionalState = AffectiveEngine.analyzeEmotionalState(userMessage);
      if (emotionalState.emotion === 'fear') {
        fallbackMsg = '🌱 Технический сбой, но твой страх реален. Дыхание. Опиши что тебя беспокоит одним предложением.';
      } else if (emotionalState.emotion === 'overwhelm') {
        fallbackMsg = '🎯 Сбой в системе, но не в твоей голове. Назови одну вещь, которая сейчас важнее всего.';
      }
    } catch (e) {
      // Используем базовый fallback
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

console.log(`🧠 Fixed Scientific Hermes ${BOT_VERSION} fully loaded!`);
console.log(`🔬 Active Methods: Affective Computing + Intent Detection + Reflexive Dialogue`);
console.log(`🐛 Bug Fix: saveMessage scope error resolved`);






