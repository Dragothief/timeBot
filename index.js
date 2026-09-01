require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const Discord = require('discord.js');
const fs = require('fs');
const TOKEN = process.env.BOT_TOKEN;
// Channel/user IDs are pulled from .env instead of hardcoded so this same
// code can point at a test server just by using a different .env file.
const BOT_COMMANDS_CHANNEL_ID = process.env.BOT_COMMANDS_CHANNEL_ID;
const TEST_COMMANDS_CHANNEL_ID = process.env.TEST_COMMANDS_CHANNEL_ID;
const AFK_CHANNEL_ID = process.env.AFK_CHANNEL_ID;
const VOICE_ANNOUNCE_CHANNEL_ID = process.env.VOICE_ANNOUNCE_CHANNEL_ID;
const REPORT_RECIPIENT_USER_ID = process.env.REPORT_RECIPIENT_USER_ID;
const { Client, GatewayIntentBits,Collection } = require('discord.js');
const userData = {};
const path = require('node:path');
var cron = require('node-cron');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');
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
client.login(TOKEN);
module.exports = client;
let voiceCallStartTimes = new Map();
let formattedVoiceCallStartTimes = new Map();
let afkTimeMap = new Map();
let afkTimePostMap = new Map();
// Cooldown so someone bouncing in and out of channels doesn't spam @everyone
// repeatedly — checked per-user against their own last known session end time.
const JOIN_ANNOUNCEMENT_COOLDOWN_MS = 5 * 60 * 1000;
client.commands = new Collection();
const durationsFilePath = 'durations.json';
const data = JSON.parse(fs.readFileSync('durations.json', 'utf8'));
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
const habitData = JSON.parse(fs.readFileSync('habits.json', 'utf8'));
require('dotenv').config();
const { createExcelFile, getDateUpdateCellDuration } = require('./excel.js');
const { channel } = require('diagnostics_channel');

// Local backup of who's currently in a voice call, so an active session
// survives the bot/server dying mid-call instead of getting lost entirely.
const activeSessionsFilePath = 'activeSessions.json';

function loadActiveSessions() {
  try {
    if (fs.existsSync(activeSessionsFilePath)) {
      const savedSessions = JSON.parse(fs.readFileSync(activeSessionsFilePath, 'utf8'));
      for (const [userId, session] of Object.entries(savedSessions)) {
        if (session.startTime !== undefined) {
          voiceCallStartTimes.set(userId, session.startTime);
          formattedVoiceCallStartTimes.set(userId, new Date(session.formattedStartTime));
        }
        if (session.afkStartTime !== undefined) {
          afkTimeMap.set(userId, session.afkStartTime);
        }
        if (session.accumulatedAfkTime !== undefined) {
          afkTimePostMap.set(userId, session.accumulatedAfkTime);
        }
      }
      console.log(`Restored ${Object.keys(savedSessions).length} active voice session(s) from disk.`);
    }
  } catch (error) {
    console.error('Failed to load active sessions file:', error);
  }
}

function saveActiveSessions() {
  const sessions = {};
  const userIds = new Set([
    ...voiceCallStartTimes.keys(),
    ...afkTimeMap.keys(),
    ...afkTimePostMap.keys(),
  ]);

  for (const userId of userIds) {
    const session = {};
    if (voiceCallStartTimes.has(userId)) {
      const startTime = voiceCallStartTimes.get(userId);
      const formattedStartTime = formattedVoiceCallStartTimes.get(userId) || new Date(startTime);
      session.startTime = startTime;
      session.formattedStartTime = formattedStartTime.toISOString();
    }
    if (afkTimeMap.has(userId)) {
      session.afkStartTime = afkTimeMap.get(userId);
    }
    if (afkTimePostMap.has(userId)) {
      session.accumulatedAfkTime = afkTimePostMap.get(userId);
    }
    sessions[userId] = session;
  }

  try {
    fs.writeFileSync(activeSessionsFilePath, JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error('Failed to save active sessions file:', error);
  }
}

loadActiveSessions();


for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on('interactionCreate', async interaction => {
  console.log("hello")
  // Handle chat input (slash command) interactions
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.error(`No command matching ${interaction.commandName} found.`);
      return;
    }
     try {
    // Acknowledge right away (within 3s)
    await interaction.deferReply();

    // Command code must use editReply or followUp
    await command.execute(interaction, client);

  } catch (err) {
    console.error(err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: 'Something went wrong.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Something went wrong.', ephemeral: true });
    }
  }
  }
  //Handle autocomplete interactions
  else if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (command && command.autocomplete) {
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`Error handling autocomplete for ${interaction.commandName}:`, error);
        // Autocomplete interactions don't support reply, so just log the error
      }
    }
  }
});



