/**
 * Insurance Contract Hook
 * Manages interactions with the enhanced insurance smart contract
 */

import { useState, useCallback } from 'react';
import algosdk from 'algosdk';
import { useAlgorand } from './useAlgorand';

interface ContractState {
  totalPolicies: number;
  totalClaims: number;
  totalPayouts: number;
  oracleAddress: string;
  contractAdmin: string;
  kycRequired: boolean;
  minCoverage: number;
  maxCoverage: number;
}

interface PolicyCreationParams {
  coverageType: string;
  coverageAmount: number;
  duration: number;
  deductible: number;
  locationRisk: number;
  age: number;
  historicalClaims: number;
}

interface KYCSubmissionParams {
  fullNameHash: string;
  idDocumentHash: string;
  addressProofHash: string;
  contactInfoHash: string;
}

export const useInsuranceContract = (contractId: number) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractState, setContractState] = useState<ContractState | null>(null);
  
  const { signTransaction, currentAccount, isConnected } = useAlgorand();
  
  const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');

  const getContractState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const appInfo = await algodClient.getApplicationByID(contractId).do();
      const globalState = appInfo.params['global-state'];
      
      const parsedState: ContractState = {
        totalPolicies: 0,
        totalClaims: 0,
        totalPayouts: 0,
        oracleAddress: '',
        contractAdmin: '',
        kycRequired: false,
        minCoverage: 100,
        maxCoverage: 100000
      };
      
      globalState.forEach((item: any) => {
        const key = Buffer.from(item.key, 'base64').toString();
        const value = item.value.type === 1 ? 
          Buffer.from(item.value.bytes, 'base64').toString() : 
          item.value.uint;
        
        switch (key) {
          case 'total_policies':
            parsedState.totalPolicies = value;
            break;
          case 'total_claims':
            parsedState.totalClaims = value;
            break;
          case 'total_payouts':
            parsedState.totalPayouts = value;
            break;
          case 'oracle_address':
            parsedState.oracleAddress = value;
            break;
          case 'contract_admin':
            parsedState.contractAdmin = value;
            break;
          case 'kyc_required':
            parsedState.kycRequired = value === 1;
            break;
          case 'min_coverage':
            parsedState.minCoverage = value;
            break;
          case 'max_coverage':
            parsedState.maxCoverage = value;
            break;
        }
      });
      
      setContractState(parsedState);
      return parsedState;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get contract state';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  const submitKYC = useCallback(async (kycData: KYCSubmissionParams) => {
    if (!isConnected || !currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);
      
      const suggestedParams = await algodClient.getTransactionParams().do();
      
      const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: currentAccount,
        appIndex: contractId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          new Uint8Array(Buffer.from('submit_kyc')),
          new Uint8Array(Buffer.from(kycData.fullNameHash, 'hex')),
          new Uint8Array(Buffer.from(kycData.idDocumentHash, 'hex')),
          new Uint8Array(Buffer.from(kycData.addressProofHash, 'hex')),
          new Uint8Array(Buffer.from(kycData.contactInfoHash, 'hex'))
        ],
        suggestedParams
      });

      const signedTxn = await signTransaction(appCallTxn);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      await waitForTransaction(txId);
      
      return { transactionId: txId, success: true };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'KYC submission failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isConnected, currentAccount, contractId, signTransaction]);

  const createPolicy = useCallback(async (params: PolicyCreationParams, premiumAmount: number) => {
    if (!isConnected || !currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);
      
      const suggestedParams = await algodClient.getTransactionParams().do();
      
      // Create premium payment transaction
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: currentAccount,
        to: algosdk.getApplicationAddress(contractId),
        amount: premiumAmount * 1000000, // Convert to microAlgos
        suggestedParams
      });

      // Create application call transaction
      const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: currentAccount,
        appIndex: contractId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          new Uint8Array(Buffer.from('create_policy')),
          new Uint8Array(Buffer.from(params.coverageType)),
          algosdk.encodeUint64(params.coverageAmount * 1000000), // Convert to microAlgos
          algosdk.encodeUint64(params.duration),
          algosdk.encodeUint64(params.deductible * 1000000), // Convert to microAlgos
          algosdk.encodeUint64(params.locationRisk),
          algosdk.encodeUint64(params.age),
          algosdk.encodeUint64(params.historicalClaims)
        ],
        accounts: [currentAccount],
        suggestedParams
      });

      // Group transactions
      const txnGroup = [paymentTxn, appCallTxn];
      algosdk.assignGroupID(txnGroup);

      // Sign transactions
      const signedPayment = await signTransaction(paymentTxn);
      const signedAppCall = await signTransaction(appCallTxn);

      // Submit transaction group
      const { txId } = await algodClient.sendRawTransaction([signedPayment, signedAppCall]).do();
      
      await waitForTransaction(txId);
      
      return { transactionId: txId, success: true };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Policy creation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isConnected, currentAccount, contractId, signTransaction]);

  const getUserLocalState = useCallback(async (userAddress: string) => {
    try {
      const accountInfo = await algodClient.accountInformation(userAddress).do();
      const appsLocalState = accountInfo['apps-local-state'] || [];
      
      const appLocalState = appsLocalState.find((app: any) => app.id === contractId);
      
      if (!appLocalState) {
        return null;
      }
      
      const localState = {
        activePolicies: 0,
        totalCoverage: 0,
        kycStatus: 0,
        riskScore: 50
      };
      
      appLocalState['key-value'].forEach((item: any) => {
        const key = Buffer.from(item.key, 'base64').toString();
        const value = item.value.uint;
        
        switch (key) {
          case 'active_policies':
            localState.activePolicies = value;
            break;
          case 'total_coverage':
            localState.totalCoverage = value / 1000000; // Convert from microAlgos
            break;
          case 'kyc_status':
            localState.kycStatus = value;
            break;
          case 'risk_score':
            localState.riskScore = value;
            break;
        }
      });
      
      return localState;
      
    } catch (err) {
      console.error('Failed to get user local state:', err);
      return null;
    }
  }, [contractId]);

  const optInToContract = useCallback(async () => {
    if (!isConnected || !currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);
      
      const suggestedParams = await algodClient.getTransactionParams().do();
      
      const optInTxn = algosdk.makeApplicationOptInTxnFromObject({
        from: currentAccount,
        appIndex: contractId,
        suggestedParams
      });
      
      const signedTxn = await signTransaction(optInTxn);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      await waitForTransaction(txId);
      
      return { transactionId: txId, success: true };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Opt-in failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isConnected, currentAccount, contractId, signTransaction]);

  const waitForTransaction = async (txId: string) => {
    const status = await algodClient.status().do();
    let lastRound = status['last-round'];
    
    while (true) {
      const pendingInfo = await algodClient.pendingTransactionInformation(txId).do();
      
      if (pendingInfo['confirmed-round'] !== null && pendingInfo['confirmed-round'] > 0) {
        return pendingInfo;
      }
      
      lastRound++;
      await algodClient.statusAfterBlock(lastRound).do();
    }
  };

  return {
    loading,
    error,
    contractState,
    getContractState,
    submitKYC,
    createPolicy,
    getUserLocalState,
    optInToContract,
    clearError: () => setError(null)
  };
};