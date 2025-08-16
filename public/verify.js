document.addEventListener('DOMContentLoaded', () => {
  const connectButton = document.getElementById('connectButton');
  const verifyButton = document.getElementById('verifyButton');
  const verificationSection = document.getElementById('verificationSection');
  const statusMessage = document.getElementById('statusMessage');
  
  let userAddress = '';
  const discordId = new URLSearchParams(window.location.search).get('discord_id');

  // MetaMask Connection
  connectButton.addEventListener('click', async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask!');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      userAddress = accounts[0];
      connectButton.textContent = `Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
      verificationSection.classList.remove('hidden');
    } catch (error) {
      console.error('Connection error:', error);
      showStatus('Error connecting to wallet', 'error');
    }
  });

  // Verification Process
  verifyButton.addEventListener('click', async () => {
    if (!userAddress) {
      showStatus('Please connect wallet first', 'error');
      return;
    }

    try {
      showStatus('Verifying...', 'pending');
      
      // 1. Sign verification message
      const message = `Verify Discord ID: ${discordId}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, userAddress]
      });

      // 2. Send to backend
      const response = await fetch('/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId,
          address: userAddress,
          signature
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        showStatus('Verification successful! Discord role added.', 'success');
      } else {
        showStatus(data.error || 'Verification failed', 'error');
      }
    } catch (error) {
      console.error('Verification error:', error);
      showStatus('Verification process failed', 'error');
    }
  });

  // UI Helpers
  function showStatus(text, type) {
    statusMessage.textContent = text;
    statusMessage.className = 'status';
    statusMessage.classList.add(type.toLowerCase());
    statusMessage.classList.remove('hidden');
  }
});