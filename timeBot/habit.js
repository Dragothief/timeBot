const Discord = require('discord.js');
const fs = require('fs');
const TOKEN = "MTEwNjQ0OTQyODg4NzM4MDAzOQ.G-yT7F.JfpqME4yVk-ie4fGVZ5KQXPqt3rAmx-LEMkp_w";
const { Client, GatewayIntentBits } = require('discord.js');
var cron = require('node-cron');
const userData = {};
let botCommandsChannel;
const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,

  ],
});

client.on('ready', () => {
  console.log('Hello from habit.js');
  

});






// Tracking new habits
const data = JSON.parse(fs.readFileSync('habits.json', 'utf8'));

function habitUpdate(message) {
  if (message.author.bot) return;

  let habitToUpdate = message.content;
  habitToUpdate = habitToUpdate.replace("!habitupdate", "");
  let temp = habitToUpdate.split(",");
  const userId = message.author.id;
  let habitIndex = -1;

  // Checks if the user already has the habit across all habits
  for (let i = 0; i < data[userId].habits.length; i++) {
    console.log("This is number" + i + " " + data[userId].habits[i].name + " " + temp[0]);
    if (data[userId].habits[i].name === temp[0]) {
      habitIndex = i;
      break;
    }
  }

  // Send confirmation to user and update the habit's goal
  if (habitIndex != -1) {
    message.channel.send(`Your habit ${temp[0]} has been updated to have a goal of ${temp[1]}`);
    data[userId].habits[habitIndex].goal = temp[1];
    fs.writeFileSync('habits.json', JSON.stringify(data, null, 2));
  } else {
    message.channel.send(`You do not have this habit`);
  }
}





client.login(TOKEN);

