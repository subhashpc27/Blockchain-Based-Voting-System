import React, { useState, useEffect } from 'react';

const ActiveSessions = ({ contract, account, sessions, loading, onVoteSuccess }) => {
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionCandidates, setSessionCandidates] = useState([]);
  const [voting, setVoting] = useState(false);
  const [autoStarting, setAutoStarting] = useState(false);
  const [error, setError] = useState('');

  // Auto-start sessions that should be active
  useEffect(() => {
    autoStartEligibleSessions();
  }, [sessions, contract]);

  const autoStartEligibleSessions = async () => {
    if (!contract || autoStarting) return;

    try {
      const now = new Date();
      const sessionsToStart = sessions.filter(session => {
        // Session should auto-start if:
        // 1. Current time >= start time
        // 2. Current time <= end time  
        // 3. Session is not active yet
        return now >= session.startTime && 
               now <= session.endTime && 
               !session.isActive;
      });

      if (sessionsToStart.length > 0) {
        setAutoStarting(true);
        console.log(`Auto-starting ${sessionsToStart.length} eligible sessions...`);

        for (const session of sessionsToStart) {
          try {
            console.log(`Auto-starting session: ${session.name}`);
            const transaction = await contract.startSession(session.id);
            await transaction.wait();
            console.log(`Successfully auto-started session: ${session.name}`);
          } catch (error) {
            console.error(`Failed to auto-start session ${session.name}:`, error);
            // Continue with other sessions even if one fails
          }
        }

        // Refresh sessions after auto-starting
        onVoteSuccess();
        setAutoStarting(false);
      }
    } catch (error) {
      console.error('Error in auto-start process:', error);
      setAutoStarting(false);
    }
  };


  const now = new Date();
  const filteredSessions = sessions.filter(session => {
    return session.isActive && 
           now >= session.startTime && 
           now <= session.endTime;
  });

  const loadSessionCandidates = async (sessionId) => {
    try {
      const candidates = await contract.getSessionCandidates(sessionId);
      setSessionCandidates(candidates.map(c => ({
        id: c.id.toString(),
        name: c.name,
        voteCount: c.voteCount.toString(),
        isActive: c.isActive
      })));
    } catch (error) {
      console.error('Error loading candidates:', error);
      setSessionCandidates([]);
      setError('Failed to load candidates');
    }
  };

  const selectSession = async (session) => {
    // Check if session is still valid before allowing selection
    const now = new Date();
    if (now > session.endTime) {
      setError('This session has expired and is no longer accepting votes.');
      return;
    }
    
    setSelectedSession(session);
    setError('');
    await loadSessionCandidates(session.id);
  };

  const vote = async (candidateId) => {
    try {
      // Double-check session validity before voting
      const now = new Date();
      if (!selectedSession || now > selectedSession.endTime) {
        setError('This session has expired and is no longer accepting votes.');
        return;
      }

      setVoting(true);
      setError('');

      const transaction = await contract.vote(selectedSession.id, candidateId);
      await transaction.wait();

      alert('✅ Vote submitted successfully!');
      
      // Update the session to mark as voted
      setSelectedSession(prev => ({ ...prev, hasVoted: true }));
      
      onVoteSuccess();
    } catch (error) {
      console.error('Error voting:', error);
      if (error.message.includes('Session has ended') || error.message.includes('expired')) {
        setError('This session has expired and is no longer accepting votes.');
      } else if (error.message.includes('already voted')) {
        setError('You have already voted in this session.');
      } else {
        setError(error.message || 'Failed to submit vote');
      }
    } finally {
      setVoting(false);
    }
  };

  const formatDateTime = (date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (endTime) => {
    const now = new Date();
    const diff = endTime - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} days remaining`;
    }
    
    return `${hours}h ${minutes}m remaining`;
  };

  const isSessionExpired = (session) => {
    return new Date() > session.endTime;
  };

  if (loading || autoStarting) {
    return (
      <div className="active-sessions">
        <div className="loading-content">
          <div className="spinner"></div>
          <h3>{autoStarting ? 'Starting eligible sessions...' : 'Loading active sessions...'}</h3>
          {autoStarting && <p>Sessions are being automatically started based on their scheduled time</p>}
        </div>
      </div>
    );
  }

  if (filteredSessions.length === 0) {
    return (
      <div className="active-sessions">
        <div className="section-header">
          <h2>🗳️ Active Voting Sessions</h2>
          <p>No active voting sessions at the moment</p>
        </div>
        
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Active Sessions</h3>
          <p>There are currently no voting sessions available. Sessions will automatically start at their scheduled time.</p>
        </div>
      </div>
    );
  }

  if (!selectedSession) {
    return (
      <div className="active-sessions">
        <div className="section-header">
          <h2>🗳️ Active Voting Sessions</h2>
          <p>Select a session to view candidates and cast your vote</p>
        </div>

        <div className="sessions-grid">
          {filteredSessions.map(session => {
            const timeRemaining = getTimeRemaining(session.endTime);
            const expired = isSessionExpired(session);
            
            return (
              <div 
                key={session.id} 
                className={`session-card clickable ${expired ? 'expired' : ''}`}
                onClick={() => !expired && selectSession(session)}
              >
                <div className="session-header">
                  <h3>{session.name}</h3>
                  {expired ? (
                    <span className="status-badge expired">⏰ Expired</span>
                  ) : session.hasVoted ? (
                    <span className="status-badge voted">✅ Voted</span>
                  ) : (
                    <span className="status-badge pending">⏳ Pending</span>
                  )}
                </div>
                
                <div className="session-info">
                  <div className="info-item">
                    <span className="info-icon">📅</span>
                    <span>Started: {formatDateTime(session.startTime)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">⏰</span>
                    <span className={expired ? 'expired-text' : ''}>{timeRemaining}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">👥</span>
                    <span>{session.candidateCount} candidates</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">🗳️</span>
                    <span>{session.totalVotes} votes cast</span>
                  </div>
                </div>
                
                <div className="session-action">
                  {expired ? (
                    <button className="btn btn-disabled btn-small" disabled>
                      ⏰ Session Expired
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-small">
                      {session.hasVoted ? '👁️ View Details' : '🗳️ Vote Now'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Check if selected session is still valid
  const sessionExpired = isSessionExpired(selectedSession);

  return (
    <div className="active-sessions">
      <div className="session-voting">
        <div className="voting-header">
          <button 
            onClick={() => {
              setSelectedSession(null);
              setSessionCandidates([]);
              setError('');
            }}
            className="btn btn-secondary btn-small back-btn"
          >
            ← Back to Sessions
          </button>
          
          <div className="session-title">
            <h2>🗳️ {selectedSession.name}</h2>
            <div className="session-meta">
              <span className={sessionExpired ? 'expired-text' : ''}>
                ⏰ {getTimeRemaining(selectedSession.endTime)}
              </span>
              <span>👥 {selectedSession.candidateCount} candidates</span>
              <span>🗳️ {selectedSession.totalVotes} votes</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {sessionExpired && (
          <div className="expired-notice">
            <div className="notice-content">
              <h3>⏰ Session Expired</h3>
              <p>This voting session has ended and is no longer accepting votes. You can view the current results below.</p>
            </div>
          </div>
        )}

        {selectedSession.hasVoted && !sessionExpired ? (
          <div className="voted-notice">
            <div className="notice-content">
              <h3>✅ You have already voted in this session</h3>
              <p>Thank you for participating! You can view the current results below.</p>
            </div>
          </div>
        ) : !sessionExpired ? (
          <div className="voting-instructions">
            <h3>📋 Instructions</h3>
            <ul>
              <li>Review all candidates carefully</li>
              <li>You can only vote once in this session</li>
              <li>Your vote is final and cannot be changed</li>
              <li>Click "Vote" for your preferred candidate</li>
            </ul>
          </div>
        ) : null}

        <div className="candidates-section">
          <h3>👥 Candidates</h3>
          
          {sessionCandidates.length === 0 ? (
            <div className="loading-candidates">
              <div className="spinner"></div>
              <p>Loading candidates...</p>
            </div>
          ) : (
            <div className="candidates-grid">
              {sessionCandidates.map(candidate => (
                <div key={candidate.id} className="candidate-card">
                  <div className="candidate-info">
                    <div className="candidate-avatar">
                      {candidate.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="candidate-details">
                      <h4>{candidate.name}</h4>
                      <p className="candidate-id">Candidate #{candidate.id}</p>
                    </div>
                  </div>
                  
                  <div className="candidate-stats">
                    <div className="vote-count">
                      <span className="count">{candidate.voteCount}</span>
                      <span className="label">votes</span>
                    </div>
                    <div className="vote-percentage">
                      {selectedSession.totalVotes > 0 
                        ? Math.round((candidate.voteCount / selectedSession.totalVotes) * 100)
                        : 0
                      }%
                    </div>
                  </div>
                  
                  <div className="candidate-actions">
                    {sessionExpired || selectedSession.hasVoted ? (
                      <div className="already-voted">
                        <span>{sessionExpired ? '⏰ Session Ended' : '✅ Thank you for voting'}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => vote(candidate.id)}
                        disabled={voting}
                        className="btn btn-vote"
                      >
                        {voting ? (
                          <>
                            <div className="btn-spinner"></div>
                            Voting...
                          </>
                        ) : (
                          <>
                            🗳️ Vote for {candidate.name}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="session-details">
          <h3>📊 Session Details</h3>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Session Name:</span>
              <span className="detail-value">{selectedSession.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Start Time:</span>
              <span className="detail-value">{formatDateTime(selectedSession.startTime)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">End Time:</span>
              <span className="detail-value">{formatDateTime(selectedSession.endTime)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Total Votes:</span>
              <span className="detail-value">{selectedSession.totalVotes}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className={`detail-value ${sessionExpired ? 'expired' : 'active'}`}>
                {sessionExpired ? 'Expired' : 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveSessions;