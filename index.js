import "dotenv/config";
import express from "express";
import { Client, GatewayIntentBits, Routes, REST } from "discord.js";
import { ethers } from "ethers";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  MEMBER_ROLE_ID,
  BASE_URL,
  PORT,
  ALCHEMY_KEY,
  PARENT_NODE,
  ENS_WRAPPER_NFT_CONTRACT
} = process.env;

// Discord bot setup
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

// Register /verify
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: [
        {
          name: "verify",
          description: "Verify ENS subdomain ownership"
        }
      ]
    });
    console.log("✅ Slash command /verify registered");
  } catch (err) {
    console.error(err);
  }
})();

client.on("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// Handle /verify command
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "verify") {
    const verifyUrl = `${BASE_URL}/?discordId=${interaction.user.id}`;
    await interaction.reply({
      content: `Click to verify ENS subdomain ownership: ${verifyUrl}`,
      flags: 64 // ephemeral
    });
  }
});

// Ethereum provider
const provider = new ethers.AlchemyProvider("mainnet", ALCHEMY_KEY);
const ensWrapperAbi = [
  "function balanceOf(address account, uint256 id) external view returns (uint256)"
];
const ensWrapper = new ethers.Contract(ENS_WRAPPER_NFT_CONTRACT, ensWrapperAbi, provider);

// API endpoint to verify ENS ownership
app.post("/api/verify", async (req, res) => {
  try {
    const { discordId, wallet, tokenId, signature, ensName } = req.body;

    // Recover signer
    const recovered = ethers.verifyMessage(`Verify ENS subdomain for ${discordId}`, signature);
    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return res.json({ message: "❌ Signature verification failed." });
    }

    // Check ENS NameWrapper NFT ownership
    const balance = await ensWrapper.balanceOf(wallet, tokenId);
    console.log(`Checking ${ensName} for wallet ${wallet} → balance: ${balance}`);

    if (balance > 0n) {
      const guild = await client.guilds.fetch(GUILD_ID);
      const member = await guild.members.fetch(discordId);
      await member.roles.add(MEMBER_ROLE_ID);
      return res.json({ message: `✅ Verified! Role granted for ${ensName}` });
    } else {
      return res.json({ message: "❌ No ENS subdomain NFT found." });
    }
  } catch (err) {
    console.error(err);
    res.json({ message: "❌ Verification error." });
  }
});

// Start web server
app.listen(PORT, () => {
  console.log(`🌐 Server running at ${BASE_URL}`);
});

client.login(DISCORD_TOKEN);
