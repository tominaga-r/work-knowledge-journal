import { nowIsoString } from "../../lib/utils/date";

const ENCRYPTED_BACKUP_FILE_TYPE = "WorkKnowledgeJournalEncryptedBackup";
const ENCRYPTED_BACKUP_VERSION = 1;
const PBKDF2_ITERATIONS = 210000;

export type EncryptedBackupData = {
  fileType: typeof ENCRYPTED_BACKUP_FILE_TYPE;
  version: typeof ENCRYPTED_BACKUP_VERSION;
  appName: "Work Knowledge Journal";
  encryptedAt: string;
  algorithm: "AES-GCM";
  kdf: "PBKDF2";
  hash: "SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.slice(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function deriveEncryptionKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const passwordBytes = new TextEncoder().encode(password);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt"],
  );
}

export async function encryptBackupJson(
  backupJson: string,
  password: string,
): Promise<EncryptedBackupData> {
  const normalizedPassword = password.trim();

  if (!normalizedPassword) {
    throw new Error("暗号化パスワードを入力してください。");
  }

  if (normalizedPassword.length < 8) {
    throw new Error("暗号化パスワードは8文字以上で入力してください。");
  }

  if (!crypto.subtle) {
    throw new Error("この環境では暗号化機能を利用できません。");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(normalizedPassword, salt);
  const plaintextBytes = new TextEncoder().encode(backupJson);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    plaintextBytes,
  );

  return {
    fileType: ENCRYPTED_BACKUP_FILE_TYPE,
    version: ENCRYPTED_BACKUP_VERSION,
    appName: "Work Knowledge Journal",
    encryptedAt: nowIsoString(),
    algorithm: "AES-GCM",
    kdf: "PBKDF2",
    hash: "SHA-256",
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
  };
}

export function createEncryptedBackupFileName(plainBackupFileName: string) {
  if (plainBackupFileName.endsWith(".json")) {
    return plainBackupFileName.replace(/\.json$/, ".encrypted.json");
  }

  return `${plainBackupFileName}.encrypted.json`;
}
