// Exemple minimal, à adapter pour ERC-1155 / parentNode
const connectBtn = document.getElementById("connectBtn");

connectBtn.onclick = async () => {
  if (!window.ethereum) return alert("Installez Metamask");

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const wallet = accounts[0];
  console.log("Wallet connecté :", wallet);

  // Ici tu peux faire fetch("/api/check-ens?wallet=...") sur ton serveur pour vérifier ERC-1155
};
