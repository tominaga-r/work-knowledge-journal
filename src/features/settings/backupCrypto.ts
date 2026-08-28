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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createRandomBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  return bytes;
}

function toArrayBufferBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copiedBytes = new Uint8Array(bytes.length);

  copiedBytes.set(bytes);

  return copiedBytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.slice(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    throw new Error("暗号化バックアップファイルの形式が正しくありません。");
  }
}

async function deriveEncryptionKey(
  password: string,
  salt: Uint8Array,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  const passwordBytes = new TextEncoder().encode(password);
  const normalizedSalt = toArrayBufferBytes(salt);

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
      salt: normalizedSalt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    usages,
  );
}

function normalizePassword(password: string): string {
  const normalizedPassword = password.trim();

  if (!normalizedPassword) {
    throw new Error("暗号化パスワードを入力してください。");
  }

  if (normalizedPassword.length < 8) {
    throw new Error("暗号化パスワードは8文字以上で入力してください。");
  }

  return normalizedPassword;
}

function assertCryptoAvailable(): void {
  if (!crypto.subtle) {
    throw new Error("この環境では暗号化機能を利用できません。");
  }
}

export async function encryptBackupJson(
  backupJson: string,
  password: string,
): Promise<EncryptedBackupData> {
  assertCryptoAvailable();

  const normalizedPassword = normalizePassword(password);
  const salt = createRandomBytes(16);
  const iv = createRandomBytes(12);
  const key = await deriveEncryptionKey(normalizedPassword, salt, ["encrypt"]);
  const plaintextBytes = new TextEncoder().encode(backupJson);
  const normalizedIv = toArrayBufferBytes(iv);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: normalizedIv,
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

export function parseEncryptedBackupJson(
  jsonText: string,
): EncryptedBackupData {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(jsonText);
  } catch {
    throw new Error(
      "暗号化バックアップファイルとして読み込めませんでした。ファイル内容を確認してください。",
    );
  }

  if (!isRecord(parsedValue)) {
    throw new Error("このアプリの暗号化バックアップファイルではありません。");
  }

  if (parsedValue.fileType !== ENCRYPTED_BACKUP_FILE_TYPE) {
    throw new Error("このアプリの暗号化バックアップファイルではありません。");
  }

  if (parsedValue.version !== ENCRYPTED_BACKUP_VERSION) {
    throw new Error(
      "対応していない暗号化バックアップ形式です。このアプリで作成した暗号化バックアップファイルを選択してください。",
    );
  }

  if (parsedValue.appName !== "Work Knowledge Journal") {
    throw new Error("このアプリの暗号化バックアップファイルではありません。");
  }

  if (parsedValue.algorithm !== "AES-GCM") {
    throw new Error("対応していない暗号化方式です。");
  }

  if (parsedValue.kdf !== "PBKDF2") {
    throw new Error("対応していない鍵導出方式です。");
  }

  if (parsedValue.hash !== "SHA-256") {
    throw new Error("対応していないハッシュ方式です。");
  }

  if (parsedValue.iterations !== PBKDF2_ITERATIONS) {
    throw new Error("対応していない暗号化バックアップ設定です。");
  }

  if (typeof parsedValue.encryptedAt !== "string" || !parsedValue.encryptedAt) {
    throw new Error("暗号化バックアップファイルの形式が正しくありません。");
  }

  if (typeof parsedValue.salt !== "string" || !parsedValue.salt) {
    throw new Error("暗号化バックアップファイルの形式が正しくありません。");
  }

  if (typeof parsedValue.iv !== "string" || !parsedValue.iv) {
    throw new Error("暗号化バックアップファイルの形式が正しくありません。");
  }

  if (typeof parsedValue.ciphertext !== "string" || !parsedValue.ciphertext) {
    throw new Error("暗号化バックアップファイルの形式が正しくありません。");
  }

  return parsedValue as EncryptedBackupData;
}

export async function decryptBackupJson(
  encryptedBackupJson: string,
  password: string,
): Promise<string> {
  assertCryptoAvailable();

  const normalizedPassword = normalizePassword(password);
  const encryptedBackup = parseEncryptedBackupJson(encryptedBackupJson);
  const salt = base64ToBytes(encryptedBackup.salt);
  const iv = base64ToBytes(encryptedBackup.iv);
  const ciphertext = base64ToBytes(encryptedBackup.ciphertext);
  const key = await deriveEncryptionKey(normalizedPassword, salt, ["decrypt"]);
  const normalizedIv = toArrayBufferBytes(iv);
  const normalizedCiphertext = toArrayBufferBytes(ciphertext);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: normalizedIv,
      },
      key,
      normalizedCiphertext,
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    throw new Error(
      "暗号化バックアップの復号に失敗しました。パスワードまたはファイル内容を確認してください。",
    );
  }
}

export function createEncryptedBackupFileName(plainBackupFileName: string) {
  if (plainBackupFileName.endsWith(".json")) {
    return plainBackupFileName.replace(/\.json$/, ".encrypted.json");
  }

  return `${plainBackupFileName}.encrypted.json`;
}
