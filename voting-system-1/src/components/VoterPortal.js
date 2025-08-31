import React, { useState, useEffect } from 'react';
import ActiveSessions from './ActiveSessions';
import VotingResults from './VotingResults';

const VoterPortal = ({ contract, account, isRegistered, setIsRegistered, onLogout }) => {
  const [activeTab, setActiveTab] = useState('vote');
  const [activeSessions, setActiveSessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [contract]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const now = new Date();
      
      // Load active sessions - only sessions that are truly active and within time range
      const activeSessionIds = await contract.getAllActiveSessions();
      const activeSessionsData = [];

      for (const sessionId of activeSessionIds) {
        const sessionDetails = await contract.getSession(sessionId);
        const sessionStartTime = new Date(Number(sessionDetails.startTime) * 1000);
        const sessionEndTime = new Date(Number(sessionDetails.endTime) * 1000);
        
        // ✅ FIXED: Only include sessions that are active AND within valid time range
        if (now >= sessionStartTime && now <= sessionEndTime) {
          const hasVoted = await contract.hasVotedInSession(account, sessionId);
          
          activeSessionsData.push({
            id: sessionId.toString(),
            name: sessionDetails.sessionName,
            startTime: sessionStartTime,
            endTime: sessionEndTime,
            candidateCount: Number(sessionDetails.candidateCount),
            totalVotes: Number(sessionDetails.totalVotes),
            hasVoted,
            isActive: true
          });
        }
      }

      setActiveSessions(activeSessionsData);

      // Load all sessions for results - properly categorized
      const allSessionIds = await contract.getAllSessions();
      const allSessionsData = [];

      for (const sessionId of allSessionIds) {
        const sessionDetails = await contract.getSession(sessionId);
        const sessionStartTime = new Date(Number(sessionDetails.startTime) * 1000);
        const sessionEndTime = new Date(Number(sessionDetails.endTime) * 1000);
        const isActive = await contract.isSessionActive(sessionId);
        
        // ✅ FIXED: Proper session categorization
        let sessionStatus = 'pending';
        if (now >= sessionStartTime && now <= sessionEndTime && isActive) {
          sessionStatus = 'active';
        } else if (now > sessionEndTime || !isActive) {
          sessionStatus = 'completed';
        }
        
        allSessionsData.push({
          id: sessionId.toString(),
          name: sessionDetails.sessionName,
          startTime: sessionStartTime,
          endTime: sessionEndTime,
          candidateCount: Number(sessionDetails.candidateCount),
          totalVotes: Number(sessionDetails.totalVotes),
          isActive,
          status: sessionStatus
        });
      }

      // Sort by date (newest first) and filter for results view
      const sortedSessions = allSessionsData
        .filter(session => session.status === 'completed' || (session.status === 'active' && session.totalVotes > 0))
        .sort((a, b) => b.endTime - a.endTime)
        .slice(0, 10);
      
      setAllSessions(sortedSessions);

    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async () => {
    try {
      setLoading(true);
      const transaction = await contract.registerSelf();
      await transaction.wait();
      setIsRegistered(true);
      alert('✅ Successfully registered to vote!');
    } catch (error) {
      console.error('Error registering:', error);
      alert('❌ Registration failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVoteSuccess = () => {
    loadSessions(); // Reload to update voting status
  };

  return (
    <div className="voter-portal">
      <header className="portal-header">
        <div className="header-content">
          <h1>🗳️ Voter Portal</h1>
          <div className="header-info">
            <span className="account-badge">
               {account.slice(0, 6)}...{account.slice(-4)}
            </span>
            <div className="registration-status">
              {isRegistered ? (
                <span className="status-badge registered">Registered</span>
              ) : (
                <span className="status-badge unregistered">Not Registered</span>
              )}
            </div>
            <button onClick={onLogout} className="btn btn-secondary btn-small">
               Logout
            </button>
          </div>
        </div>
        
        <nav className="portal-nav">
          <button 
            onClick={() => setActiveTab('vote')}
            className={`nav-btn ${activeTab === 'vote' ? 'active' : ''}`}
          >
            🗳️ Vote in Sessions
            {activeSessions.length > 0 && (
              <span className="nav-badge">{activeSessions.length}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('results')}
            className={`nav-btn ${activeTab === 'results' ? 'active' : ''}`}
          >
            📈 View Results
          </button>
        </nav>
      </header>

      <main className="portal-content">
        {!isRegistered ? (
          <div className="registration-required">
            <div className="registration-card">
              <h2>📝 Registration Required</h2>
              <p>You need to register as a voter before you can participate in voting sessions.</p>
              
              <div className="registration-benefits">
                <h3>✨ After registration, you can:</h3>
                <ul>
                  <li>🗳️ Vote in all active sessions</li>
                  <li>📊 View session results</li>
                  <li>📈 Track your voting history</li>
                  <li>🏆 See winners of completed sessions</li>
                </ul>
              </div>
              
              <button 
                onClick={handleRegistration}
                disabled={loading}
                className="btn btn-primary btn-large"
              >
                {loading ? (
                  <>
                    <div className="btn-spinner"></div>
                    Registering...
                  </>
                ) : (
                  '📝 Register as Voter'
                )}
              </button>
              
              <div className="registration-note">
                <p>🔒 Registration is free and secure on the blockchain</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'vote' && (
              <ActiveSessions 
                contract={contract}
                account={account}
                sessions={activeSessions}
                loading={loading}
                onVoteSuccess={handleVoteSuccess}
              />
            )}
            
            {activeTab === 'results' && (
              <VotingResults 
                contract={contract}
                sessions={allSessions}
                isVoterView={true}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default VoterPortal;