import React, { useState, useEffect } from 'react';
import CreateSession from './CreateSession';
import SessionManager from './SessionManager';
import VotingResults from './VotingResults';

const OwnerPortal = ({ contract, account, onLogout }) => {
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [contract]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const sessionIds = await contract.getAllSessions();
      const sessionsData = [];

      for (const sessionId of sessionIds) {
        const sessionDetails = await contract.getSession(sessionId);
        const isActive = await contract.isSessionActive(sessionId);
        
        sessionsData.push({
          id: sessionId.toString(),
          name: sessionDetails.sessionName,
          startTime: new Date(Number(sessionDetails.startTime) * 1000),
          endTime: new Date(Number(sessionDetails.endTime) * 1000),
          isActive,
          candidateCount: Number(sessionDetails.candidateCount),
          totalVotes: Number(sessionDetails.totalVotes)
        });
      }

      setSessions(sessionsData);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionCreated = () => {
    loadSessions();
    setActiveTab('sessions');
  };

  const handleSessionUpdated = () => {
    loadSessions();
  };

  return (
    <div className="owner-portal">
      <header className="portal-header">
        <div className="header-content">
          <h1>Admin Portal</h1>
          <div className="header-info">
            <span className="account-badge">
                {account.slice(0, 6)}...{account.slice(-4)}
            </span>
            <button onClick={onLogout} className="btn btn-secondary btn-small">
               Logout
            </button>
          </div>
        </div>
        
        <nav className="portal-nav">
          <button 
            onClick={() => setActiveTab('sessions')}
            className={`nav-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          >
            Manage Sessions
          </button>
          <button 
            onClick={() => setActiveTab('create')}
            className={`nav-btn ${activeTab === 'create' ? 'active' : ''}`}
          >
            ➕ Create Session
          </button>
          <button 
            onClick={() => setActiveTab('results')}
            className={`nav-btn ${activeTab === 'results' ? 'active' : ''}`}
          >
            View Results
          </button>
        </nav>
      </header>

      <main className="portal-content">
        {activeTab === 'sessions' && (
          <SessionManager 
            contract={contract}
            sessions={sessions}
            loading={loading}
            onSessionUpdated={handleSessionUpdated}
          />
        )}
        
        {activeTab === 'create' && (
          <CreateSession 
            contract={contract}
            onSessionCreated={handleSessionCreated}
          />
        )}
        
        {activeTab === 'results' && (
          <VotingResults 
            contract={contract}
            sessions={sessions}
          />
        )}
      </main>
    </div>
  );
};

export default OwnerPortal;