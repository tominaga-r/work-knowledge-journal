import { beforeAll, describe, expect, it } from "vitest";
import {
  createEncryptedBackupFileName,
  decryptBackupJson,
  encryptBackupJson,
  parseEncryptedBackupJson,
  type EncryptedBackupData,
} from "./backupCrypto";

const password = "test-password";
const backupJson = JSON.stringify({
  schemaVersion: 1,
  appName: "Work Knowledge Journal",
  test: "backup-data",
});

let encryptedBackup: EncryptedBackupData;

beforeAll(async () => {
  encryptedBackup = await encryptBackupJson(backupJson, password);
});

describe("encryptBackupJson / decryptBackupJson", () => {
  it("バックアップを暗号化し、同じパスワードで元のJSONへ復号できる", async () => {
    expect(encryptedBackup.fileType).toBe(
      "WorkKnowledgeJournalEncryptedBackup",
    );
    expect(encryptedBackup.version).toBe(1);
    expect(encryptedBackup.appName).toBe("Work Knowledge Journal");
    expect(encryptedBackup.algorithm).toBe("AES-GCM");
    expect(encryptedBackup.kdf).toBe("PBKDF2");
    expect(encryptedBackup.hash).toBe("SHA-256");
    expect(encryptedBackup.iterations).toBe(210000);
    expect(encryptedBackup.salt).not.toBe("");
    expect(encryptedBackup.iv).not.toBe("");
    expect(encryptedBackup.ciphertext).not.toBe("");

    const decrypted = await decryptBackupJson(
      JSON.stringify(encryptedBackup),
      password,
    );

    expect(decrypted).toBe(backupJson);
  });

  it("8文字未満のパスワードを拒否する", async () => {
    await expect(encryptBackupJson(backupJson, "1234567")).rejects.toThrow(
      "暗号化パスワードは8文字以上で入力してください。",
    );
  });

  it("空のパスワードを拒否する", async () => {
    await expect(encryptBackupJson(backupJson, "   ")).rejects.toThrow(
      "暗号化パスワードを入力してください。",
    );
  });

  it("誤ったパスワードでは復号できない", async () => {
    await expect(
      decryptBackupJson(JSON.stringify(encryptedBackup), "wrong-password"),
    ).rejects.toThrow(
      "暗号化バックアップの復元準備に失敗しました。パスワードまたはファイル内容を確認してください。",
    );
  });

  it("暗号文が改ざんされている場合は復号できない", async () => {
    const tamperedBackup = {
      ...encryptedBackup,
      ciphertext: `${encryptedBackup.ciphertext.slice(0, -4)}AAAA`,
    };

    await expect(
      decryptBackupJson(JSON.stringify(tamperedBackup), password),
    ).rejects.toThrow(
      "暗号化バックアップの復元準備に失敗しました。パスワードまたはファイル内容を確認してください。",
    );
  });
});

describe("parseEncryptedBackupJson", () => {
  it("正しい暗号化バックアップJSONを読み込める", () => {
    const parsed = parseEncryptedBackupJson(JSON.stringify(encryptedBackup));

    expect(parsed).toEqual(encryptedBackup);
  });

  it("壊れたJSONを拒否する", () => {
    expect(() => parseEncryptedBackupJson("{")).toThrow(
      "暗号化バックアップファイルとして読み込めませんでした。ファイル内容を確認してください。",
    );
  });

  it("別のファイル種別を拒否する", () => {
    const invalidBackup = {
      ...encryptedBackup,
      fileType: "OtherBackup",
    };

    expect(() =>
      parseEncryptedBackupJson(JSON.stringify(invalidBackup)),
    ).toThrow("このアプリの暗号化バックアップファイルではありません。");
  });

  it("対応していないバージョンを拒否する", () => {
    const invalidBackup = {
      ...encryptedBackup,
      version: 2,
    };

    expect(() =>
      parseEncryptedBackupJson(JSON.stringify(invalidBackup)),
    ).toThrow(
      "対応していない暗号化バックアップ形式です。このアプリで作成した暗号化バックアップファイルを選択してください。",
    );
  });

  it("必須データが欠けたファイルを拒否する", () => {
    const invalidBackup = {
      ...encryptedBackup,
      ciphertext: "",
    };

    expect(() =>
      parseEncryptedBackupJson(JSON.stringify(invalidBackup)),
    ).toThrow(
      "暗号化バックアップファイルの形式が正しくありません。このアプリで作成した暗号化バックアップファイルを選択してください。",
    );
  });
});

describe("createEncryptedBackupFileName", () => {
  it("jsonファイル名をencrypted.jsonへ変換する", () => {
    expect(
      createEncryptedBackupFileName(
        "20260916-work-knowledge-journal-backup.json",
      ),
    ).toBe("20260916-work-knowledge-journal-backup.encrypted.json");
  });

  it("json拡張子がない場合もencrypted.jsonを付ける", () => {
    expect(createEncryptedBackupFileName("backup")).toBe(
      "backup.encrypted.json",
    );
  });
});
