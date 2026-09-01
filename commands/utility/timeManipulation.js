// command.js
const client = require('../../index.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
let tempMap = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timemanipulation')
    .setDescription('Allows you to add or remove time from a person.')
    .addStringOption(option => option.setName('name')
      .setDescription('The name of the person you would like to change the time for.')
      .setRequired(true)
      .setAutocomplete(true))
    .addStringOption(option => option.setName('addremove')
      .setDescription('The new goal completion')
      .setRequired(true)
      .addChoices(
        { name: 'Add', value: 'add' },
        { name: 'Remove', value: 'remove' },
      ))
    .addStringOption(option => option.setName('intervaloftime')
      .setDescription('The time to add or remove')
      .setRequired(true)
      .addChoices(
        { name: 'hour', value: 'hour' },
        { name: 'minute', value: 'minute' }))
    .addIntegerOption(option => option.setName('time')
      .setDescription('The time to add or remove')
      .setRequired(true)),

  async autocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;
    const partialName = interaction.options.getFocused(true).value;
    const data = JSON.parse(fs.readFileSync('durations.json', 'utf8'));
    const fullArray = Object.entries(data);

    // Filter out undefined keys and values before adding to tempMap
    fullArray.forEach(element => {
      if (element[1].user && element[0]) {
        tempMap.set(element[1].user, element[0]);
      }
    });

    // Handle undefined values during filtering
    const filteredNames = Array.from(tempMap.keys())
      .filter(name => name && name.toLowerCase().includes(partialName.toLowerCase()))
      .map(name => ({ name, value: name }));

    interaction.respond(filteredNames.slice(0, 25));
  },

  async execute(interaction) {
    const data = JSON.parse(fs.readFileSync('durations.json', 'utf8'));
    const adminuserId = interaction.user.id;
    const personName = interaction.options.getString('name');
    const addRemove = interaction.options.getString('addremove');
    const duration = interaction.options.getInteger('time');
    const interval = interaction.options.getString('intervaloftime');

    const userId = tempMap.get(personName);

    // Fetch the channel inside the execute function to ensure it's available
    const testCommandsChannel = client.channels.cache.get('1221893603383709858');
    if (!testCommandsChannel) {
      console.error('Test commands channel not found.');
      return;
    }

    if (adminuserId !== "256934873615302666") {
      testCommandsChannel.send(`${interaction.user.tag} tried to use the timemanipulation command.`);
      interaction.editReply('You are not authorized to use this command.');
      return;
    }
    if (!data[userId]) {
      data[userId] = {
        duration: 0,
        lastLoggedInTime: "",
        user: personName
      };
    }

    if (addRemove === "add") {
      if (interval === "hour") {
        testCommandsChannel.send(`Adding ${duration} hours to ${personName}'s time.`);
        data[userId].duration += duration * 60 * 60 * 1000;
      } else {
        testCommandsChannel.send(`Adding ${duration} minutes to ${personName}'s time.`);
        data[userId].duration += duration * 60 * 1000;
      }
    } else if (addRemove === "remove") {
      if (interval === "hour") {
        testCommandsChannel.send(`Removing ${duration} hours from ${personName}'s time.`);
        data[userId].duration -= duration * 60 * 60 * 1000;
      } else {
        testCommandsChannel.send(`Removing ${duration} minutes from ${personName}'s time.`);
        data[userId].duration -= duration * 60 * 1000;
      }
    }

    fs.writeFileSync('durations.json', JSON.stringify(data, null, 2));

    interaction.editReply(`${personName}'s time has been updated by ${duration} ${interval}s.`);
  }
};
