const { SlashCommandBuilder } = require('@discordjs/builders');
const state = require('./state'); // Adjust the path if necessary

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skips the current song.'),
  async execute(interaction) {
    if (!state.player || state.queue.length === 0) {
      return interaction.editReply('No song is currently playing.');
    }

    state.player.stop(); // This will trigger the Idle event and play the next song
    interaction.editReply('Skipped the current song.');
  }
};
