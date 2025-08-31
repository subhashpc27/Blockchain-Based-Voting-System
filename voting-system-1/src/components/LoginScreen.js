import React from 'react';

const LoginScreen = ({ onConnect, loading }) => {
  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <h1>🗳️ Multi-Session Voting System</h1>
          <p>Secure, Transparent, Decentralized</p>
        </div>
        
        <div className="login-content">
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">👑</span>
              <div className="feature-text">
                <h3>Owner Portal</h3>
                <p>Create and manage multiple voting sessions</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="feature-icon">🗳️</span>
              <div className="feature-text">
                <h3>Voter Portal</h3>
                <p>Vote in active sessions and view results</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <div className="feature-text">
                <h3>Blockchain Security</h3>
                <p>Immutable and transparent voting records</p>
              </div>
            </div>
          </div>
          
          <div className="login-actions">
            <button 
              onClick={onConnect}
              disabled={loading}
              className="btn btn-primary btn-large login-btn"
            >
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  Connecting...
                </>
              ) : (
                <>
                  🦊 Connect with MetaMask
                </>
              )}
            </button>
            
            <div className="login-requirements">
              <h4>Requirements:</h4>
              <ul>
                <li>✅ MetaMask browser extension</li>
                <li>✅ Connected to Ganache Local Network</li>
                <li>✅ Chain ID: 1337</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="login-footer">
          <p>🔗 Make sure you're connected to the correct network</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;