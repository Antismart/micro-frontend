/**
 * Contract Deployment Script
 * Deploy the insurance smart contract to Algorand TestNet
 */

import fs from 'fs';
import path from 'path';
import { ContractDeploymentService } from '../src/services/ContractDeploymentService.js';

// Load TEAL programs
const approvalProgram = fs.readFileSync(
  path.join(process.cwd(), 'contracts/build/enhanced_approval.teal'), 
  'utf8'
);

const clearProgram = fs.readFileSync(
  path.join(process.cwd(), 'contracts/build/enhanced_clear.teal'), 
  'utf8'
);

async function deployContract() {
  try {
    console.log('🚀 Starting contract deployment...');
    
    // Initialize deployment service
    const deploymentService = new ContractDeploymentService();
    
    // Set creator account (replace with your mnemonic)
    const creatorMnemonic = process.env.CREATOR_MNEMONIC;
    if (!creatorMnemonic) {
      throw new Error('CREATOR_MNEMONIC environment variable not set');
    }
    
    deploymentService.setCreatorAccount(creatorMnemonic);
    
    // Deploy contract
    const appId = await deploymentService.deployContract(approvalProgram, clearProgram);
    
    // Fund contract with initial ALGO
    await deploymentService.fundContract(appId, 1000); // Fund with 1000 ALGO
    
    // Get contract info
    const contractInfo = await deploymentService.getContractInfo(appId);
    
    console.log('\n📋 Contract Deployment Summary:');
    console.log('================================');
    console.log(`App ID: ${contractInfo.appId}`);
    console.log(`Creator: ${contractInfo.creator}`);
    console.log(`Contract Address: ${contractInfo.contractAddress}`);
    console.log(`Balance: ${contractInfo.balance} ALGO`);
    console.log(`Global State:`, contractInfo.globalState);
    
    // Save contract info to file
    const contractData = {
      appId: contractInfo.appId,
      contractAddress: contractInfo.contractAddress,
      creator: contractInfo.creator,
      deployedAt: new Date().toISOString(),
      network: 'testnet'
    };
    
    fs.writeFileSync(
      path.join(process.cwd(), 'contract-info.json'),
      JSON.stringify(contractData, null, 2)
    );
    
    console.log('\n✅ Contract deployed successfully!');
    console.log(`📄 Contract info saved to contract-info.json`);
    console.log(`🔗 View on AlgoExplorer: https://testnet.algoexplorer.io/application/${appId}`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment
deployContract();