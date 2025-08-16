Discord ENS Verification Bot

This project provides a complete workflow for verifying that a Discord user owns a subdomain under a specific ENS domain (e.g. emperor.club.agi.eth). It consists of:

A Discord bot implemented with discord.js that registers a /verify slash command and sends each user a private link to start verification.

An Express backend that serves a simple web page, prompts the user to connect their wallet and sign a message via MetaMask, then calls Alchemy’s NFT API to check if the wallet owns an ERC‑1155 NameWrapper token representing an ENS subdomain under your chosen parent.

A lightweight HTML frontend that interacts with MetaMask and displays the result of the verification check.

Everything runs inside a single Node.js process so you can stay on the free tier of platforms like Render. The Express server and the Discord bot co‑exist in the same file (index.js) and share environment variables.

User Flow

Join the Discord server. A new user joins your server where the bot is installed.

Invoke the /verify command. The user types /verify in any channel. The bot responds with an ephemeral message containing a unique verification link (e.g. https://your-app.onrender.com/verify?user=1234567890).

Open the verification link. Clicking the link opens a page served by your Express backend. The page explains the verification process and asks the user to connect their wallet.

Connect wallet and sign. The user clicks Connect Wallet. MetaMask prompts them to grant access and to sign a short message (to prove wallet ownership).

Backend verification. The frontend sends the wallet address to /check/:address. The backend calls the Alchemy NFT API (getNFTsForOwner) to fetch all NFTs owned by the wallet, filters them to only the ENS NameWrapper contract, and checks whether any of the names match a subdomain (or the root) of your configured parent label (e.g. *.emperor.club.agi.eth).

Display the result. If a matching NFT is found, the page shows a ✅ success message; otherwise it shows a ❌ failure message. At this point you can manually grant the user a “Verified” role on Discord, or extend the bot to do so automatically.

Architecture & Workflow

index.js (combined bot & server)

Loads environment variables and sanity‑checks their presence.

Creates an Express server using the factory defined in verify.js.

Starts listening on the configured PORT and logs server startup.

Instantiates the Discord client (with minimal intents) and registers the /verify command on your guild.

Listens for interactions: when a user runs /verify, it crafts a unique verification URL and replies with an ephemeral message containing that link.

The server and bot run concurrently in the same Node process.

verify.js (Express app factory)

Exports a function createServer() that returns a configured Express application.

Defines GET /verify which serves index.html and dynamically injects your parent ENS label into the page.

Defines GET /check/:addr which logs each request, fetches NFTs via Alchemy’s API, filters them to your NameWrapper contract, and determines whether the wallet owns a valid subdomain. Results and errors are logged to aid debugging.

index.html (frontend)

Provides a simple UI for the user to connect their wallet and sign a message via MetaMask.

Uses ethers.js (loaded from a CDN) to request accounts, sign a message, and fetch the verification result from the backend.

Displays clear success or failure messages once verification completes.

Environment Variables

Set the following variables (either in a .env file or via your hosting platform’s configuration):

Variable	Description
DISCORD_TOKEN	The bot token from the Discord Developer Portal
CLIENT_ID	The application (client) ID of your bot
GUILD_ID	The Discord guild (server) ID where the slash command should be registered
BASE_URL	Public base URL of your backend (https://your-app.onrender.com)
PORT	Port on which to run the Express server (defaults to 5000)
ALCHEMY_KEY	Alchemy API key used to query NFTs
ENS_WRAPPER_NFT_CONTRACT	Address of the ENS NameWrapper ERC‑1155 contract
PARENT_LABEL	The parent ENS name under which subdomains should be verified (e.g. emperor.club.agi.eth)

These values must never be committed to source control. In development you can place them in a .env file. On Render, add them in the “Environment” section of your service settings.

Installation

Clone the repository and navigate into its directory.

Install Node.js dependencies:

npm install


Create a .env file (or set variables in Render) with the environment variables listed above.

Run the app locally for testing:

node index.js


Invite the bot to your Discord server, then type /verify to start the flow.

Deployment (Render)

Create a new Web Service on Render.

Connect your Git repository containing these files.

Set the build and start commands (Render will use the start script defined in your package.json):

Start command: node index.js

Add all environment variables in the “Environment” section.

Deploy the service. Because both the bot and the server run in the same process, a single web service on the free tier is sufficient.

Once deployed, copy the service’s URL and update your BASE_URL environment variable accordingly. Redeploy if necessary. With the bot invited to your server, you should now be able to verify ENS subdomain ownership seamlessly.

Extending the Bot

This reference implementation checks ownership and displays the result. To automatically grant a Discord role upon successful verification, you could:

Add a secure callback from the frontend to the backend that includes the Discord user ID (via the query string). The backend can then call the Discord API to assign a role.

Store the mapping between wallet addresses and Discord IDs in a database for auditing.

Rate‑limit requests or persist verification state to avoid repeated API calls.

Feel free to customise the user interface or the verification criteria (e.g. different parent labels, networks or NFT filters). Pull requests and feedback are welcome!