const { SlashCommandBuilder } = require('@discordjs/builders');
const state = require('./state'); // Adjust the path if necessary

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Shows the current queue.'),
  async execute(interaction) {
    if(state.queue.length === 0) {
      return interaction.editReply('The queue is empty.');
    }

    const temp = state.queue;
    console.log(temp);
    const responseContent = temp.join('\n');
    console.log(responseContent);
    interaction.editReply(responseContent);


  }
};
