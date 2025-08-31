const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Starting deployment of MultiSessionVotingSystem contract...");

  const [deployer] = await ethers.getSigners();
  
  console.log("📝 Deploying contracts with the account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy the contract
  const MultiSessionVotingSystem = await ethers.getContractFactory("MultiSessionVotingSystem");
  console.log("⏳ Deploying MultiSessionVotingSystem contract...");
  
  const votingSystem = await MultiSessionVotingSystem.deploy();
  await votingSystem.waitForDeployment();
  
  const contractAddress = await votingSystem.getAddress();
  console.log("✅ MultiSessionVotingSystem deployed to:", contractAddress);

  // Create the contract data object
  const contractData = {
    address: contractAddress,
    abi: JSON.parse(votingSystem.interface.formatJson())
  };

  // Create src/contracts directory if it doesn't exist
  const contractsDir = path.join(__dirname, '..', 'src', 'contracts');
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
    console.log("📁 Created contracts directory");
  }

  // Write contract data to file
  const contractFilePath = path.join(contractsDir, 'MultiSessionVotingSystem.json');
  fs.writeFileSync(contractFilePath, JSON.stringify(contractData, null, 2));
  console.log("💾 Contract ABI and address saved to src/contracts/MultiSessionVotingSystem.json");

  // Verify the deployment
  console.log("\n🔍 Verifying deployment...");
  
  const owner = await votingSystem.owner();
  console.log("👑 Contract Owner:", owner);
  
  const sessionCount = await votingSystem.sessionCount();
  console.log("📊 Initial Session Count:", sessionCount.toString());

  // Create a demo session for testing
  console.log("\n🎯 Creating demo session for testing...");
  
  const currentTime = Math.floor(Date.now() / 1000);
  const sessionName = "Demo Election 2024";
  const startTime = currentTime;
  const endTime = currentTime + (24 * 60 * 60); // 24 hours from now
  const candidates = ["Subhash", "Abhik", "Pranav"];

  try {
    const createTx = await votingSystem.createSession(
      sessionName,
      startTime,
      endTime,
      candidates
    );
    await createTx.wait();

    const newSessionCount = await votingSystem.sessionCount();
    console.log("✅ Demo session created! Session ID:", newSessionCount.toString());
    
    // Get session details
    const sessionDetails = await votingSystem.getSession(1);
    console.log("📋 Session Details:");
    console.log(`   Name: ${sessionDetails.sessionName}`);
    console.log(`   Start: ${new Date(sessionDetails.startTime * 1000).toLocaleString()}`);
    console.log(`   End: ${new Date(sessionDetails.endTime * 1000).toLocaleString()}`);
    console.log(`   Candidates: ${sessionDetails.candidateCount}`);
    
    // Get candidates
    const sessionCandidates = await votingSystem.getSessionCandidates(1);
    console.log("👥 Candidates:");
    sessionCandidates.forEach((candidate, index) => {
      console.log(`   ${index + 1}. ${candidate.name} (ID: ${candidate.id}, Votes: ${candidate.voteCount})`);
    });

    // Start the demo session
    const startTx = await votingSystem.startSession(1);
    await startTx.wait();
    console.log("▶️ Demo session started and ready for voting!");

  } catch (error) {
    console.log("⚠️ Could not create demo session:", error.message);
  }

  console.log("\n🎉 Deployment completed successfully!");
  console.log("🌐 You can now start the React frontend with: npm start");
  console.log("🔗 Make sure MetaMask is connected to Ganache network (Chain ID: 1337)");
  console.log("\n📝 Owner Functions Available:");
  console.log("   - Create new voting sessions");
  console.log("   - Manage candidates");
  console.log("   - Start/stop sessions");
  console.log("   - Register voters");
  console.log("\n🗳️ Voter Functions Available:");
  console.log("   - Register to vote");
  console.log("   - Vote in active sessions");
  console.log("   - View session results");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error during deployment:", error);
    process.exit(1);
  });