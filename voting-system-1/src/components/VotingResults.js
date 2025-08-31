import React, { useState, useEffect } from 'react';

const VotingResults = ({ contract, sessions, isVoterView = false }) => {
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionResults, setSessionResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadSessionResults = async (sessionId) => {
    try {
      setLoading(true);
      
      const sessionDetails = await contract.getSession(sessionId);
      const candidates = await contract.getSessionCandidates(sessionId);
      const winner = await contract.getSessionWinner(sessionId);
      
      const candidatesWithStats = candidates.map(c => ({
        id: c.id.toString(),
        name: c.name,
        voteCount: Number(c.voteCount),
        percentage: sessionDetails.totalVotes > 0 
          ? Math.round((Number(c.voteCount) / Number(sessionDetails.totalVotes)) * 100)
          : 0
      }));

      // Sort candidates by vote count (highest first)
      candidatesWithStats.sort((a, b) => b.voteCount - a.voteCount);

      setSessionResults({
        session: {
          id: sessionId,
          name: sessionDetails.sessionName,
          startTime: new Date(Number(sessionDetails.startTime) * 1000),
          endTime: new Date(Number(sessionDetails.endTime) * 1000),
          totalVotes: Number(sessionDetails.totalVotes),
          isActive: sessionDetails.isActive
        },
        candidates: candidatesWithStats,
        winner: {
          name: winner.winnerName,
          votes: Number(winner.winnerVotes),
          isTie: winner.isTie
        }
      });
    } catch (error) {
      console.error('Error loading session results:', error);
    } finally {
      setLoading(false);
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

  const getSessionStatus = (session) => {
    const now = new Date();
    
    // ✅ FIXED: More accurate session status determination
    if (now < session.startTime) {
      return { text: 'Pending', class: 'status-pending', icon: '🟡' };
    }
    
    if (session.isActive && now >= session.startTime && now <= session.endTime) {
      return { text: 'Active', class: 'status-active', icon: '🟢' };
    }
    
    if (session.isActive && now > session.endTime) {
      return { text: 'Expired', class: 'status-expired', icon: '🔴' };
    }
    
    if (!session.isActive && now > session.endTime) {
      return { text: 'Completed', class: 'status-completed', icon: '✅' };
    }
    
    return { text: 'Inactive', class: 'status-inactive', icon: '⚫' };
  };

  if (sessions.length === 0) {
    return (
      <div className="voting-results">
        <div className="section-header">
          <h2>📈 Voting Results</h2>
          <p>No sessions available to view results</p>
        </div>
        
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Results Available</h3>
          <p>There are no completed voting sessions to display results for.</p>
        </div>
      </div>
    );
  }

  if (!selectedSession) {
    // ✅ FIXED: Proper categorization of sessions for results view
    const now = new Date();
    
    const activeSessions = sessions.filter(s => {
      const status = getSessionStatus(s);
      return status.text === 'Active' && s.totalVotes > 0;
    });
    
    const completedSessions = sessions.filter(s => {
      const status = getSessionStatus(s);
      return status.text === 'Completed' || status.text === 'Expired';
    });

    return (
      <div className="voting-results">
        <div className="section-header">
          <h2>📈 Voting Results</h2>
          <p>
            {isVoterView 
              ? 'View results from recent voting sessions' 
              : 'View results from all voting sessions'
            }
          </p>
        </div>

        {activeSessions.length > 0 && (
          <div className="results-section">
            <h3 className="section-title active">🟢 Active Sessions with Votes</h3>
            <div className="sessions-grid">
              {activeSessions.map(session => {
                const status = getSessionStatus(session);
                return (
                  <div 
                    key={session.id} 
                    className="result-session-card clickable"
                    onClick={() => {
                      setSelectedSession(session);
                      loadSessionResults(session.id);
                    }}
                  >
                    <div className="session-header">
                      <h4>{session.name}</h4>
                      <span className={`status-badge ${status.class}`}>
                        {status.icon} {status.text}
                      </span>
                    </div>
                    
                    <div className="session-stats">
                      <div className="stat">
                        <span className="stat-number">{session.totalVotes}</span>
                        <span className="stat-label">Total Votes</span>
                      </div>
                      <div className="stat">
                        <span className="stat-number">{session.candidateCount}</span>
                        <span className="stat-label">Candidates</span>
                      </div>
                    </div>
                    
                    <div className="session-dates">
                      <p>📅 Started: {formatDateTime(session.startTime)}</p>
                      <p>⏰ Ends: {formatDateTime(session.endTime)}</p>
                    </div>
                    
                    <div className="session-footer">
                      <span className="view-results-btn">👁️ View Live Results</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {completedSessions.length > 0 && (
          <div className="results-section">
            <h3 className="section-title completed">✅ Completed Sessions</h3>
            <div className="sessions-grid">
              {completedSessions.map(session => {
                const status = getSessionStatus(session);
                return (
                  <div 
                    key={session.id} 
                    className="result-session-card clickable completed"
                    onClick={() => {
                      setSelectedSession(session);
                      loadSessionResults(session.id);
                    }}
                  >
                    <div className="session-header">
                      <h4>{session.name}</h4>
                      <span className={`status-badge ${status.class}`}>
                        {status.icon} {status.text}
                      </span>
                    </div>
                    
                    <div className="session-stats">
                      <div className="stat">
                        <span className="stat-number">{session.totalVotes}</span>
                        <span className="stat-label">Final Votes</span>
                      </div>
                      <div className="stat">
                        <span className="stat-number">{session.candidateCount}</span>
                        <span className="stat-label">Candidates</span>
                      </div>
                    </div>
                    
                    <div className="session-dates">
                      <p>📅 Started: {formatDateTime(session.startTime)}</p>
                      <p>⏰ Ended: {formatDateTime(session.endTime)}</p>
                    </div>
                    
                    <div className="session-footer">
                      <span className="view-results-btn">🏆 View Final Results</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeSessions.length === 0 && completedSessions.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No Results Available</h3>
            <p>There are no sessions with votes to display results for.</p>
          </div>
        )}
      </div>
    );
  }

  // Show detailed results for selected session
  return (
    <div className="voting-results">
      <div className="results-detail">
        <div className="detail-header">
          <button 
            onClick={() => {
              setSelectedSession(null);
              setSessionResults(null);
            }}
            className="btn btn-secondary btn-small back-btn"
          >
            ← Back to Results
          </button>
          
          <div className="session-title">
            <h2>📊 {selectedSession.name} - Results</h2>
            <div className="session-meta">
              <span className={`status-badge ${getSessionStatus(selectedSession).class}`}>
                {getSessionStatus(selectedSession).icon} {getSessionStatus(selectedSession).text}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-content">
            <div className="spinner"></div>
            <h3>Loading results...</h3>
          </div>
        ) : sessionResults ? (
          <>
            {/* Winner Section */}
            {sessionResults.winner.name !== "No votes cast" && (
              <div className="winner-section">
                <h3>🏆 {getSessionStatus(selectedSession).text === 'Active' ? 'Current Leader' : 'Winner'}</h3>
                <div className="winner-card">
                  {sessionResults.winner.isTie ? (
                    <div className="tie-result">
                      <h4>🤝 It's a Tie!</h4>
                      <p>Multiple candidates received {sessionResults.winner.votes} votes each</p>
                    </div>
                  ) : (
                    <div className="winner-result">
                      <div className="winner-avatar">
                        {sessionResults.winner.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="winner-info">
                        <h4>{sessionResults.winner.name}</h4>
                        <p>{sessionResults.winner.votes} votes ({
                          sessionResults.session.totalVotes > 0 
                            ? Math.round((sessionResults.winner.votes / sessionResults.session.totalVotes) * 100)
                            : 0
                        }%)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Session Summary */}
            <div className="session-summary">
              <h3>📋 Session Summary</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <div className="summary-number">{sessionResults.session.totalVotes}</div>
                  <div className="summary-label">Total Votes</div>
                </div>
                <div className="summary-item">
                  <div className="summary-number">{sessionResults.candidates.length}</div>
                  <div className="summary-label">Candidates</div>
                </div>
                <div className="summary-item">
                  <div className="summary-number">
                    {Math.round((sessionResults.session.endTime - sessionResults.session.startTime) / (1000 * 60 * 60))}h
                  </div>
                  <div className="summary-label">Duration</div>
                </div>
                <div className="summary-item">
                  <div className={`summary-number status-${getSessionStatus(sessionResults.session).class.split('-')[1]}`}>
                    {getSessionStatus(sessionResults.session).icon}
                  </div>
                  <div className="summary-label">{getSessionStatus(sessionResults.session).text}</div>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="detailed-results">
              <h3>📊 {getSessionStatus(selectedSession).text === 'Active' ? 'Live Results' : 'Final Results'}</h3>
              
              {sessionResults.session.totalVotes === 0 ? (
                <div className="no-votes">
                  <h4>📪 No votes have been cast in this session yet</h4>
                  <p>{getSessionStatus(selectedSession).text === 'Active' ? 'Results will appear as votes are cast.' : 'This session ended without any votes.'}</p>
                </div>
              ) : (
                <div className="results-table">
                  <div className="table-header">
                    <div className="header-rank">Rank</div>
                    <div className="header-candidate">Candidate</div>
                    <div className="header-votes">Votes</div>
                    <div className="header-percentage">Percentage</div>
                    <div className="header-bar">Distribution</div>
                  </div>
                  
                  {sessionResults.candidates.map((candidate, index) => (
                    <div key={candidate.id} className={`result-row ${index === 0 && candidate.voteCount > 0 ? 'leading' : ''}`}>
                      <div className="result-rank">
                        <span className={`rank-badge ${index === 0 && candidate.voteCount > 0 ? 'winner' : ''}`}>
                          {candidate.voteCount === 0 ? '-' : index + 1}
                        </span>
                      </div>
                      <div className="result-candidate">
                        <div className="candidate-avatar">
                          {candidate.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="candidate-name">{candidate.name}</span>
                      </div>
                      <div className="result-votes">
                        {candidate.voteCount}
                      </div>
                      <div className="result-percentage">
                        {candidate.percentage}%
                      </div>
                      <div className="result-bar">
                        <div className="progress-container">
                          <div 
                            className={`progress-bar ${index === 0 && candidate.voteCount > 0 ? 'leading' : ''}`}
                            style={{ width: `${candidate.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {getSessionStatus(selectedSession).text === 'Active' && (
                <div className="live-indicator">
                  <span className="live-dot"></span>
                  <span>Live results - updates automatically as votes are cast</span>
                </div>
              )}
            </div>

            {/* Session Details */}
            <div className="session-info">
              <h3>ℹ️ Session Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Start Time:</span>
                  <span className="info-value">{formatDateTime(sessionResults.session.startTime)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">End Time:</span>
                  <span className="info-value">{formatDateTime(sessionResults.session.endTime)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Status:</span>
                  <span className={`info-value ${getSessionStatus(sessionResults.session).class}`}>
                    {getSessionStatus(sessionResults.session).icon} {getSessionStatus(sessionResults.session).text}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Voting Period:</span>
                  <span className="info-value">
                    {Math.round((sessionResults.session.endTime - sessionResults.session.startTime) / (1000 * 60 * 60))} hours
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="error-content">
            <h3>❌ Failed to load results</h3>
            <p>There was an error loading the results for this session.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingResults;