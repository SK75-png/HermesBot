from aiogram import Bot, Dispatcher, types
from aiogram.types import Message
from aiogram.utils import executor
import os

bot = Bot(token=os.getenv("BOT_TOKEN"))
dp = Dispatcher(bot)

@dp.message_handler()
async def echo(message: Message):
    await message.answer("Принято: " + message.text)

if __name__ == "__main__":
    executor.start_polling(dp)
