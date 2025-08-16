/*
 * Discord bot for ENS subdomain verification
 *
 * This script registers a single slash command (/verify) with Discord and responds
 * with a private link to the verification page when invoked. The link points
 * at your hosted backend (for example on Render) where users can connect
 * their wallet and complete the verification flow.
 *
 * Environment variables (see README or your hosting platform for configuration):
 *  - DISCORD_TOKEN:       Bot token from the Discord developer portal
 *  - CLIENT_ID:           Application (client) ID for the bot
 *  - GUILD_ID:            ID of the Discord guild (server) where the command
 *                          should be registered
 *  - BASE_URL:            Base URL of the backend (e.g. https://your-app.onrender.com)
 *
 * Note: In production you should avoid logging or committing your bot token or
 * other secrets. Always load secrets from your environment.
 */

require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
// Import the Express app factory from verify.js so we can run the web server
const { createServer } = require('./verify');

// Load required environment variables and perform basic sanity checks
const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  BASE_URL,
  MEMBER_ROLE_ID,
} = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID || !BASE_URL) {
  console.error('Missing one or more required environment variables: DISCORD_TOKEN, CLIENT_ID, GUILD_ID, BASE_URL');
  process.exit(1);
}

// Instantiate Discord client with minimal intents (we only need guilds for slash commands)
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Create and start the Express server. This allows the bot and web server to
// run within the same process, which is ideal for free hosting tiers. We
// pass the Discord client and role settings so the server can grant roles on
// successful verification.
const app = createServer({
  discordClient: client,
  guildId: GUILD_ID,
  memberRoleId: MEMBER_ROLE_ID,
});
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

// Define the slash command(s) to register
const commands = [
  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Start the ENS subdomain verification process')
    .toJSON(),
];

// Define the numeric flag for an "ephemeral" response. Discord uses the
// 6th bit (value 64) to mark messages as hidden from everyone except the
// initiating user. We avoid relying on MessageFlags to prevent deprecation
// warnings or compatibility issues across discord.js versions.
const EPHEMERAL_FLAG = 1 << 6;

// Register slash commands on the guild whenever the bot starts
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    console.log('Refreshing slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log('Slash commands registered successfully');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Listen for interactions and handle the /verify command
client.on('interactionCreate', async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'verify') {
      // Build a unique verification URL. You could add query parameters (e.g. the
      // Discord user ID) so the backend knows which user is requesting verification.
      const verifyUrl = `${BASE_URL.replace(/\/$/, '')}/verify?user=${interaction.user.id}`;
      await interaction.reply({
        content: `Click here to verify your ENS subdomain ownership:\n${verifyUrl}`,
        // Only the requesting user should see this link. Use flags to make the
        // response private (ephemeral) instead of the deprecated "ephemeral" option.
        flags: EPHEMERAL_FLAG,
      });
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('Something went wrong while processing your request.');
    } else {
      await interaction.reply({ content: 'Something went wrong while processing your request.', flags: EPHEMERAL_FLAG });
    }
  }
});

// Start the bot
// Start the bot. Log any errors during command registration or login for easier debugging.
registerCommands()
  .then(() => {
    return client.login(DISCORD_TOKEN);
  })
  .catch((err) => {
    console.error('Error starting bot:', err);
  });