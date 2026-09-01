const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');

        module.exports = {
           data: new SlashCommandBuilder()
                .setName('habittracker')
               .setDescription('Displays your current habits.'),
           async execute(interaction) {
                const data = JSON.parse(fs.readFileSync('habits.json', 'utf8'));
                const userId = interaction.user.id;
                if (!data[userId] || !data[userId].habits || data[userId].habits.length === 0) {
                    interaction.reply('You have no habits to track.');
                    return;
                }
                const habitMessages = ['Your Habits:']; // Initialize with the title
                data[userId].habits.forEach(habit => {
                    habitMessages.push(`${habit.habitName} - ${habit.amountCompleted}/${habit.goal} times per ${habit.frequency}`);
                });
                interaction.reply(habitMessages.join('\n')); // Send as a single message
           }

      };