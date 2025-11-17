const { SlashCommandBuilder } = require('@discordjs/builders');
var cron = require('node-cron');
const fs = require('fs');

// cron.schedule('*/5 * * * * *', () => {
//   const data = JSON.parse(fs.readFileSync('habits.json', 'utf8'));
//    for (const userId in data) {
//     for (const habit of data[userId].habits) {
//       habit.amountCompleted = 0; 
//     }
//         fs.writeFileSync('habits.json', JSON.stringify(data, null, 2));
//   }
// });


module.exports = {
  data: new SlashCommandBuilder()
  .setName('habitupdategoal')
  .setDescription('Allows you update the goal of the habit.')
  .addStringOption(option => option.setName('name')
          .setDescription('The name of the habit')
          .setRequired(true)
          .setAutocomplete(true))
 .addStringOption(option => option.setName('goalcompletion')
          .setDescription('The new goal completion')
          .setRequired(true)),


          async autocomplete(interaction) {
            if (!interaction.isAutocomplete()) return;
            const partialName = interaction.options.getFocused(true).value;
            const data = JSON.parse(fs.readFileSync('habits.json', 'utf8'));
            const userId = interaction.user.id;
          
            // Check if the user has habits. If not, respond with an empty array.
            if (!data[userId] || !data[userId].habits || data[userId].habits.length === 0) {
              return interaction.respond([]);
            }
          
            const filteredHabits = data[userId].habits
              .filter(habit => habit.habitName.toLowerCase().includes(partialName.toLowerCase()))
              .map(habit => ({ name: habit.habitName, value: habit.habitName }));
          
            // Respond with up to 25 filtered habit names for the autocomplete suggestions.
            interaction.respond(filteredHabits.slice(0, 25));

          }, 
          async execute(interaction) {
            
            const data = JSON.parse(fs.readFileSync('habits.json', 'utf8'));
            const userId = interaction.user.id;
            const habitName = interaction.options.getString('name');
            const goalCompletion = interaction.options.getString('goalcompletion');
            
            if (!data[userId] || !data[userId].habits || data[userId].habits.length === 0) {
                interaction.reply('You have no habits to update.');
                return;
            }
            let habitIndex = -1;
            for (let i = 0; i < data[userId].habits.length; i++) {
                if (data[userId].habits[i].habitName === habitName) {
                    habitIndex = i;
                    break;
                }
            }
            if (habitIndex === -1) {
                interaction.reply('You have no habit with that name.');
                return;
            }
            data[userId].habits[habitIndex].goal = goalCompletion;
            fs.writeFileSync('habits.json', JSON.stringify(data, null, 2));
            interaction.reply('Habit goal updated.');



          }
};