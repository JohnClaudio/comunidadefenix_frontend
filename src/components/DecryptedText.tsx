import React, { useEffect, useState } from 'react';
import { useEncryption } from '@/contexts/EncryptionContext';
import { decryptEnvelope, isEncryptedValue } from '@/services/crypto';

interface DecryptedTextProps {
  /** The raw field value from the API (may be plaintext or ENC:: prefixed) */
  value: string | null | undefined;
  /** Text shown when the vault is locked */
  fallbackText?: string;
  className?: string;
}

/**
 * Renders encrypted field values.
 * - If vault is unlocked → decrypts and shows plaintext
 * - If vault is locked → shows fallback (🔒 icon)
 * - If value is not encrypted → shows value as-is
 */
export const DecryptedText: React.FC<DecryptedTextProps> = ({
  value,
  fallbackText = '🔒',
  className = '',
}) => {
  const { isUnlocked, privateKey } = useEncryption();
  const [displayValue, setDisplayValue] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    // No value
    if (!value) {
      setDisplayValue(null);
      return;
    }

    // Value is NOT encrypted — show as-is
    if (!isEncryptedValue(value)) {
      setDisplayValue(value);
      return;
    }

    // Value IS encrypted but vault is locked
    if (!isUnlocked || !privateKey) {
      setDisplayValue(null);
      return;
    }

    // Value IS encrypted and vault IS unlocked — decrypt
    let cancelled = false;
    setIsDecrypting(true);

    decryptEnvelope(value, privateKey)
      .then((plain) => {
        if (!cancelled) setDisplayValue(plain);
      })
      .catch((err) => {
        console.error('[DecryptedText] Decryption failed:', err);
        if (!cancelled) setDisplayValue('⚠️ Erro');
      })
      .finally(() => {
        if (!cancelled) setIsDecrypting(false);
      });

    return () => { cancelled = true; };
  }, [value, isUnlocked, privateKey]);

  // No value at all
  if (!value) return <span className={className}>—</span>;

  // Not encrypted — show raw
  if (!isEncryptedValue(value)) return <span className={className}>{value}</span>;

  // Encrypted + unlocked + decrypted
  if (isUnlocked && displayValue) {
    return <span className={className}>{displayValue}</span>;
  }

  // Encrypted + unlocked + still decrypting
  if (isUnlocked && isDecrypting) {
    return <span className={`text-muted-foreground animate-pulse ${className}`}>Descriptografando...</span>;
  }

  // Encrypted + locked
  return (
    <span
      className={`text-muted-foreground/50 select-none cursor-help ${className}`}
      title="Acesse Segurança & Criptografia na barra lateral para desbloquear"
    >
      {fallbackText}
    </span>
  );
};
