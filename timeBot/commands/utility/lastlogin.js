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
        .setName('lastlogin')
        .setDescription('Displays the last time you logged in.'),
    async execute(interaction, client) {
        let loginMessages = ['Last Login Dates:']; // Initialize with the title
        const data = JSON.parse(fs.readFileSync('durations.json', 'utf8')); // Read the data from the file
        const userFetchPromises = Object.keys(data)
            .map(userId => {
                return client.users.fetch(userId)
                    .then(user => {
                        const userTag = `${user.username}#${user.discriminator}`;
                        const lastLoggedInTime = data[userId].lastLoggedInTime;
                         const formattedDate = new Date(lastLoggedInTime);
                       // const formattedDate = new Date(lastLoggedInTime).toDateString();
                        return { userTag, formattedDate }; // Return an object with userTag and formattedDate
                    })
                    .catch(error => {
                        console.error(`Error fetching user ${userId}:`, error);
                        return { userTag: `Error fetching user ${userId}`, formattedDate: '' }; // Handle error
                    });
            });
            
        Promise.all(userFetchPromises)
            .then(users => {
              //  console.log(users);
                users.sort((a, b) => new Date(a.formattedDate)- new Date(b.formattedDate) ); // Sort users by formattedDate in descending order
                users.forEach(user => new Date(user.formattedDate).toDateString());
                loginMessages.push(...users.map(user => `${user.userTag}: ${new Date(user.formattedDate).toDateString()}`)); // Add sorted messages
                interaction.editReply(loginMessages.join('\n')); // Send as a single message
            })
            .catch(error => {
                console.error('An error occurred while processing login dates:', error);
                interaction.editReply('An error occurred while processing login dates.');
            });
          
    }};


    



  