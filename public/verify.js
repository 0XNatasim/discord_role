window.onload = () => {
  const connectBtn = document.getElementById("connectBtn");
  const statusEl = document.getElementById("status");

  connectBtn.onclick = async () => {
    try {
      if (!window.ethereum) {
        statusEl.innerText = "MetaMask not found.";
        return;
      }

      const ensName = document.getElementById("ensInput").value.trim();
      if (!ensName) {
        statusEl.innerText = "Please enter your ENS subdomain.";
        return;
      }
      if (!ensName.endsWith(".emperor.club.agi.eth")) {
        statusEl.innerText = "ENS must be a subdomain of emperor.club.agi.eth";
        return;
      }

      // Request wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const wallet = await signer.getAddress();

      // Get discordId from query string
      const urlParams = new URLSearchParams(window.location.search);
      const discordId = urlParams.get("discordId");

      if (!discordId) {
        statusEl.innerText = "Discord ID missing in URL.";
        return;
      }

      // Use full namehash as the ERC-1155 token ID
      const tokenId = ethers.namehash(ensName);  // returns 0x...

      // Sign verification message
      const message = `Verify ENS subdomain for ${discordId}`;
      const signature = await signer.signMessage(message);

      // Send verification request
      const resp = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordId,
          wallet,
          tokenId,  
          signature
        })
      });

      const data = await resp.json();
      if (data.success) {
        statusEl.innerText = "✅ Verified! Role granted in Discord.";
      } else {
        statusEl.innerText = "❌ Verification failed: " + data.error;
      }
    } catch (err) {
      console.error(err);
      statusEl.innerText = "Error during verification.";
    }
  };
};
