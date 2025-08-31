import React, { useState, useEffect } from 'react';

const SessionManager = ({ contract, sessions, loading, onSessionUpdated }) => {
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionCandidates, setSessionCandidates] = useState([]);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('categorized'); // 'categorized' or 'all'

  const now = new Date();

  // ✅ FIXED: Proper session categorization with correct time comparisons
  const getSessionCategory = (session) => {
    const now = new Date();
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);
    
    // Pending: Not started yet (regardless of isActive status)
    if (now < startTime) {
      return 'pending';
    }
    
    // Active: Started and within time range AND isActive = true
    if (now >= startTime && now <= endTime && session.isActive) {
      return 'active';
    }
    
    // Expired: Time passed end time but still marked as active (needs to be closed)
    if (now > endTime && session.isActive) {
      return 'expired';
    }
    
    // Completed: Time passed end time and properly closed (isActive = false)
    if (now > endTime && !session.isActive) {
      return 'completed';
    }
    
    // Inactive: Within time range but not active (manually stopped)
    if (now >= startTime && now <= endTime && !session.isActive) {
      return 'inactive';
    }
    
    return 'inactive';
  };

  // Categorize sessions
  const pendingSessions = sessions.filter(s => getSessionCategory(s) === 'pending');
  const activeSessions = sessions.filter(s => getSessionCategory(s) === 'active');
  const expiredSessions = sessions.filter(s => getSessionCategory(s) === 'expired');
  const completedSessions = sessions.filter(s => getSessionCategory(s) === 'completed');
  const inactiveSessions = sessions.filter(s => getSessionCategory(s) === 'inactive');

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
    }
  };

  const selectSession = async (session) => {
    setSelectedSession(session);
    await loadSessionCandidates(session.id);
  };

  const startSession = async (sessionId) => {
    try {
      setActionLoading(`start-${sessionId}`);
      setError('');

      const transaction = await contract.startSession(sessionId);
      await transaction.wait();

      alert('✅ Session started successfully!');
      onSessionUpdated();
    } catch (error) {
      console.error('Error starting session:', error);
      setError(error.message || 'Failed to start session');
    } finally {
      setActionLoading('');
    }
  };

  const endSession = async (sessionId) => {
    try {
      setActionLoading(`end-${sessionId}`);
      setError('');

      const transaction = await contract.endSession(sessionId);
      await transaction.wait();

      alert('✅ Session ended successfully!');
      onSessionUpdated();
    } catch (error) {
      console.error('Error ending session:', error);
      setError(error.message || 'Failed to end session');
    } finally {
      setActionLoading('');
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
    const category = getSessionCategory(session);
    
    switch (category) {
      case 'pending':
        return { text: 'Pending', class: 'status-pending', icon: '🟡' };
      case 'active':
        return { text: 'Active', class: 'status-active', icon: '🟢' };
      case 'expired':
        return { text: 'Expired', class: 'status-expired', icon: '🔴' };
      case 'completed':
        return { text: 'Completed', class: 'status-completed', icon: '✅' };
      case 'inactive':
        return { text: 'Inactive', class: 'status-inactive', icon: '⚫' };
      default:
        return { text: 'Unknown', class: 'status-unknown', icon: '❓' };
    }
  };

  const canStartSession = (session) => {
    const category = getSessionCategory(session);
    const now = new Date();
    // Can start if: pending and current time >= start time, OR inactive and within time range
    return (category === 'pending' && now >= new Date(session.startTime)) || 
           (category === 'inactive' && now >= new Date(session.startTime) && now <= new Date(session.endTime));
  };

  const canEndSession = (session) => {
    const category = getSessionCategory(session);
    // Can end if active or expired
    return category === 'active' || category === 'expired';
  };

  const getTimeUntilStart = (startTime) => {
    const now = new Date();
    const diff = new Date(startTime) - now;
    
    if (diff <= 0) return 'Ready to start';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Starts in ${days} days`;
    }
    
    return `Starts in ${hours}h ${minutes}m`;
  };

  const renderSessionCard = (session) => {
    const status = getSessionStatus(session);
    const category = getSessionCategory(session);
    
    return (
      <div 
        key={session.id} 
        className={`session-card ${category} ${selectedSession?.id === session.id ? 'selected' : ''}`}
        onClick={() => selectSession(session)}
      >
        <div className="session-header">
          <h4>{session.name}</h4>
          <span className={`status-badge ${status.class}`}>
            {status.icon} {status.text}
          </span>
        </div>

        <div className="session-info">
          <p><strong>📅 Start:</strong> {formatDateTime(session.startTime)}</p>
          <p><strong>⏰ End:</strong> {formatDateTime(session.endTime)}</p>
          <p><strong>👥 Candidates:</strong> {session.candidateCount}</p>
          <p><strong>🗳️ Votes:</strong> {session.totalVotes}</p>
          {category === 'pending' && (
            <p><strong>⏳</strong> {getTimeUntilStart(session.startTime)}</p>
          )}
        </div>

        <div className="session-actions">
          {canStartSession(session) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                startSession(session.id);
              }}
              disabled={actionLoading === `start-${session.id}`}
              className="btn btn-success btn-small"
            >
              {actionLoading === `start-${session.id}` ? '⏳' : '▶️ Start Session'}
            </button>
          )}
          
          {canEndSession(session) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                endSession(session.id);
              }}
              disabled={actionLoading === `end-${session.id}`}
              className="btn btn-danger btn-small"
            >
              {actionLoading === `end-${session.id}` ? '⏳' : 
               category === 'expired' ? '🔒 Close Session' : '🛑 End Session'}
            </button>
          )}
          
          {!canStartSession(session) && !canEndSession(session) && (
            <span className="session-finished">
              {category === 'completed' ? '🏁 Finished' : '⏸️ Inactive'}
            </span>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="session-manager">
        <div className="loading-content">
          <div className="spinner"></div>
          <h3>Loading sessions...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="session-manager">
      <div className="section-header">
        <h2>Session Management</h2>
        <p>Manage all voting sessions, start/stop voting, and monitor progress</p>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="sessions-overview">
        <div className="overview-stats">
          <div 
            className={`stat-card clickable ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode(viewMode === 'all' ? 'categorized' : 'all')}
          >
            <div className="stat-number">{sessions.length}</div>
            <div className="stat-label">Total Sessions</div>
            <div className="stat-action">👁️ Click to {viewMode === 'all' ? 'categorize' : 'view all'}</div>
          </div>
          <div className="stat-card pending">
            <div className="stat-number">{pendingSessions.length}</div>
            <div className="stat-label">Pending Sessions</div>
          </div>
          <div className="stat-card active">
            <div className="stat-number">{activeSessions.length}</div>
            <div className="stat-label">Active Sessions</div>
          </div>
          <div className="stat-card completed">
            <div className="stat-number">{completedSessions.length + expiredSessions.length}</div>
            <div className="stat-label">Finished Sessions</div>
          </div>
        </div>
      </div>

      <div className="sessions-content">
        <div className="sessions-list">
          {viewMode === 'all' ? (
            <div className="sessions-section">
              <h3 className="section-title all">📋 All Sessions</h3>
              <div className="sessions-grid">
                {sessions
                  .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
                  .map(renderSessionCard)
                }
              </div>
            </div>
          ) : (
            <>
              {pendingSessions.length > 0 && (
                <div className="sessions-section">
                  <h3 className="section-title pending">🟡 Pending Sessions ({pendingSessions.length})</h3>
                  <div className="sessions-grid">
                    {pendingSessions.map(renderSessionCard)}
                  </div>
                </div>
              )}

              {activeSessions.length > 0 && (
                <div className="sessions-section">
                  <h3 className="section-title active">🟢 Active Sessions ({activeSessions.length})</h3>
                  <div className="sessions-grid">
                    {activeSessions.map(renderSessionCard)}
                  </div>
                </div>
              )}

              {expiredSessions.length > 0 && (
                <div className="sessions-section">
                  <h3 className="section-title expired">🔴 Expired Sessions ({expiredSessions.length})</h3>
                  <p className="section-description">These sessions have passed their end time but are still active. Close them to finalize results.</p>
                  <div className="sessions-grid">
                    {expiredSessions.map(renderSessionCard)}
                  </div>
                </div>
              )}

              {inactiveSessions.length > 0 && (
                <div className="sessions-section">
                  <h3 className="section-title inactive">⚫ Inactive Sessions ({inactiveSessions.length})</h3>
                  <p className="section-description">These sessions are within their time range but not currently active.</p>
                  <div className="sessions-grid">
                    {inactiveSessions.map(renderSessionCard)}
                  </div>
                </div>
              )}

              {completedSessions.length > 0 && (
                <div className="sessions-section">
                  <h3 className="section-title completed">✅ Completed Sessions ({completedSessions.length})</h3>
                  <div className="sessions-grid">
                    {completedSessions.map(renderSessionCard)}
                  </div>
                </div>
              )}
            </>
          )}

          {sessions.length === 0 && (
            <div className="empty-state">
              <h3>📝 No sessions created yet</h3>
              <p>Create your first voting session to get started</p>
            </div>
          )}
        </div>

        {selectedSession && (
          <div className="session-details">
            <div className="details-header">
              <h3>📋 Session Details: {selectedSession.name}</h3>
              <button 
                onClick={() => setSelectedSession(null)}
                className="btn btn-secondary btn-small"
              >
                ❌ Close
              </button>
            </div>

            <div className="details-content">
              <div className="detail-section">
                <h4>📊 Session Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{selectedSession.name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className={`detail-value ${getSessionStatus(selectedSession).class}`}>
                      {getSessionStatus(selectedSession).icon} {getSessionStatus(selectedSession).text}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Category:</span>
                    <span className="detail-value">{getSessionCategory(selectedSession)}</span>
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
                    <span className="detail-label">Blockchain Active:</span>
                    <span className="detail-value">{selectedSession.isActive ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>👥 Candidates</h4>
                <div className="candidates-table">
                  {sessionCandidates.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Votes</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionCandidates.map(candidate => (
                          <tr key={candidate.id}>
                            <td>{candidate.id}</td>
                            <td>{candidate.name}</td>
                            <td>{candidate.voteCount}</td>
                            <td>
                              {selectedSession.totalVotes > 0 
                                ? Math.round((candidate.voteCount / selectedSession.totalVotes) * 100)
                                : 0
                              }%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="no-data">No candidates data available</p>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h4>⚡ Quick Actions</h4>
                <div className="quick-actions-grid">
                  {canStartSession(selectedSession) && (
                    <button
                      onClick={() => startSession(selectedSession.id)}
                      disabled={actionLoading === `start-${selectedSession.id}`}
                      className="btn btn-success"
                    >
                      {actionLoading === `start-${selectedSession.id}` ? '⏳ Starting...' : '▶️ Start Session'}
                    </button>
                  )}
                  
                  {canEndSession(selectedSession) && (
                    <button
                      onClick={() => endSession(selectedSession.id)}
                      disabled={actionLoading === `end-${selectedSession.id}`}
                      className="btn btn-danger"
                    >
                      {actionLoading === `end-${selectedSession.id}` ? '⏳ Ending...' : 
                       getSessionCategory(selectedSession) === 'expired' ? '🔒 Close Session' : '🛑 End Session'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionManager;