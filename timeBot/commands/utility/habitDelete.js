const { SlashCommandBuilder } = require('@discordjs/builders');

const fs = require('fs');
module.exports = {
  data: new SlashCommandBuilder()
  .setName('habitdelete')
  .setDescription('Delete a habit.')
  .addStringOption(option => option.setName('name')
          .setDescription('The name of the habit')
          .setRequired(true)
          .setAutocomplete(true)),
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
           
        if (!data[userId] || !data[userId].habits || data[userId].habits.length === 0) {
            interaction.reply('You have no habits to delete.');
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
            interaction.reply('You do not have this habit to delete.');
            return;
        }
        data[userId].habits.splice(habitIndex, 1);
        fs.writeFileSync('habits.json', JSON.stringify(data, null, 2));
        interaction.reply(`Habit ${habitName} deleted successfully.`);



    }      

}