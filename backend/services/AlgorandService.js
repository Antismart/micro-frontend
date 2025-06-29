/**
 * Algorand Service - Handles all blockchain interactions
 */

import algosdk from 'algosdk';

export class AlgorandService {
  constructor() {
    // Algorand TestNet configuration
    this.algodToken = process.env.ALGOD_TOKEN || '';
    this.algodServer = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
    this.algodPort = process.env.ALGOD_PORT || '';
    
    this.algodClient = new algosdk.Algodv2(this.algodToken, this.algodServer, this.algodPort);
    
    // Contract configuration
    this.contractId = process.env.CONTRACT_ID || null;
    this.oracleAccount = this.loadOracleAccount();
  }

  /**
   * Load oracle account from environment variables
   */
  loadOracleAccount() {
    const mnemonic = process.env.ORACLE_MNEMONIC;
    if (!mnemonic) {
      throw new Error('Oracle mnemonic not found in environment variables');
    }
    
    return algosdk.mnemonicToSecretKey(mnemonic);
  }

  /**
   * Get network status and health
   */
  async getNetworkStatus() {
    try {
      const status = await this.algodClient.status().do();
      const params = await this.algodClient.getTransactionParams().do();
      
      return {
        lastRound: status['last-round'],
        timeSinceLastRound: status['time-since-last-round'],
        catchupTime: status['catchup-time'],
        genesisId: params.genesisID,
        genesisHash: params.genesisHash,
        minFee: params.minFee,
        suggestedFee: params.fee
      };
    } catch (error) {
      throw new Error(`Failed to get network status: ${error.message}`);
    }
  }

  /**
   * Get contract global and local state
   */
  async getContractState() {
    if (!this.contractId) {
      throw new Error('Contract ID not configured');
    }

    try {
      const appInfo = await this.algodClient.getApplicationByID(this.contractId).do();
      
      return {
        globalState: this.parseGlobalState(appInfo.params['global-state']),
        creator: appInfo.params.creator,
        approvalProgram: appInfo.params['approval-program'],
        clearStateProgram: appInfo.params['clear-state-program']
      };
    } catch (error) {
      throw new Error(`Failed to get contract state: ${error.message}`);
    }
  }

  /**
   * Parse global state from base64 encoded values
   */
  parseGlobalState(globalState) {
    const parsed = {};
    
    globalState.forEach(item => {
      const key = Buffer.from(item.key, 'base64').toString();
      const value = item.value.type === 1 ? 
        Buffer.from(item.value.bytes, 'base64').toString() : 
        item.value.uint;
      
      parsed[key] = value;
    });
    
    return parsed;
  }

  /**
   * Create a new insurance policy on-chain
   */
  async createInsurancePolicy(params) {
    const { farmerId, cropType, coverageAmount, startDate, endDate, premiumAmount } = params;
    
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      
      // Create application call transaction
      const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: this.oracleAccount.addr,
        appIndex: this.contractId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          new Uint8Array(Buffer.from('create_policy')),
          new Uint8Array(Buffer.from(cropType)),
          algosdk.encodeUint64(coverageAmount),
          algosdk.encodeUint64(Math.floor(startDate.getTime() / 1000)),
          algosdk.encodeUint64(Math.floor(endDate.getTime() / 1000))
        ],
        accounts: [farmerId],
        suggestedParams
      });

      // Create premium payment transaction
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: farmerId,
        to: algosdk.getApplicationAddress(this.contractId),
        amount: premiumAmount,
        suggestedParams
      });

      // Group transactions
      const txnGroup = [paymentTxn, appCallTxn];
      algosdk.assignGroupID(txnGroup);

      // Sign with oracle account (for demo - in production, farmer would sign)
      const signedTxns = [
        paymentTxn.signTxn(this.oracleAccount.sk),
        appCallTxn.signTxn(this.oracleAccount.sk)
      ];

      // Submit transaction group
      const { txId } = await this.algodClient.sendRawTransaction(signedTxns).do();
      await this.waitForTransaction(txId);

      return { transactionId: txId, success: true };
    } catch (error) {
      throw new Error(`Failed to create policy: ${error.message}`);
    }
  }

  /**
   * Process insurance payout
   */
  async processPayout(params) {
    const { policyHolderAddress, payoutAmount, weatherDataHash } = params;
    
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      
      const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: this.oracleAccount.addr,
        appIndex: this.contractId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          new Uint8Array(Buffer.from('claim_payout')),
          algosdk.encodeUint64(payoutAmount),
          new Uint8Array(Buffer.from(weatherDataHash, 'hex'))
        ],
        accounts: [policyHolderAddress],
        suggestedParams
      });

      const signedTxn = appCallTxn.signTxn(this.oracleAccount.sk);
      const { txId } = await this.algodClient.sendRawTransaction(signedTxn).do();
      
      await this.waitForTransaction(txId);
      
      return { transactionId: txId, success: true };
    } catch (error) {
      throw new Error(`Failed to process payout: ${error.message}`);
    }
  }

  /**
   * Get account information including ASAs
   */
  async getAccountInfo(address) {
    try {
      const accountInfo = await this.algodClient.accountInformation(address).do();
      
      return {
        address: accountInfo.address,
        balance: accountInfo.amount,
        assets: accountInfo.assets || [],
        createdAssets: accountInfo['created-assets'] || [],
        appsLocalState: accountInfo['apps-local-state'] || []
      };
    } catch (error) {
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txId) {
    const status = await this.algodClient.status().do();
    let lastRound = status['last-round'];
    
    while (true) {
      const pendingInfo = await this.algodClient.pendingTransactionInformation(txId).do();
      
      if (pendingInfo['confirmed-round'] !== null && pendingInfo['confirmed-round'] > 0) {
        return pendingInfo;
      }
      
      lastRound++;
      await this.algodClient.statusAfterBlock(lastRound).do();
    }
  }

  /**
   * Opt account into application
   */
  async optInToApplication(accountMnemonic, appId) {
    try {
      const account = algosdk.mnemonicToSecretKey(accountMnemonic);
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      
      const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
        from: account.addr,
        appIndex: appId,
        suggestedParams
      });
      
      const signedTxn = optInTxn.signTxn(account.sk);
      const { txId } = await this.algodClient.sendRawTransaction(signedTxn).do();
      
      await this.waitForTransaction(txId);
      
      return { transactionId: txId, success: true };
    } catch (error) {
      throw new Error(`Failed to opt in: ${error.message}`);
    }
  }
}