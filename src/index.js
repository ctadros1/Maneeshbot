require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const {
  AudioPlayerStatus,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} = require('@discordjs/voice');

const ffmpegPath = require('ffmpeg-static');

if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
}

const requiredEnvVars = [
  'DISCORD_TOKEN',
  'GUILD_ID',
  'TARGET_VOICE_CHANNEL_ID',
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const {
  DISCORD_TOKEN,
  GUILD_ID,
  TARGET_VOICE_CHANNEL_ID,
} = process.env;

const AUDIO_FILE_PATH = process.env.AUDIO_FILE_PATH || 'assets/shabang.mp3';
const PLAYBACK_TIMEOUT_MS = 60_000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

let isPlaying = false;

function resolveAudioFilePath() {
  return path.isAbsolute(AUDIO_FILE_PATH)
    ? AUDIO_FILE_PATH
    : path.resolve(process.cwd(), AUDIO_FILE_PATH);
}

async function playAudioFile(connection, audioFilePath) {
  const player = createAudioPlayer();
  const resource = createAudioResource(audioFilePath);

  player.on('error', (error) => {
    console.error('Audio playback error:', error);
  });

  connection.subscribe(player);
  player.play(resource);

  await entersState(player, AudioPlayerStatus.Playing, 5_000);
  await entersState(player, AudioPlayerStatus.Idle, PLAYBACK_TIMEOUT_MS);
}

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Target voice channel ID: ${TARGET_VOICE_CHANNEL_ID}`);
  console.log(`Audio file path: ${AUDIO_FILE_PATH}`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.guild.id !== GUILD_ID) {
    return;
  }

  const wasInTargetChannel = oldState.channelId === TARGET_VOICE_CHANNEL_ID;
  const isInTargetChannel = newState.channelId === TARGET_VOICE_CHANNEL_ID;

  if (wasInTargetChannel || !isInTargetChannel) {
    return;
  }

  if (!newState.member) {
    console.error(`Voice state update did not include a guild member for user: ${newState.id}`);
    return;
  }

  if (newState.member.user.bot) {
    return;
  }

  if (isPlaying) {
    console.log('Join ignored because audio is already playing.');
    return;
  }

  isPlaying = true;

  const audioFilePath = resolveAudioFilePath();

  if (!fs.existsSync(audioFilePath)) {
    console.error(`Audio file does not exist: ${audioFilePath}`);
    isPlaying = false;
    return;
  }

  let connection;
  let joinedVoice = false;

  try {
    connection = joinVoiceChannel({
      channelId: TARGET_VOICE_CHANNEL_ID,
      guildId: newState.guild.id,
      adapterCreator: newState.guild.voiceAdapterCreator,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    joinedVoice = true;
    console.log(`Joined voice channel: ${TARGET_VOICE_CHANNEL_ID}`);

    await playAudioFile(connection, audioFilePath);
  } catch (error) {
    if (joinedVoice) {
      console.error('Failed to play audio file:', error);
    } else {
      console.error('Failed to join target voice channel:', error);
    }
  } finally {
    if (connection) {
      connection.destroy();
      console.log(`Left voice channel: ${TARGET_VOICE_CHANNEL_ID}`);
    }

    isPlaying = false;
  }
});

client.login(DISCORD_TOKEN).catch((error) => {
  console.error('Failed to log in to Discord:', error);
  process.exit(1);
});
