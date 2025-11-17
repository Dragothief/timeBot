const { SlashCommandBuilder } = require('@discordjs/builders');
const { Client,GatewayIntentBits } = require('discord.js');
const fs = require('fs');
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
module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Displays the leaderboard.'),
    async execute(interaction,client) {
      const data = JSON.parse(fs.readFileSync('durations.json', 'utf8')); 
      const leaderboard = []; // Assume data is already available
        
        // Your leaderboard logic here
        for (const userId in data) {
            const item = data[userId];
            leaderboard.push({ userId, duration: item.duration });
        }

        leaderboard.sort((a, b) => b.duration - a.duration);
        console.log(leaderboard);
       
        Promise.all(
          leaderboard.map(({ userId, duration }) => 
            client.users.fetch(userId)
              .then(user => `${user.username}#${user.discriminator}: ${formatDuration(duration)}`)
              .catch(error => {
                console.error(`Error fetching user ${userId}:`, error);
                return `Error fetching user ${userId}`; // Handle error, possibly by returning an error message
              })
          )
        )
        .then(results => {
          // `results` is an array of strings returned by the fetch.then or catch for each user
          const responseContent = results.join('\n'); // Join all user strings into a single message
          interaction.editReply(responseContent); // Send a single message with all user details
        })
        .catch(error => {
          console.error('Error processing leaderboard:', error);
          interaction.editReply('An error occurred while processing the leaderboard.'); // Handle any errors that occurred during the Promise.all execution
        });
        

        function formatDuration(duration) {
          const seconds = Math.floor(duration / 1000) % 60;
          const minutes = Math.floor(duration / (1000 * 60)) % 60;
          const hours = Math.floor(duration / (1000 * 60 * 60));
          return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }


    }
};
