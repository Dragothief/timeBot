const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { createExcelFile, getDateUpdateCellHabit, calculateWeeklyProgress, calculateMonthlyProgress, addNewHabits } = require('../../excel.js');

module.exports = {
  data: new SlashCommandBuilder()
  .setName('habitadd')
  .setDescription('Add a new habit to track.')
  .addStringOption(option => 
      option.setName('name')
          .setDescription('The name of the habit')
          .setRequired(true))
  .addIntegerOption(option => 
      option.setName('times')
          .setDescription('How many times per week')
          .setRequired(true))
  .addStringOption(option => 
      option.setName('frequency')
          .setDescription('The frequency of the habit')
          .setRequired(true)
          .addChoices(
              { name: 'Daily', value: 'daily' },
              { name: 'Weekly', value: 'weekly' },
              { name: 'Monthly', value: 'monthly' },
              // Add more choices as needed
          )),
    async execute(interaction) {
      const data = JSON.parse(fs.readFileSync('habits.json', 'utf8'));
      const userId = interaction.user.id;
      const habitName = interaction.options.getString('name');
      const goal = interaction.options.getInteger('times');
      const frequency = interaction.options.getString('frequency');

      if (!data[userId]) {
        data[userId] = {};
      }
      

      if (!data[userId].habits) {
        data[userId].habits = [];
      }

      for (let i = 0; i < data[userId].habits.length; i++) {
        if (data[userId].habits[i].habitName === habitName) {
          interaction.reply(`You already have this habit`);
          return;
        }
      }
      
      addNewHabits(habitName, goal, frequency, userId);
      data[userId].habits.push({ habitName, goal, frequency, amountCompleted: 0});
      fs.writeFileSync('habits.json', JSON.stringify(data, null, 2));
      interaction.reply(`Habit ${habitName} added successfully.`);
    }
};