client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
 
  const botCommandsChannel = client.channels.cache.get(BOT_COMMANDS_CHANNEL_ID);
  const testCommandsChannel = client.channels.cache.get(TEST_COMMANDS_CHANNEL_ID);
   
  // Schedule a task to happen every day at 8:00 pm
  cron.schedule('0 20 * * *', () => {
    console.log('Running a task at 8:00 pm every day');
    botCommandsChannel.send('Running a task at 8:00 pm every day'); 

    
    client.users.fetch(REPORT_RECIPIENT_USER_ID, false).then((user) => {
      user.send({ files: ['./durations.xlsx'] });
      user.send({ files: ['./durations.json'] })
     });
    
    
  });
  
  
  }); 
  
  client.on('voiceStateUpdate', (oldState, newState) => {
    const member = newState.member;
    const userId = member.id;
    const botCommandsChannel = client.channels.cache.get(BOT_COMMANDS_CHANNEL_ID);
  
    // Check the channel the user is in
   // console.log(`${member.user.tag} is in a voice channel.`);
  
  
    const excludedChannelIds = [AFK_CHANNEL_ID];

    if(excludedChannelIds.includes(newState.channelId)){
      console.log(`${member.user.tag} joined 'Afk Channel'.`);
      
  
      const afkTime = Date.now();
      afkTimeMap.set(userId, afkTime);
      saveActiveSessions();
      // console.log(notifyClients.toString());
      // notifyClients({
      //   event: 'joinedAfk',
      //   userId: userId,
      //   afkTime: true,
      // })
    }
  
  
  
   if(excludedChannelIds.includes(oldState.channelId)){
      // This grabs the current afkTime for the user.
      const afkTime = afkTimeMap.get(userId);
      let totalAfkTime = afkTimePostMap.get(userId);
     
  
      //This whole next block is for cal of afkTime including any previous afkTime.
      if(afkTime){
        const endTime = Date.now();
        let duration = endTime - afkTime;
         console.log(`${member.user.tag} left 'Afk Channel'.`);
         // This is for when totalAFktime is undefined when it has no value.
         if(totalAfkTime == undefined){
          totalAfkTime = 0;
        }
        // Caluclating the total afkTime for the user.
        totalAfkTime = duration + totalAfkTime;
        console.log(formatDuration(duration) + ` duration for user ${member.user.tag}`);
         console.log(formatDuration(totalAfkTime) + ` afkTime for user ${member.user.tag}`);
        //This deletes the user in afkTimeMap and sets the afkTimePostMap with the total afkTime. So that we are able
        //use afkTimePostMap to cal and afktimeMap as a temporary storage.
        afkTimeMap.delete(userId);
        afkTimePostMap.set(userId, totalAfkTime);
        saveActiveSessions();

        console.log(totalAfkTime);
        // notifyClients({
        //   event: 'leftAfk',
        //   userId: userId,
        //   afkTime: totalAfkTime,
        //   timestamp: Date.now()
    
    
        // })
        
      }
      //This is for checking afkTimePostMap which is sending it to the main where duration is being calculated. 
      
      
  
    }
  
     // If a user joins a channel and wasn't in a channel before, start tracking the time
    if ((!oldState.channelId && newState.channelId) ){
      let startTime = Date.now();
      voiceCallStartTimes.set(userId, startTime);
      formattedVoiceCallStartTimes.set(userId, new Date());
      saveActiveSessions();
      console.log(`${member.user.tag} joined a voice call at ${startTime}.`);
      
      
      const atChannel = client.channels.cache.get(VOICE_ANNOUNCE_CHANNEL_ID);
      const date = new Date();
      if(userId != client.user.id){
        // durations.json's lastLoggedInTime gets updated when THIS user leaves
        // a call (see calculateDuration below), so checking it here tells us
        // whether this same person was just in a call recently.
        const lastSeenTime = (data[userId] && data[userId].lastLoggedInTime)
          ? new Date(data[userId].lastLoggedInTime).getTime()
          : 0;
        if (Date.now() - lastSeenTime > JOIN_ANNOUNCEMENT_COOLDOWN_MS) {
          atChannel.send(`@everyone ${member.user.tag} joined a voice call at ${date.toLocaleString()}.`);
        } else {
          console.log(`Skipping @everyone ping for ${member.user.tag} — they were in a call within the last 5 minutes.`);
        }
      }
    //  notifyClients
    //   ({
    //     event: 'userJoined',s
    //     userId: userId,
    //     username: member.user.tag,
    //     timestamp: startTime
    //   });
  
  
      // console.log(notifyClients.toString());
  
    } 

  // This adds new users to the json file.
    if(!data[userId]){
      data[userId] = {
        duration: 0,
        lastLoggedInTime: new Date().toISOString(),
      };
      fs.writeFileSync('durations.json', JSON.stringify(data, null, 2));
        }
    
    
  

  // If a user leaves a channel, calculate the duration and update the JSON file
        if (oldState.channelId && !newState.channelId ) {
          calculateDuration(userId, member, voiceCallStartTimes, afkTimePostMap, data, formattedVoiceCallStartTimes);
          afkTimePostMap.delete(userId);
          saveActiveSessions();
          const testCommandsChannel = client.channels.cache.get(TEST_COMMANDS_CHANNEL_ID);
          }
  
});
  

  


  function formatDuration(duration) {
    const seconds = Math.floor(duration / 1000) % 60;
    const minutes = Math.floor(duration / (1000 * 60)) % 60;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
 
    function calculateDuration(userId, member, voiceCallStartTimes, afkTimePostMap, data, formattedVoiceCallStartTimes){
      const startTime = voiceCallStartTimes.get(userId);
      const formatStartTime = formattedVoiceCallStartTimes.get(userId);
      const formatEndTime = new Date();
      let afkTime = afkTimePostMap.get(userId);
      const testCommandsChannel = client.channels.cache.get(TEST_COMMANDS_CHANNEL_ID);
      const temp5 = new Date();
      let temp2 = `afkTime for user ${member.user.tag} ` + formatDuration(afkTime);
      const durationMessages = [`Duration Data for ${member.user.tag} at ${temp5.toLocaleDateString()}`];
      if (startTime) {
        const endTime = Date.now();
        let duration = endTime - startTime;

        if (afkTime == undefined) {
          afkTime = 0;
        }

        voiceCallStartTimes.delete(userId);
        saveActiveSessions();
        console.log(`afkTime for user ${member.user.tag} ` + formatDuration(afkTime));
        console.log(`duration for user ${member.user.tag} ` + formatDuration(duration));
        if (afkTime > 0) {
          duration = duration - afkTime;
        }
        if (duration < 0) {
          duration = 0;
        }
        console.log(typeof userId);
        data[userId].duration += duration;
        data[userId].lastLoggedInTime = new Date().toISOString();
      try{
        if (!data[userId].sessions) {
        data[userId].sessions = [];
      }
      data[userId].sessions.push({
        start_time: formatStartTime,
        end_time: formatEndTime,
        duration: duration,
        afk_time: afkTime,
      });
      console.log( "FormatStartTime"+ formatStartTime);
      console.log( "FormatEndTime"+ formatEndTime);
    } catch(error){
      console.log(error);
    }
        const seconds = Math.floor(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        console.log(`This ${member.user.tag} total afkTime is ` + formatDuration(afkTime));
        console.log(`Total cumulative duration: ${hours} hours, ${minutes % 60} minutes, ${seconds % 60} seconds.`);

        
        try {
          const now = new Date();
    
    // Get components of the local time
    const localeString = now.toLocaleString('en-US', { hour12: false });
    const [datePart, timePart] = localeString.split(", ");
    const [month, day, year] = datePart.split("/");
    const [hour, minute, second] = timePart.split(":");

    // Construct the ISO string format
    const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}.000Z`;

    // console.log(isoString); // Corrected ISO string with local time
    // console.log(now.toLocaleString()); // Local time
    // console.log(now.toDateString()); // Date string

    // Call your function with the updated date
    getDateUpdateCellDuration(new Date(isoString), duration, userId);
       // testCommandsChannel.send('Excel file written to successfully.');
        } 
        catch (error) {
        console.log(error);
        testCommandsChannel.send('Error writing to excel file.');
        }
        try{
          fs.writeFileSync(durationsFilePath, JSON.stringify(data, null, 2));
          let temp3 = `Total cumulative duration: ${hours} hours, ${minutes % 60} minutes, ${seconds % 60} seconds.`;
        let temp4 = `${member.user.tag} left the voice call at ` + new Date().toLocaleTimeString() + `.`;
        durationMessages.push(temp2, temp3, temp4);
        testCommandsChannel.send(durationMessages.join('\n'));

        }
        catch(error){
          testCommandsChannel.send(error);
          testCommandsChannel.send("Was not able to save duration.");
        }
        
      }

      
    }
  
