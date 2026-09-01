const { SlashCommandBuilder } = require('@discordjs/builders');
const { exec } = require('child_process');
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('updateytdlp')
    .setDescription('Updates yt-dlp to the latest version (admin only).'),
  async execute(interaction) {
    if (interaction.user.id !== ADMIN_USER_ID) {
      return interaction.editReply('You are not authorized to use this command.');
    }

    await interaction.editReply('Updating yt-dlp...');

    exec('yt-dlp -U', (error, stdout, stderr) => {
      if (error) {
        console.error('yt-dlp update failed:', error);
        interaction.followUp(`Update failed: ${error.message}`);
        return;
      }
      const output = (stdout || stderr || 'Done, no output.').slice(-1500);
      interaction.followUp(`\`\`\`${output}\`\`\``);
    });
  }
};
