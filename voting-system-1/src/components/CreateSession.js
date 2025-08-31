import React, { useState } from 'react';

const CreateSession = ({ contract, onSessionCreated }) => {
  const [sessionData, setSessionData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    candidates: ['']
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setSessionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addCandidate = () => {
    setSessionData(prev => ({
      ...prev,
      candidates: [...prev.candidates, '']
    }));
  };

  const removeCandidate = (index) => {
    if (sessionData.candidates.length > 1) {
      setSessionData(prev => ({
        ...prev,
        candidates: prev.candidates.filter((_, i) => i !== index)
      }));
    }
  };

  const updateCandidate = (index, value) => {
    setSessionData(prev => ({
      ...prev,
      candidates: prev.candidates.map((candidate, i) => 
        i === index ? value : candidate
      )
    }));
  };

  const validateForm = () => {
    if (!sessionData.name.trim()) {
      setError('Session name is required');
      return false;
    }

    if (!sessionData.startTime || !sessionData.endTime) {
      setError('Start time and end time are required');
      return false;
    }

    const startDate = new Date(sessionData.startTime);
    const endDate = new Date(sessionData.endTime);
    const now = new Date();

    if (startDate <= now) {
      setError('Start time must be in the future');
      return false;
    }

    if (endDate <= startDate) {
      setError('End time must be after start time');
      return false;
    }

    const validCandidates = sessionData.candidates.filter(c => c.trim());
    if (validCandidates.length < 2) {
      setError('At least 2 candidates are required');
      return false;
    }

    // Check for duplicate candidates
    const uniqueCandidates = [...new Set(validCandidates.map(c => c.trim().toLowerCase()))];
    if (uniqueCandidates.length !== validCandidates.length) {
      setError('Duplicate candidate names are not allowed');
      return false;
    }

    return true;
  };

  const createSession = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');

      const startTimestamp = Math.floor(new Date(sessionData.startTime).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(sessionData.endTime).getTime() / 1000);
      const validCandidates = sessionData.candidates.filter(c => c.trim()).map(c => c.trim());

      const transaction = await contract.createSession(
        sessionData.name.trim(),
        startTimestamp,
        endTimestamp,
        validCandidates
      );

      await transaction.wait();

      // Reset form
      setSessionData({
        name: '',
        startTime: '',
        endTime: '',
        candidates: ['']
      });

      alert('✅ Session created successfully!');
      onSessionCreated();

    } catch (error) {
      console.error('Error creating session:', error);
      setError(error.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTimeLocal = (date) => {
    const now = date || new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="create-session">
      <div className="section-header">
        <h2>➕ Create New Voting Session</h2>
        <p>Set up a new voting session with candidates and timing</p>
      </div>

      <div className="create-form">
        <div className="form-section">
          <h3>📝 Session Details</h3>
          
          <div className="form-group">
            <label htmlFor="sessionName">Session Name *</label>
            <input
              id="sessionName"
              type="text"
              value={sessionData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Presidential Election 2024"
              className="form-input"
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">Start Time *</label>
              <input
                id="startTime"
                type="datetime-local"
                value={sessionData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                min={formatDateTimeLocal()}
                className="form-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="endTime">End Time *</label>
              <input
                id="endTime"
                type="datetime-local"
                value={sessionData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                min={sessionData.startTime || formatDateTimeLocal()}
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header-inline">
            <h3>👥 Candidates</h3>
            <button 
              type="button"
              onClick={addCandidate}
              className="btn btn-secondary btn-small"
              disabled={loading}
            >
              ➕ Add Candidate
            </button>
          </div>

          <div className="candidates-list">
            {sessionData.candidates.map((candidate, index) => (
              <div key={index} className="candidate-input-group">
                <div className="candidate-number">{index + 1}</div>
                <input
                  type="text"
                  value={candidate}
                  onChange={(e) => updateCandidate(index, e.target.value)}
                  placeholder={`Candidate ${index + 1} name`}
                  className="form-input candidate-input"
                  disabled={loading}
                />
                {sessionData.candidates.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCandidate(index)}
                    className="btn btn-danger btn-small remove-btn"
                    disabled={loading}
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="candidates-preview">
            <h4>Preview:</h4>
            <div className="preview-list">
              {sessionData.candidates
                .filter(c => c.trim())
                .map((candidate, index) => (
                  <span key={index} className="preview-candidate">
                    {candidate.trim()}
                  </span>
                ))}
              {sessionData.candidates.filter(c => c.trim()).length === 0 && (
                <span className="preview-empty">No candidates added yet</span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <div className="form-actions">
          <button
            onClick={createSession}
            disabled={loading}
            className="btn btn-primary btn-large"
          >
            {loading ? (
              <>
                <div className="btn-spinner"></div>
                Creating Session...
              </>
            ) : (
              '🚀 Create Session'
            )}
          </button>
        </div>

        <div className="form-notes">
          <h4>📋 Notes:</h4>
          <ul>
            <li>Session name should be descriptive and unique</li>
            <li>Start time must be in the future</li>
            <li>At least 2 candidates are required</li>
            <li>Candidate names must be unique</li>
            <li>Once created, the session can be started/stopped from the management panel</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateSession;