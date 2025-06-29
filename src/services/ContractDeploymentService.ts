/**
 * Smart Contract Deployment Service
 * Handles deployment and management of insurance smart contracts
 */

import algosdk from 'algosdk';

export class ContractDeploymentService {
  private algodClient: algosdk.Algodv2;
  private creatorAccount: algosdk.Account;

  constructor(algodToken: string = '', algodServer: string = 'https://testnet-api.algonode.cloud', algodPort: string = '') {
    this.algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);
  }

  /**
   * Set creator account from mnemonic
   */
  setCreatorAccount(mnemonic: string) {
    this.creatorAccount = algosdk.mnemonicToSecretKey(mnemonic);
  }

  /**
   * Deploy the insurance smart contract
   */
  async deployContract(approvalProgram: string, clearProgram: string): Promise<number> {
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();

      // Compile programs
      const approvalCompiled = await this.algodClient.compile(approvalProgram).do();
      const clearCompiled = await this.algodClient.compile(clearProgram).do();

      // Create application
      const createTxn = algosdk.makeApplicationCreateTxnFromObject({
        from: this.creatorAccount.addr,
        suggestedParams,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        approvalProgram: new Uint8Array(Buffer.from(approvalCompiled.result, 'base64')),
        clearProgram: new Uint8Array(Buffer.from(clearCompiled.result, 'base64')),
        numLocalInts: 4,
        numLocalByteSlices: 2,
        numGlobalInts: 8,
        numGlobalByteSlices: 4,
      });

      // Sign and submit
      const signedTxn = createTxn.signTxn(this.creatorAccount.sk);
      const { txId } = await this.algodClient.sendRawTransaction(signedTxn).do();

      // Wait for confirmation
      const result = await this.waitForTransaction(txId);
      const appId = result['application-index'];

      console.log(`✅ Contract deployed successfully! App ID: ${appId}`);
      return appId;

    } catch (error) {
      console.error('❌ Contract deployment failed:', error);
      throw error;
    }
  }

  /**
   * Update contract code
   */
  async updateContract(appId: number, approvalProgram: string, clearProgram: string): Promise<string> {
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();

      // Compile programs
      const approvalCompiled = await this.algodClient.compile(approvalProgram).do();
      const clearCompiled = await this.algodClient.compile(clearProgram).do();

      // Create update transaction
      const updateTxn = algosdk.makeApplicationUpdateTxnFromObject({
        from: this.creatorAccount.addr,
        suggestedParams,
        appIndex: appId,
        approvalProgram: new Uint8Array(Buffer.from(approvalCompiled.result, 'base64')),
        clearProgram: new Uint8Array(Buffer.from(clearCompiled.result, 'base64')),
      });

      // Sign and submit
      const signedTxn = updateTxn.signTxn(this.creatorAccount.sk);
      const { txId } = await this.algodClient.sendRawTransaction(signedTxn).do();

      await this.waitForTransaction(txId);
      console.log(`✅ Contract updated successfully! Transaction: ${txId}`);
      return txId;

    } catch (error) {
      console.error('❌ Contract update failed:', error);
      throw error;
    }
  }

  /**
   * Fund contract with initial ALGO
   */
  async fundContract(appId: number, amount: number): Promise<string> {
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      const contractAddress = algosdk.getApplicationAddress(appId);

      const fundTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.creatorAccount.addr,
        to: contractAddress,
        amount: amount * 1000000, // Convert to microAlgos
        suggestedParams,
      });

      const signedTxn = fundTxn.signTxn(this.creatorAccount.sk);
      const { txId } = await this.algodClient.sendRawTransaction(signedTxn).do();

      await this.waitForTransaction(txId);
      console.log(`✅ Contract funded with ${amount} ALGO! Transaction: ${txId}`);
      return txId;

    } catch (error) {
      console.error('❌ Contract funding failed:', error);
      throw error;
    }
  }

  /**
   * Get contract information
   */
  async getContractInfo(appId: number) {
    try {
      const appInfo = await this.algodClient.getApplicationByID(appId).do();
      const contractAddress = algosdk.getApplicationAddress(appId);
      const accountInfo = await this.algodClient.accountInformation(contractAddress).do();

      return {
        appId,
        creator: appInfo.params.creator,
        contractAddress,
        balance: accountInfo.amount / 1000000, // Convert from microAlgos
        globalState: this.parseGlobalState(appInfo.params['global-state']),
        localStateSchema: appInfo.params['local-state-schema'],
        globalStateSchema: appInfo.params['global-state-schema'],
      };

    } catch (error) {
      console.error('❌ Failed to get contract info:', error);
      throw error;
    }
  }

  /**
   * Parse global state from base64 encoded values
   */
  private parseGlobalState(globalState: any[]) {
    const parsed: Record<string, any> = {};
    
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
   * Wait for transaction confirmation
   */
  private async waitForTransaction(txId: string) {
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
   * Delete contract (for testing purposes)
   */
  async deleteContract(appId: number): Promise<string> {
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();

      const deleteTxn = algosdk.makeApplicationDeleteTxnFromObject({
        from: this.creatorAccount.addr,
        suggestedParams,
        appIndex: appId,
      });

      const signedTxn = deleteTxn.signTxn(this.creatorAccount.sk);
      const { txId } = await this.algodClient.sendRawTransaction(signedTxn).do();

      await this.waitForTransaction(txId);
      console.log(`✅ Contract deleted successfully! Transaction: ${txId}`);
      return txId;

    } catch (error) {
      console.error('❌ Contract deletion failed:', error);
      throw error;
    }
  }
}