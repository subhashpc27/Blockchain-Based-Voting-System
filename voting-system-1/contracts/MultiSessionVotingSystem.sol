// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MultiSessionVotingSystem {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
        bool isActive;
    }
    
    struct VotingSession {
        uint256 sessionId;
        string sessionName;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool isCreated;
        uint256 candidateCount;
        uint256 totalVotes;
        mapping(uint256 => Candidate) candidates;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voterChoice;
    }
    
    mapping(uint256 => VotingSession) public votingSessions;
    mapping(address => bool) public registeredVoters;
    
    uint256 public sessionCount;
    address public owner;
    
    // Events
    event SessionCreated(uint256 indexed sessionId, string sessionName, uint256 startTime, uint256 endTime);
    event SessionStarted(uint256 indexed sessionId);
    event SessionEnded(uint256 indexed sessionId);
    event CandidateAdded(uint256 indexed sessionId, uint256 candidateId, string candidateName);
    event CandidateUpdated(uint256 indexed sessionId, uint256 candidateId, string newName);
    event CandidateRemoved(uint256 indexed sessionId, uint256 candidateId);
    event VoteCast(uint256 indexed sessionId, address indexed voter, uint256 candidateId);
    event VoterRegistered(address indexed voter);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier sessionExists(uint256 _sessionId) {
        require(_sessionId > 0 && _sessionId <= sessionCount, "Session does not exist");
        require(votingSessions[_sessionId].isCreated, "Session not found");
        _;
    }
    
    modifier sessionNotActive(uint256 _sessionId) {
        require(!isSessionActive(_sessionId), "Cannot modify active session");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        sessionCount = 0;
        registeredVoters[msg.sender] = true; // Owner is automatically registered
    }
    
    // === OWNER FUNCTIONS ===
    
    function createSession(
        string memory _sessionName,
        uint256 _startTime,
        uint256 _endTime,
        string[] memory _candidateNames
    ) public onlyOwner returns (uint256) {
        require(_startTime < _endTime, "Invalid time range");
        require(_candidateNames.length > 0, "At least one candidate required");
        require(bytes(_sessionName).length > 0, "Session name cannot be empty");
        
        sessionCount++;
        VotingSession storage newSession = votingSessions[sessionCount];
        
        newSession.sessionId = sessionCount;
        newSession.sessionName = _sessionName;
        newSession.startTime = _startTime;
        newSession.endTime = _endTime;
        newSession.isActive = false;
        newSession.isCreated = true;
        newSession.candidateCount = 0;
        newSession.totalVotes = 0;
        
        // Add candidates
        for (uint256 i = 0; i < _candidateNames.length; i++) {
            addCandidateToSession(sessionCount, _candidateNames[i]);
        }
        
        emit SessionCreated(sessionCount, _sessionName, _startTime, _endTime);
        return sessionCount;
    }
    
    function addCandidateToSession(uint256 _sessionId, string memory _candidateName) 
        public onlyOwner sessionExists(_sessionId) sessionNotActive(_sessionId) {
        require(bytes(_candidateName).length > 0, "Candidate name cannot be empty");
        
        VotingSession storage session = votingSessions[_sessionId];
        session.candidateCount++;
        
        session.candidates[session.candidateCount] = Candidate({
            id: session.candidateCount,
            name: _candidateName,
            voteCount: 0,
            isActive: true
        });
        
        emit CandidateAdded(_sessionId, session.candidateCount, _candidateName);
    }
    
    function updateCandidate(uint256 _sessionId, uint256 _candidateId, string memory _newName) 
        public onlyOwner sessionExists(_sessionId) sessionNotActive(_sessionId) {
        require(bytes(_newName).length > 0, "Candidate name cannot be empty");
        
        VotingSession storage session = votingSessions[_sessionId];
        require(_candidateId > 0 && _candidateId <= session.candidateCount, "Invalid candidate ID");
        require(session.candidates[_candidateId].isActive, "Candidate not active");
        
        session.candidates[_candidateId].name = _newName;
        emit CandidateUpdated(_sessionId, _candidateId, _newName);
    }
    
    function removeCandidateFromSession(uint256 _sessionId, uint256 _candidateId) 
        public onlyOwner sessionExists(_sessionId) sessionNotActive(_sessionId) {
        VotingSession storage session = votingSessions[_sessionId];
        require(_candidateId > 0 && _candidateId <= session.candidateCount, "Invalid candidate ID");
        require(session.candidates[_candidateId].isActive, "Candidate already inactive");
        
        session.candidates[_candidateId].isActive = false;
        emit CandidateRemoved(_sessionId, _candidateId);
    }
    
    function startSession(uint256 _sessionId) public onlyOwner sessionExists(_sessionId) {
        VotingSession storage session = votingSessions[_sessionId];
        require(!session.isActive, "Session already active");
        require(block.timestamp >= session.startTime, "Session start time not reached");
        require(block.timestamp < session.endTime, "Session end time passed");
        
        session.isActive = true;
        emit SessionStarted(_sessionId);
    }
    
    function endSession(uint256 _sessionId) public onlyOwner sessionExists(_sessionId) {
        VotingSession storage session = votingSessions[_sessionId];
        require(session.isActive, "Session not active");
        
        session.isActive = false;
        emit SessionEnded(_sessionId);
    }
    
    function registerVoter(address _voter) public onlyOwner {
        require(_voter != address(0), "Invalid voter address");
        require(!registeredVoters[_voter], "Voter already registered");
        
        registeredVoters[_voter] = true;
        emit VoterRegistered(_voter);
    }
    
    function registerMultipleVoters(address[] memory _voters) public onlyOwner {
        for (uint256 i = 0; i < _voters.length; i++) {
            if (!registeredVoters[_voters[i]] && _voters[i] != address(0)) {
                registeredVoters[_voters[i]] = true;
                emit VoterRegistered(_voters[i]);
            }
        }
    }
    
    // === VOTER FUNCTIONS ===
    
    function registerSelf() public {
        require(!registeredVoters[msg.sender], "Already registered");
        registeredVoters[msg.sender] = true;
        emit VoterRegistered(msg.sender);
    }
    
    function vote(uint256 _sessionId, uint256 _candidateId) public sessionExists(_sessionId) {
        require(registeredVoters[msg.sender], "Not registered to vote");
        require(isSessionActive(_sessionId), "Session not active");
        
        VotingSession storage session = votingSessions[_sessionId];
        require(!session.hasVoted[msg.sender], "Already voted in this session");
        require(_candidateId > 0 && _candidateId <= session.candidateCount, "Invalid candidate");
        require(session.candidates[_candidateId].isActive, "Candidate not active");
        
        session.hasVoted[msg.sender] = true;
        session.voterChoice[msg.sender] = _candidateId;
        session.candidates[_candidateId].voteCount++;
        session.totalVotes++;
        
        emit VoteCast(_sessionId, msg.sender, _candidateId);
    }
    
    // === VIEW FUNCTIONS ===
    
    function isSessionActive(uint256 _sessionId) public view returns (bool) {
        if (_sessionId == 0 || _sessionId > sessionCount) return false;
        
        VotingSession storage session = votingSessions[_sessionId];
        if (!session.isCreated || !session.isActive) return false;
        
        return (block.timestamp >= session.startTime && block.timestamp <= session.endTime);
    }
    
    function getSession(uint256 _sessionId) public view sessionExists(_sessionId) 
        returns (
            string memory sessionName,
            uint256 startTime,
            uint256 endTime,
            bool isActive,
            uint256 candidateCount,
            uint256 totalVotes
        ) {
        VotingSession storage session = votingSessions[_sessionId];
        return (
            session.sessionName,
            session.startTime,
            session.endTime,
            session.isActive,
            session.candidateCount,
            session.totalVotes
        );
    }
    
    function getSessionCandidates(uint256 _sessionId) public view sessionExists(_sessionId) 
        returns (Candidate[] memory) {
        VotingSession storage session = votingSessions[_sessionId];
        
        // Count active candidates
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= session.candidateCount; i++) {
            if (session.candidates[i].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active candidates
        Candidate[] memory candidates = new Candidate[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= session.candidateCount; i++) {
            if (session.candidates[i].isActive) {
                candidates[index] = session.candidates[i];
                index++;
            }
        }
        
        return candidates;
    }
    
    function getAllActiveSessions() public view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // Count active sessions
        for (uint256 i = 1; i <= sessionCount; i++) {
            if (isSessionActive(i)) {
                activeCount++;
            }
        }
        
        // Create array of active session IDs
        uint256[] memory activeSessions = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= sessionCount; i++) {
            if (isSessionActive(i)) {
                activeSessions[index] = i;
                index++;
            }
        }
        
        return activeSessions;
    }
    
    function getAllSessions() public view returns (uint256[] memory) {
        uint256[] memory allSessions = new uint256[](sessionCount);
        for (uint256 i = 1; i <= sessionCount; i++) {
            allSessions[i - 1] = i;
        }
        return allSessions;
    }
    
    function getSessionWinner(uint256 _sessionId) public view sessionExists(_sessionId) 
        returns (string memory winnerName, uint256 winnerVotes, bool isTie) {
        VotingSession storage session = votingSessions[_sessionId];
        
        if (session.totalVotes == 0) {
            return ("No votes cast", 0, false);
        }
        
        uint256 maxVotes = 0;
        uint256 winnerId = 0;
        uint256 tieCount = 0;
        
        for (uint256 i = 1; i <= session.candidateCount; i++) {
            if (session.candidates[i].isActive) {
                if (session.candidates[i].voteCount > maxVotes) {
                    maxVotes = session.candidates[i].voteCount;
                    winnerId = i;
                    tieCount = 1;
                } else if (session.candidates[i].voteCount == maxVotes && maxVotes > 0) {
                    tieCount++;
                }
            }
        }
        
        if (winnerId > 0) {
            return (session.candidates[winnerId].name, maxVotes, tieCount > 1);
        }
        
        return ("No winner", 0, false);
    }
    
    function hasVotedInSession(address _voter, uint256 _sessionId) public view sessionExists(_sessionId) 
        returns (bool) {
        return votingSessions[_sessionId].hasVoted[_voter];
    }
    
    function getVoterChoice(address _voter, uint256 _sessionId) public view sessionExists(_sessionId) 
        returns (uint256) {
        require(votingSessions[_sessionId].hasVoted[_voter], "Voter has not voted in this session");
        return votingSessions[_sessionId].voterChoice[_voter];
    }
    
    function isRegisteredVoter(address _voter) public view returns (bool) {
        return registeredVoters[_voter];
    }
}