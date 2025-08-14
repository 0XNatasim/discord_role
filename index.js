import express from "express";
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

dotenv.config();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔍 Starting app...");
console.log("📦 Environment loaded. Checking required variables...");
[
  "DISCORD_TOKEN",
  "CLIENT_ID",
  "GUILD_ID",
  "BASE_URL",
  "ALCHEMY_KEY",
  "ENS_WRAPPER_NFT_CONTRACT",
  "PARENT_NODE",
  "MEMBER_ROLE_ID"
].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing env var: ${key}`);
  } else {
    console.log(`✅ Found env var: ${key}`);
  }
});

// ----------- Discord Bot Setup -----------
console.log("🤖 Initializing Discord client...");
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once("ready", () => {
  console.log(`✅ Bot connected as ${client.user.tag}`);
});

client.on("shardError", (error) => {
  console.error("💥 Shard error:", error);
});

client.on("error", (error) => {
  console.error("💥 Client error:", error);
});

const commands = [
  {
    name: "verify",
    description: "Vérifiez votre wallet ENS pour obtenir le rôle Club"
  }
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("📡 Registering /verify command...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );
    console.log("✅ /verify command registered");
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
})();

client.on("interactionCreate", async (interaction) => {
  console.log(`📨 Interaction received: ${interaction.commandName}`);
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "verify") {
    try {
      const link = `${process.env.BASE_URL}/?discordId=${interaction.user.id}`;
      console.log(`🔗 Sending verify link to user ${interaction.user.tag}: ${link}`);
      await interaction.reply({
        content: `🔗 Cliquez ici pour vérifier votre ENS : ${link}`,
        flags: 64 // ephemeral
      });
    } catch (err) {
      console.error("❌ Error during interaction:", err);
    }
  }
});

console.log("🚀 Logging in to Discord...");
client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log("✅ Login call finished. Waiting for 'ready' event..."))
  .catch(err => console.error("❌ Login failed:", err));

// ----------- Express Server Setup -----------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  console.log("🌐 GET / called with query:", req.query);
  const { discordId } = req.query;
  if (!discordId) return res.send("❌ Discord ID manquant");
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ----------- ENS ERC-1155 Contract Setup -----------
console.log("🔗 Connecting to Ethereum provider...");
const provider = new ethers.JsonRpcProvider(
  `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
);

const ERC1155_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)"
];

console.log("📄 Setting up ENS wrapper contract...");
const ensWrapperContract = new ethers.Contract(
  process.env.ENS_WRAPPER_NFT_CONTRACT,
  ERC1155_ABI,
  provider
);

app.post("/api/verify-signature", async (req, res) => {
  console.log("📨 POST /api/verify-signature with body:", req.body);
  try {
    const { discordId, wallet, signature, message } = req.body;

    if (!discordId || !wallet || !signature || !message) {
      console.warn("⚠️ Missing parameters");
      return res.status(400).json({ message: "❌ Paramètres manquants" });
    }

    console.log("🔍 Verifying signature...");
    const recovered = ethers.verifyMessage(message, signature);
    console.log("Recovered address:", recovered);

    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      console.warn("⚠️ Invalid signature");
      return res.status(400).json({ message: "❌ Signature invalide" });
    }

    console.log("📡 Checking ENS token balance...");
    const tokenId = ethers.toBigInt(process.env.PARENT_NODE);
    const balance = await ensWrapperContract.balanceOf(wallet, tokenId);
    console.log(`Balance for ${wallet}: ${balance.toString()}`);

    if (balance <= 0n) {
      console.warn("⚠️ Wallet does not own required NFT");
      return res.status(403).json({
        message: "❌ Ce wallet ne possède pas le NFT ENS requis"
      });
    }

    console.log("👥 Fetching guild and member...");
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const member = await guild.members.fetch(discordId);
    console.log(`Adding role to ${member.user.tag}...`);
    await member.roles.add(process.env.MEMBER_ROLE_ID);

    console.log("✅ Role assigned successfully");
    return res.json({ message: "✅ Vérification réussie, rôle attribué" });
  } catch (err) {
    console.error("💥 Server error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🌍 Serveur Web lancé sur le port ${port}`);
});

// ----------- Self-Ping to keep Render awake -----------
if (process.env.BASE_URL) {
  console.log("🔄 Starting self-ping interval...");
  setInterval(() => {
    fetch(process.env.BASE_URL)
      .then(() => console.log("⏳ Self-ping sent"))
      .catch((err) => console.error("⚠️ Self-ping failed:", err));
  }, 14 * 60 * 1000);
}
