const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
} = require('@discordjs/voice');
const { spawn } = require('child_process');
const state = require('./state'); // Adjust the path if necessary

function isYouTubeUrl(text) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text);
}

// Spawns yt-dlp and streams the audio straight out of its stdout, no temp
// files. yt-dlp handles both direct links and, via the "ytsearch1:" prefix,
// searching YouTube and grabbing the top result itself — no separate API key
// or search step needed.
function spawnYtDlp(query) {
  const ytdlp = spawn('yt-dlp', [
    '-f', 'bestaudio',
    '-o', '-',
    '--no-playlist',
    '--quiet',
    '--no-warnings',
    query,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  ytdlp.on('error', (error) => {
    console.error('Failed to start yt-dlp — is it installed and on PATH?', error);
  });
  ytdlp.stderr.on('data', (data) => {
    console.error(`yt-dlp: ${data}`);
  });

  return ytdlp;
}

async function playNextSong(player, query, voiceChannel, textChannel) {
  let connection = getVoiceConnection(voiceChannel.guild.id);
  if (!connection) {
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });
    // Temporary diagnostics: log every state the connection passes through
    // so we can see exactly where it gets stuck instead of just "never ready".
    connection.on('stateChange', (oldState, newState) => {
      console.log(`Voice connection state: ${oldState.status} -> ${newState.status}`);
    });
    connection.on('error', (error) => {
      console.error('Voice connection error:', error);
    });
  }

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
  } catch (error) {
    console.error('Voice connection never became ready:', error);
    textChannel.send('Could not connect to the voice channel.');
    return;
  }

  const ytdlp = spawnYtDlp(query);

  let resource;
  try {
    resource = createAudioResource(ytdlp.stdout);
  } catch (error) {
    console.error('Failed to create audio resource:', error);
    textChannel.send(`Couldn't play that one — it may be age-restricted, region-locked, or YouTube changed something again.`);
    ytdlp.kill();
    return;
  }

  connection.subscribe(player);
  player.play(resource);

  // Clean up the yt-dlp process once this song is done or skipped, rather
  // than leaving it running in the background.
  player.once(AudioPlayerStatus.Idle, () => {
    if (!ytdlp.killed) ytdlp.kill();
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playsong')
    .setDescription('Plays a song in the voice channel.')
    .addStringOption(option =>
      option.setName('keywords')
        .setDescription('A YouTube link, or keywords to search for.')
        .setRequired(true)),
  async execute(interaction) {
    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.editReply('You need to be in a voice channel to play a song.');
    }

    const keywords = interaction.options.getString('keywords');
    const query = isYouTubeUrl(keywords) ? keywords : `ytsearch1:${keywords}`;

    state.queue.push(query);

    if (!state.player) {
      state.player = createAudioPlayer();

      state.player.on(AudioPlayerStatus.Idle, () => {
        state.queue.shift();
        if (state.queue.length > 0) {
          playNextSong(state.player, state.queue[0], voiceChannel, interaction.channel);
        } else {
          state.player = null;
          const connection = getVoiceConnection(voiceChannel.guild.id);
          if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
          }
          interaction.channel.send('Playback finished.');
        }
      });

      state.player.on('error', (error) => {
        console.error('Audio player error:', error);
        interaction.channel.send('Something went wrong playing that song — skipping.');
        state.queue.shift();
        if (state.queue.length > 0) {
          playNextSong(state.player, state.queue[0], voiceChannel, interaction.channel);
        }
      });
    }

    if (state.queue.length === 1) {
      playNextSong(state.player, state.queue[0], voiceChannel, interaction.channel);
    }

    interaction.editReply(`Added to queue: ${keywords}`);
  }
};
