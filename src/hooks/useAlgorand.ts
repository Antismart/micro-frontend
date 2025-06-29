/**
 * Algorand Wallet Hook - Pera Wallet Integration
 * Manages wallet connection and blockchain interactions
 */

import { useState, useEffect, useCallback } from 'react';
import algosdk from 'algosdk';
import { PeraWalletConnect } from '@perawallet/connect';

interface AlgorandState {
  isConnected: boolean;
  accounts: string[];
  balance: number;
  loading: boolean;
  error: string | null;
}

// Initialize Pera Wallet
const peraWallet = new PeraWalletConnect({
  shouldShowSignTxnToast: false,
});

export const useAlgorand = () => {
  const [state, setState] = useState<AlgorandState>({
    isConnected: false,
    accounts: [],
    balance: 0,
    loading: false,
    error: null
  });

  // Initialize wallet connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if wallet was previously connected
        const accounts = peraWallet.connector?.accounts || [];
        if (accounts.length > 0) {
          setState(prev => ({
            ...prev,
            isConnected: true,
            accounts
          }));
          await fetchBalance(accounts[0]);
        }
      } catch (error) {
        console.error('Failed to check existing connection:', error);
      }
    };

    checkConnection();

    // Listen for wallet connection events
    peraWallet.connector?.on('connect', (accounts: string[]) => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        accounts,
        error: null
      }));
      if (accounts.length > 0) {
        fetchBalance(accounts[0]);
      }
    });

    peraWallet.connector?.on('disconnect', () => {
      setState({
        isConnected: false,
        accounts: [],
        balance: 0,
        loading: false,
        error: null
      });
    });

    // Cleanup
    return () => {
      peraWallet.connector?.off('connect');
      peraWallet.connector?.off('disconnect');
    };
  }, []);

  const connectWallet = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('Attempting to connect to Pera Wallet...');
      
      // Request connection to Pera Wallet
      const accounts = await peraWallet.connect();
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please make sure you have an Algorand account in Pera Wallet.');
      }
      
      setState(prev => ({
        ...prev,
        isConnected: true,
        accounts,
        loading: false
      }));

      console.log('Successfully connected to Pera Wallet:', accounts[0]);
      await fetchBalance(accounts[0]);
      
    } catch (error) {
      console.error('Wallet connection error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Pera Wallet'
      }));
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      await peraWallet.disconnect();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
    
    setState({
      isConnected: false,
      accounts: [],
      balance: 0,
      loading: false,
      error: null
    });
  }, []);

  const fetchBalance = async (address: string) => {
    try {
      const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
      const accountInfo = await algodClient.accountInformation(address).do();
      
      setState(prev => ({
        ...prev,
        balance: Number(accountInfo.amount) / 1000000 // Convert BigInt to Number, then convert microAlgos to Algos
      }));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const signTransaction = useCallback(async (txn: algosdk.Transaction) => {
    if (!state.isConnected || state.accounts.length === 0) {
      throw new Error('Wallet not connected');
    }

    try {
      const signedTxn = await peraWallet.signTransaction([txn]);
      return signedTxn[0];
    } catch (error) {
      throw new Error(`Failed to sign transaction: ${error}`);
    }
  }, [state.isConnected, state.accounts]);

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    signTransaction,
    currentAccount: state.accounts[0] || null,
    isPeraWalletAvailable: true // Pera Wallet is always available as it's a web-based wallet
  };
};