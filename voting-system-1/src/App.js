import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Components
import OwnerPortal from './components/OwnerPortal';
import VoterPortal from './components/VoterPortal';
import LoginScreen from './components/LoginScreen';

// Contract
import MultiSessionVotingSystemData from './contracts/MultiSessionVotingSystem.json';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(''); // 'owner', 'voter', or ''

  useEffect(() => {
    checkConnection();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      // User disconnected
      logout();
    } else {
      // User switched accounts
      window.location.reload();
    }
  };

  const checkConnection = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          await initializeApp();
        } else {
          setLoading(false);
        }
      } else {
        setError('Please install MetaMask to use this application');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setError('Error connecting to MetaMask');
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');

      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      await initializeApp();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const initializeApp = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Check if we're on the correct network
      const network = await provider.getNetwork();
      if (network.chainId !== 1337n) {
        throw new Error('Please connect to Ganache Local Network (Chain ID: 1337)');
      }

      setProvider(provider);
      setSigner(signer);
      setAccount(address);

      // Initialize contract
      const votingContract = new ethers.Contract(
        MultiSessionVotingSystemData.address,
        MultiSessionVotingSystemData.abi,
        signer
      );

      setContract(votingContract);

      // Check user role
      const owner = await votingContract.owner();
      const isOwnerAddress = address.toLowerCase() === owner.toLowerCase();
      setIsOwner(isOwnerAddress);

      if (isOwnerAddress) {
        setUserRole('owner');
      } else {
        // Check if voter is registered
        const registered = await votingContract.isRegisteredVoter(address);
        setIsRegistered(registered);
        setUserRole('voter');
      }

      setLoading(false);
    } catch (error) {
      console.error('Initialization error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const logout = () => {
    setProvider(null);
    setSigner(null);
    setContract(null);
    setAccount('');
    setIsOwner(false);
    setIsRegistered(false);
    setUserRole('');
    setError('');
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="spinner"></div>
          <h2>Loading Voting System...</h2>
          <p>Connecting to blockchain...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-screen">
          <h2>⚠️ Connection Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <LoginScreen 
        onConnect={connectWallet}
        loading={loading}
      />
    );
  }

  return (
    <div className="app">
      {userRole === 'owner' && (
        <OwnerPortal 
          contract={contract}
          account={account}
          onLogout={logout}
        />
      )}
      
      {userRole === 'voter' && (
        <VoterPortal 
          contract={contract}
          account={account}
          isRegistered={isRegistered}
          setIsRegistered={setIsRegistered}
          onLogout={logout}
        />
      )}
    </div>
  );
}

export default App;