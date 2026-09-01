const { SlashCommandBuilder } = require('@discordjs/builders');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const axios = require('axios');
const state = require('./state'); // Adjust the path if necessary
const API_KEY = 'AIzaSyCqWn9tH2s7OXsgtbd4t2DOfNZhO7z4TaI';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playsong')
    .setDescription('Plays a song in the voice channel.')
    .addStringOption(option => 
      option.setName('keywords')
        .setDescription('Keywords to search for the song you want to play.')
        .setRequired(true)),
  async execute(interaction) {
    const member = interaction.member;
    const voiceChannel = member.voice.channel;
    let songUrl;
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });
    if (!voiceChannel) {
      return interaction.reply('You need to be in a voice channel to play a song.');
    }

    const keywords = interaction.options.getString('keywords');
    if (ytdl.validateURL(keywords)) {
      songUrl = keywords;
    } else {
      songUrl = await searchYouTube(keywords);
    }

    if (!songUrl) {
      return interaction.reply('No results found.');
    }

    if (!ytdl.validateURL(songUrl)) {
      return interaction.reply('Invalid URL.');
    }

    state.queue.push(songUrl);

    if (!state.player) {
      state.player = createAudioPlayer();
      state.player.on(AudioPlayerStatus.Idle, () => {
        state.queue.shift();
        if (state.queue.length > 0) {
          playNextSong(state.player, state.queue[0], voiceChannel);
        } else {
          state.player = null;
          if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
          }
          interaction.channel.send("Playback finished.");
        }
      });
    }

    if (state.queue.length === 1) {
      playNextSong(state.player, state.queue[0], voiceChannel);
    }

    interaction.reply(`Song added to queue: ${songUrl}`);
  }
};

function playNextSong(player, songUrl, voiceChannel) {
  const stream = ytdl(songUrl, { filter: 'audioonly', highWaterMark: 1 << 25 });
  const resource = createAudioResource(stream);
  player.play(resource);
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });
  connection.subscribe(player);
}

// Function to search YouTube and get the top video URL
async function searchYouTube(keywords) {
  const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      q: `${keywords}`,
      type: 'video',
      videoCategoryId: '10',
      maxResults: 1,
      order: 'relevance',
      key: API_KEY,
    },
  });

  const items = response.data.items;
  if (items.length > 0) {
    const videoId = items[0].id.videoId;
    return `https://www.youtube.com/watch?v=${videoId}`;
  } else {
    return null;
  }
}
