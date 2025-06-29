/**
 * Cryptographic utilities for KYC data hashing and verification
 */

import algosdk from 'algosdk';

export class CryptoUtils {
  /**
   * Hash sensitive KYC data for secure storage
   */
  static hashKYCData(data: string, salt?: string): string {
    const saltValue = salt || Math.random().toString(36).substring(2, 15);
    const combined = data + saltValue;
    const hash = algosdk.sha256(new TextEncoder().encode(combined));
    return Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate secure random salt
   */
  static generateSalt(): string {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create policy metadata hash
   */
  static createPolicyHash(policyData: {
    holder: string;
    coverageType: string;
    amount: number;
    duration: number;
    timestamp: number;
  }): string {
    const dataString = `${policyData.holder}-${policyData.coverageType}-${policyData.amount}-${policyData.duration}-${policyData.timestamp}`;
    const hash = algosdk.sha256(new TextEncoder().encode(dataString));
    return Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify data integrity
   */
  static verifyHash(originalData: string, hash: string, salt: string): boolean {
    const computedHash = this.hashKYCData(originalData, salt);
    return computedHash === hash;
  }

  /**
   * Generate policy ID
   */
  static generatePolicyId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `POL_${timestamp}_${random}`;
  }

  /**
   * Generate transaction reference
   */
  static generateTransactionRef(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `TXN_${timestamp}_${random}`;
  }
}