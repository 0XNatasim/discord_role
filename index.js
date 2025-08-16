import dotenv from 'dotenv';
import { Client, GatewayIntentBits, MessageFlags } from 'discord.js';
import express from 'express';
import { Alchemy, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();
const port = process.env.PORT || 5000;

// Discord Client Setup
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Alchemy Setup
const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_KEY,
  network: Network.ETH_MAINNET
});

// Express Middleware
app.use(express.json());
app.use(express.static('public'));

// Discord Bot Ready
discordClient.once('ready', () => {
  console.log(`Logged in as ${discordClient.user.tag}!`);
});

// Slash Command Handling - FIXED
discordClient.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'verify') {
    const verifyUrl = `${process.env.BASE_URL}/verify?discord_id=${interaction.user.id}`;
    
    try {
      // Use flags instead of ephemeral property
      await interaction.reply({
        content: `[Click here to verify your NFT ownership](${verifyUrl})`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('Failed to reply to interaction:', error);
    }
  }
});

// Verification Endpoint
app.post('/verify', async (req, res) => {
  const { discordId, address, signature } = req.body;
  
  try {
    // 1. Verify signature
    const message = `Verify Discord ID: ${discordId}`;
    const signer = ethers.verifyMessage(message, signature);
    if (signer.toLowerCase() !== address.toLowerCase()) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // 2. Check NFT ownership
    const contractAddress = process.env.ENS_WRAPPER_NFT_CONTRACT;
    const parentNode = process.env.PARENT_NODE;
    
    const nfts = await alchemy.nft.getNftsForOwner(address, {
      contractAddresses: [contractAddress]
    });

    const hasValidNFT = nfts.ownedNfts.some(nft => {
      return nft.rawMetadata?.properties?.parentNode === parentNode;
    });

    if (!hasValidNFT) {
      return res.status(403).json({ error: 'NFT ownership validation failed' });
    }

    // 3. Assign Discord role
    const guild = await discordClient.guilds.fetch(process.env.GUILD_ID);
    const member = await guild.members.fetch(discordId);
    await member.roles.add(process.env.MEMBER_ROLE_ID);

    res.json({ success: true });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start Services
discordClient.login(process.env.DISCORD_TOKEN);
app.listen(port, () => {
  console.log(`Server running at ${process.env.BASE_URL}`);
});