const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const schedule = require("node-schedule");
const fs = require("fs");
require("dotenv").config();

const app = express();

app.get("/", (req, res) => {
  res.send("<h1>Bot is running!</h1>");
})

const PORT = process.env.PORT;

// Telegram Bot Setup
const botToken = process.env.Bot_Token;
const bot = new TelegramBot(botToken, { polling: true });

// File System Initialization
const dataFilePath = "bot_data.json";

// Check if the data file exists, create it if not
if (!fs.existsSync(dataFilePath)) {
  fs.writeFileSync(
    dataFilePath,
    JSON.stringify({ baseValue: 10, totalInterest: 0, chatId: null })
  );
}

// Read data from the file
const botData = JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));

// Extract values from the file
let baseValue = botData.baseValue;
let totalInterest = botData.totalInterest;
let chatId = botData.chatId;
let adminChatId = process.env.ADMIN_CHAT_ID;

// Borrowed amount and interest setup
const interestRate = 100;

// Function to calculate total interest based on the number of days since the borrowed date
function calculateTotalInterest(currentDate, borrowedDate, interestRate) {
  const daysSinceBorrowed = Math.floor(
    (new Date(currentDate) - new Date(borrowedDate)) / (1000 * 60 * 60 * 24)
  );
  return interestRate * daysSinceBorrowed;
}

// Function to send the daily message
const sendDailyMessage = () => {
  try {
    const currentDate = new Date().toLocaleDateString();
    const updatedTotalInterest = calculateTotalInterest(
      currentDate,
      "11/17/2023",
      interestRate
    );

    const borrowedAmount = baseValue + updatedTotalInterest;
    const message = `Hey Sulayman, you have to pay Gul Rs.${borrowedAmount} of the paper sheet you got for Rs. ${baseValue} on 11/17/2023 with the overall interest of ${updatedTotalInterest} as of ${currentDate}!`;

    // Send the message
    bot.sendMessage(chatId, message);
    bot.sendMessage(adminChatId, message);

    // Update the totalInterest
    totalInterest = updatedTotalInterest;

    // Save the updated values to the file
    botData.totalInterest = totalInterest;
    fs.writeFileSync(dataFilePath, JSON.stringify(botData));

    console.log("Message sent successfully.");
  } catch (error) {
    console.error("Error sending daily message:", error);
  }
};

// Schedule message every day at 09:55 AM if chatId is not null
if (chatId !== null) {
  schedule.scheduleJob("55 09 * * *", sendDailyMessage);
}

// Handle incoming messages
bot.on("message", (msg) => {
  const receivedChatId = msg.chat.id;
  console.log("Received message from: ", receivedChatId);

  // If it's the first message
  if (!chatId) {
    if (receivedChatId != adminChatId) {
      chatId = receivedChatId;

      // Update and save data to the file
      botData.chatId = chatId;
      fs.writeFileSync(dataFilePath, JSON.stringify(botData));

      // Send acknowledgment message
      bot.sendMessage(chatId, "Bot has been started. You will reveive daily messages from now on at 09:55 AM.");

      // Send the admin a notification about the new user
      bot.sendMessage(
        adminChatId,
        `Sulayman started the bot.`
      );
    }
  } else if (receivedChatId == adminChatId) {
    // If the message is from the admin, forward it to the user
    bot.sendMessage(chatId, `Gul: ${msg.text}`);
  } else {
    // If the message is from the user, forward it to the admin
    bot.sendMessage(adminChatId, `Sulayman: ${msg.text}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
