import asyncio

from aiogram import Bot, Dispatcher
from handlers import register_handlers  # если есть отдельный файл с хэндлерами
from config import BOT_TOKEN  # или используй os.getenv()

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

register_handlers(dp)  # если есть, иначе добавь handlers вручную

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
