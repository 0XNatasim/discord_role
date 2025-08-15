window.onload = () => {
  const connectBtn = document.getElementById("connectBtn");
  const statusEl = document.getElementById("status");

  connectBtn.onclick = async () => {
    try {
      if (!window.ethereum) {
        statusEl.innerText = "MetaMask not found.";
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
          subnodeHex: "0x58bbf8de4428421b6487b0b03dad5573ef760809f84b6e33c21c487fef6a309d", // Example: franky
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
