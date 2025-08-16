/*
 * Express backend for ENS NameWrapper verification
 *
 * This server exposes two primary routes:
 *   GET /verify      - Serves the verification web page (index.html)
 *   GET /check/:addr - Queries the Alchemy NFT API for a given wallet address and
 *                      determines whether the wallet owns a wrapped ENS subdomain
 *                      under the specified parent domain.
 *
 * It relies on several environment variables to operate correctly:
 *   - PORT:                    Port number to bind the Express server (defaults to 5000)
 *   - ALCHEMY_KEY:             API key for Alchemy's NFT API (v3 endpoint)
 *   - ENS_WRAPPER_NFT_CONTRACT: Contract address for the ENS NameWrapper ERC‑1155 NFT
 *   - PARENT_LABEL:            Human‑readable ENS parent (e.g. "emperor.club.agi.eth")
 *
 * You can deploy this service on Render, Heroku or any other Node hosting provider.
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

/**
 * Factory function to create and configure an Express application for ENS
 * verification.  Exported so it can be used by other scripts (e.g. the
 * Discord bot) when running both services in a single process.  The
 * returned Express instance defines two routes: `/verify` (serving the
 * verification page) and `/check/:addr` (performing the Alchemy API lookup).
 *
 * @returns {express.Express} Configured Express app
 */
/**
 * Create and configure an Express application for ENS verification.
 * Optionally accepts a Discord client, guild ID and role ID so that the
 * server can grant a role to the user when verification succeeds.
 *
 * @param {object} [opts] - Optional configuration
 * @param {import('discord.js').Client} [opts.discordClient] - An instance of discord.js Client
 * @param {string} [opts.guildId] - Discord guild ID where the role should be granted
 * @param {string} [opts.memberRoleId] - ID of the role to assign on success
 * @returns {express.Express} Configured Express app
 */
function createServer(opts = {}) {
  const discordClient = opts.discordClient;
  const guildId = opts.guildId;
  const memberRoleId = opts.memberRoleId;

  console.log('Initialising ENS verification backend...');
  const app = express();
  app.use(cors());

// Extract required environment variables
const {
  PORT = 5000,
  ALCHEMY_KEY,
  ENS_WRAPPER_NFT_CONTRACT,
  PARENT_LABEL,
} = process.env;

if (!ALCHEMY_KEY || !ENS_WRAPPER_NFT_CONTRACT || !PARENT_LABEL) {
  console.error('Missing one or more required environment variables: ALCHEMY_KEY, ENS_WRAPPER_NFT_CONTRACT, PARENT_LABEL');
}

  // Serve the verification page. We interpolate the PARENT_LABEL at runtime
  const fs = require('fs');
  app.get('/verify', (_req, res) => {
    const htmlPath = path.join(__dirname, 'index.html');
    fs.readFile(htmlPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading index.html:', err);
        return res.status(500).send('Unable to load verification page');
      }
      const replaced = data.replace(/\{\{PARENT_LABEL\}\}/g, PARENT_LABEL || '');
      res.setHeader('Content-Type', 'text/html');
      res.send(replaced);
    });
  });

/**
 * Helper function to determine if an NFT belongs to the ENS NameWrapper contract
 * and is a subdomain (or the domain itself) of the configured parent label.
 *
 * @param {object} nft - NFT object returned by the Alchemy API
 * @returns {boolean}  - True if this NFT qualifies the user as verified
 */
function isValidSubdomainNft(nft) {
  const contractAddr = nft?.contract?.address;
  if (!contractAddr) return false;
  if (contractAddr.toLowerCase() !== ENS_WRAPPER_NFT_CONTRACT.toLowerCase()) {
    return false;
  }
  // Try various places where the name may appear
  const possibleNames = [];
  if (nft.name) possibleNames.push(nft.name);
  if (nft.title) possibleNames.push(nft.title);
  if (nft.raw && nft.raw.metadata && nft.raw.metadata.name) {
    possibleNames.push(nft.raw.metadata.name);
  }
  // Normalise the parent label for comparison
  const parent = PARENT_LABEL.toLowerCase();
  return possibleNames.some((n) => {
    const nameLower = n.toLowerCase();
    return (
      nameLower === parent ||
      nameLower.endsWith('.' + parent)
    );
  });
}

/**
 * GET /check/:addr
 *
 * For a given wallet address, fetches all NFTs via the Alchemy NFT API and
 * returns JSON { valid: boolean } indicating whether the wallet owns a
 * NameWrapper token corresponding to the configured parent ENS label.
 */
  app.get('/check/:addr', async (req, res) => {
  const addr = req.params.addr;
  if (!addr) {
    return res.status(400).json({ error: 'Missing address parameter' });
  }
    console.log(`[${new Date().toISOString()}] Received verification request for address:`, addr);
  try {
    const baseUrl = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}/getNFTsForOwner`;
    const response = await axios.get(baseUrl, {
      params: {
        owner: addr,
        // We fetch metadata to extract the domain name
        withMetadata: true,
        // We could pass contractAddresses[] but filtering manually is safer
      },
    });
    const nfts = response.data?.ownedNfts || [];
      console.log(`Found ${nfts.length} NFT(s) for address ${addr}`);
    // Filter only NameWrapper tokens belonging to the specified parent
    const matching = nfts.filter(isValidSubdomainNft);
      if (matching.length > 0) {
        console.log(`Address ${addr} owns ${matching.length} matching NameWrapper NFT(s).`);
      } else {
        console.log(`Address ${addr} does not own any valid subdomain NFTs.`);
      }
    const valid = matching.length > 0;
      // If verification succeeded and we have a Discord client & user ID, attempt to assign the role
      const userId = req.query.user;
      if (valid && discordClient && guildId && memberRoleId && userId) {
        try {
          console.log(`Attempting to assign role ${memberRoleId} to Discord user ${userId}...`);
          const guild = await discordClient.guilds.fetch(guildId);
          const member = await guild.members.fetch(userId);
          if (!member.roles.cache.has(memberRoleId)) {
            await member.roles.add(memberRoleId);
            console.log(`Successfully added role ${memberRoleId} to user ${userId}.`);
          } else {
            console.log(`User ${userId} already has the role ${memberRoleId}.`);
          }
        } catch (e) {
          console.error('Failed to assign role:', e);
        }
      }
      res.json({ valid });
  } catch (err) {
    console.error('Error querying Alchemy:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to verify ENS ownership' });
  }
  });

  return app;
}

module.exports = { createServer };