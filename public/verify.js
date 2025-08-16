const connectButton = document.getElementById("connectBtn");
const status = document.getElementById("status");

connectButton.onclick = async () => {
  try {
    if (!window.ethereum) {
      status.innerText = "MetaMask not found!";
      return;
    }

    // Get wallet
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const wallet = await signer.getAddress();

    // Ask user for their subdomain (first part of ENS name)
    const subname = prompt("Enter your ENS subdomain (e.g. natasim):");
    if (!subname) return;

    const ensName = `${subname}.emperor.club.agi.eth`;

    // NameWrapper ERC-1155 tokenId = namehash(ENS name)
    const tokenId = ethers.namehash(ensName);

    // Sign Discord ID message
    const discordId = new URLSearchParams(window.location.search).get("discordId");
    const message = `Verify ENS subdomain for ${discordId}`;
    const signature = await signer.signMessage(message);

    // Send to backend
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discordId,
        wallet,
        tokenId,
        signature,
        ensName
      })
    });

    const data = await res.json();
    status.innerText = data.message;
  } catch (err) {
    console.error(err);
    status.innerText = "❌ Verification failed.";
  }
};
