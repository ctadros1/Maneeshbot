# Maneeshbot

A small private Discord voice bot built with Node.js, CommonJS, `discord.js` v14, and `@discordjs/voice`.

## What It Does

Maneeshbot watches one configured voice channel. When a non-bot user newly joins that channel, the bot joins the same voice channel, plays a local audio file, and leaves after playback finishes.

It triggers when a user:

- Joins the target voice channel from no voice channel.
- Moves from another voice channel into the target voice channel.

It does not trigger when a user:

- Leaves the target voice channel.
- Changes mute, deafen, video, or streaming state.
- Joins a different voice channel.
- Is a bot user.

If audio is already playing, additional joins are ignored until playback finishes. There is no cooldown after playback ends, so the bot can play again immediately on the next valid join.

## Configuration

Create a `.env` file using `.env.example` as the template:

```env
DISCORD_TOKEN=
GUILD_ID=
TARGET_VOICE_CHANNEL_ID=
AUDIO_FILE_PATH=assets/shabang.mp3
```

Environment variables:

- `DISCORD_TOKEN`: Discord bot token.
- `GUILD_ID`: Discord server ID where the bot should listen.
- `TARGET_VOICE_CHANNEL_ID`: Voice channel ID to watch and join.
- `AUDIO_FILE_PATH`: Optional local audio file path. Defaults to `assets/shabang.mp3`.

The audio file must exist before playback starts. If it is missing, the bot logs a clear error and does not join voice.

## Running

Install dependencies:

```sh
npm install
```

Start the bot:

```sh
npm start
```

Run with auto-restart during development:

```sh
npm run dev
```

## Notes

- The bot uses `ffmpeg-static` for audio compatibility.
- Playback has a 60-second safety timeout so the bot does not stay connected forever.
- The voice connection is destroyed in cleanup even if joining or playback fails.
