import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { importPrivateKey } from '@/services/crypto';

// Persistence logic using IndexedDB for non-extractable keys
const DB_NAME = 'sf_vault';
const STORE_NAME = 'keys';

const getIDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

interface EncryptionContextType {
  /** The decrypted RSA private key as a CryptoKey object (non-extractable) */
  privateKey: CryptoKey | null;
  /** Whether the vault is currently unlocked */
  isUnlocked: boolean;
  /** Import PEM into memory and store in IndexedDB securely */
  unlockVault: (privateKeyPem: string) => Promise<void>;
  /** Clear everything */
  lockVault: () => void;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

export const useEncryption = () => {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error('useEncryption must be used within an EncryptionVaultProvider');
  }
  return context;
};

export const EncryptionVaultProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);

  // Restore from IDB on mount
  useEffect(() => {
    const restore = async () => {
      try {
        // Migration/Cleanup for old insecure storage
        sessionStorage.removeItem('sf_vault_key');
        
        const token = sessionStorage.getItem('sf_vault_token');
        if (!token) return;

        const db = await getIDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const key = await new Promise<CryptoKey | undefined>((resolve) => {
          const req = tx.objectStore(STORE_NAME).get(token);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        });

        if (key) setPrivateKey(key);
      } catch (e) {
        console.warn('[Vault] Failed to restore key:', e);
      }
    };
    restore();
  }, []);

  const unlockVault = useCallback(async (pem: string) => {
    try {
      // 1. Convert PEM to non-extractable CryptoKey
      const keyObj = await importPrivateKey(pem);

      // 2. Generate random session token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('sf_vault_token', token);

      // 3. Store in IDB
      const db = await getIDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(keyObj, token);

      setPrivateKey(keyObj);
    } catch (e) {
      console.error('[Vault] Unlock failed:', e);
      throw e;
    }
  }, []);

  const lockVault = useCallback(async () => {
    const token = sessionStorage.getItem('sf_vault_token');
    sessionStorage.removeItem('sf_vault_token');

    if (token) {
      try {
        const db = await getIDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(token);
      } catch (e) {
        console.warn('[Vault] Failed to delete from IDB:', e);
      }
    }

    setPrivateKey(null);
  }, []);

  return (
    <EncryptionContext.Provider
      value={{
        privateKey,
        isUnlocked: !!privateKey,
        unlockVault,
        lockVault,
      }}
    >
      {children}
    </EncryptionContext.Provider>
  );
};
