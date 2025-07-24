const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const express = require('express');

// 📌 Environment variables
const ASSISTANT_ID = process.env.ASSISTANT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

if (!ASSISTANT_ID || !OPENAI_API_KEY || !TELEGRAM_TOKEN) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// 🌐 Express server
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: 'ASSISTANT_API_v1.0', 
    timestamp: new Date().toISOString() 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Hermes Assistant Bot running on port ${PORT}`);
});

// 🤖 Telegram bot
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 🧠 Store threads for each user
const userThreads = new Map();

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Create new thread for user
    const thread = await openai.beta.threads.create();
    userThreads.set(chatId, thread.id);
    
    bot.sendMessage(chatId, '🧠 Привет! Я Hermes с GPT Assistant. Задавайте вопросы!');
    console.log(`👋 New user started: ${chatId}`);
  } catch (error) {
    console.error('Error creating thread:', error);
    bot.sendMessage(chatId, '⚠️ Ошибка инициализации. Попробуйте позже.');
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  if (!userMessage || userMessage.startsWith('/')) return;

  try {
    await bot.sendChatAction(chatId, 'typing');

    let threadId = userThreads.get(chatId);
    
    // Create thread if doesn't exist
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      userThreads.set(chatId, threadId);
      console.log(`🧵 Created thread for user: ${chatId}`);
    }

    // Add user message to thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: userMessage
    });

    // Run assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID
    });

    console.log(`🏃 Started run for user ${chatId}: ${run.id}`);

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    
    while (runStatus.status === 'running' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    if (runStatus.status === 'completed') {
      // Get assistant response
      const messages = await openai.beta.threads.messages.list(threadId);
      const response = messages.data[0].content[0].text.value;
      
      await bot.sendMessage(chatId, response);
      console.log(`✅ Response sent to user: ${chatId}`);
    } else {
      console.error(`❌ Run failed with status: ${runStatus.status}`);
      await bot.sendMessage(chatId, '⚠️ Ошибка обработки. Попробуйте еще раз.');
    }

  } catch (error) {
    console.error('🔥 Error processing message:', error);
    await bot.sendMessage(chatId, '⚠️ Произошла ошибка. Попробуйте позже.');
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('🔥 Polling error:', error);
});

console.log('🚀 Hermes Assistant Bot started with OpenAI Assistant API');







