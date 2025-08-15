import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import fetch from 'node-fetch';

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  BASE_URL,
  MEMBER_ROLE_ID
} = process.env;

// Initialize Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// Register /verify command
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function registerCommands() {
  const commands = [
    {
      name: 'verify',
      description: 'Verify your ENS ownership'
    }
  ];

  try {
    console.log('📡 Registering /verify command...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ /verify command registered');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}

// On ready
client.once('ready', () => {
  console.log(`✅ Bot connected as ${client.user.tag}`);
});

// Interaction handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'verify') {
    try {
      // Prevent "Unknown interaction" by deferring immediately
      await interaction.deferReply({ ephemeral: true });

      const verifyUrl = `${BASE_URL}/?discordId=${interaction.user.id}`;
      await interaction.editReply(`Click here to verify: ${verifyUrl}`);

    } catch (err) {
      console.error('❌ Error during interaction:', err);
    }
  }
});

// Start bot
(async () => {
  console.log('🔍 Starting app...');
  await registerCommands();
  await client.login(DISCORD_TOKEN);
})();
