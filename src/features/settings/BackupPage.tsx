import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlertTriangle,
  DatabaseBackup,
  FileCheck2,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { getErrorMessage } from "../../lib/utils/error";
import {
  BackupValidationResult,
  DatabaseBackupResult,
  DatabaseBackupSummary,
  RestoreDatabaseBackupResult,
  createDatabaseBackup,
  getCurrentDatabaseBackupSummary,
  restoreDatabaseBackup,
  validateDatabaseBackupJson,
} from "./backupRepository";
import {
  createEncryptedBackupFileName,
  decryptBackupJson,
  encryptBackupJson,
} from "./backupCrypto";

type ActionStatus = "idle" | "running" | "success" | "error";

type RestoreSource = "plain" | "encrypted";

const restoreSourceLabels: Record<RestoreSource, string> = {
  plain: "通常バックアップファイル",
  encrypted: "暗号化バックアップファイル",
};

function downloadJsonFile(json: string, fileName: string): void {
  const blob = new Blob([json], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function BackupPage() {
  const [backupResult, setBackupResult] = useState<DatabaseBackupResult | null>(
    null,
  );
  const [validationResult, setValidationResult] =
    useState<BackupValidationResult | null>(null);
  const [currentSummary, setCurrentSummary] =
    useState<DatabaseBackupSummary | null>(null);
  const [restoreResult, setRestoreResult] =
    useState<RestoreDatabaseBackupResult | null>(null);
  const [restoreSource, setRestoreSource] = useState<RestoreSource | null>(
    null,
  );
  const [exportStatus, setExportStatus] = useState<ActionStatus>("idle");
  const [encryptStatus, setEncryptStatus] = useState<ActionStatus>("idle");
  const [encryptedValidateStatus, setEncryptedValidateStatus] =
    useState<ActionStatus>("idle");
  const [validateStatus, setValidateStatus] = useState<ActionStatus>("idle");
  const [restoreStatus, setRestoreStatus] = useState<ActionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [encryptErrorMessage, setEncryptErrorMessage] = useState("");
  const [encryptedValidateErrorMessage, setEncryptedValidateErrorMessage] =
    useState("");
  const [validateErrorMessage, setValidateErrorMessage] = useState("");
  const [restoreErrorMessage, setRestoreErrorMessage] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [encryptedSelectedFileName, setEncryptedSelectedFileName] =
    useState("");
  const [encryptedFileName, setEncryptedFileName] = useState("");
  const [encryptionPassword, setEncryptionPassword] = useState("");
  const [encryptionPasswordConfirm, setEncryptionPasswordConfirm] =
    useState("");
  const [decryptPassword, setDecryptPassword] = useState("");
  const [hasConfirmedCurrentBackup, setHasConfirmedCurrentBackup] =
    useState(false);

  const canCreateEncryptedBackup = useMemo(() => {
    return (
      encryptionPassword.trim().length >= 8 &&
      encryptionPassword.trim() === encryptionPasswordConfirm.trim() &&
      encryptStatus !== "running"
    );
  }, [encryptStatus, encryptionPassword, encryptionPasswordConfirm]);

  const canSelectEncryptedBackup = useMemo(() => {
    return (
      decryptPassword.trim().length >= 8 &&
      encryptedValidateStatus !== "running"
    );
  }, [decryptPassword, encryptedValidateStatus]);

  const canRestore = useMemo(() => {
    return (
      validateStatus === "success" &&
      Boolean(validationResult) &&
      hasConfirmedCurrentBackup &&
      restoreStatus !== "running"
    );
  }, [
    hasConfirmedCurrentBackup,
    restoreStatus,
    validateStatus,
    validationResult,
  ]);

  function resetRestorePreview() {
    setValidationResult(null);
    setCurrentSummary(null);
    setRestoreResult(null);
    setRestoreSource(null);
    setHasConfirmedCurrentBackup(false);
    setValidateStatus("idle");
    setRestoreStatus("idle");
    setValidateErrorMessage("");
    setRestoreErrorMessage("");
  }

  async function handleCreateBackup() {
    setExportStatus("running");
    setErrorMessage("");

    try {
      const createdBackup = await createDatabaseBackup();

      downloadJsonFile(createdBackup.json, createdBackup.fileName);

      setBackupResult(createdBackup);
      setExportStatus("success");
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(getErrorMessage(error));
      setExportStatus("error");
    }
  }

  async function handleCreateEncryptedBackup() {
    setEncryptStatus("running");
    setEncryptedFileName("");
    setEncryptErrorMessage("");

    try {
      const normalizedPassword = encryptionPassword.trim();
      const normalizedConfirmPassword = encryptionPasswordConfirm.trim();

      if (!normalizedPassword) {
        throw new Error("暗号化パスワードを入力してください。");
      }

      if (normalizedPassword.length < 8) {
        throw new Error("暗号化パスワードは8文字以上で入力してください。");
      }

      if (normalizedPassword !== normalizedConfirmPassword) {
        throw new Error("確認用パスワードが一致していません。");
      }

      const createdBackup = await createDatabaseBackup();
      const encryptedBackup = await encryptBackupJson(
        createdBackup.json,
        normalizedPassword,
      );
      const encryptedJson = JSON.stringify(encryptedBackup, null, 2);
      const fileName = createEncryptedBackupFileName(createdBackup.fileName);

      downloadJsonFile(encryptedJson, fileName);

      setEncryptedFileName(fileName);
      setEncryptStatus("success");
      setEncryptionPassword("");
      setEncryptionPasswordConfirm("");
    } catch (error: unknown) {
      console.error(error);
      setEncryptErrorMessage(getErrorMessage(error));
      setEncryptStatus("error");
    }
  }

  async function validateBackupJsonText(jsonText: string) {
    const validatedBackup = validateDatabaseBackupJson(jsonText);
    const loadedCurrentSummary = await getCurrentDatabaseBackupSummary();

    setValidationResult(validatedBackup);
    setCurrentSummary(loadedCurrentSummary);
    setValidateStatus("success");
  }

  async function handleValidateBackupFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile = event.target.files?.[0];

    resetRestorePreview();
    setEncryptedValidateStatus("idle");
    setEncryptedValidateErrorMessage("");
    setSelectedFileName(selectedFile?.name ?? "");
    setEncryptedSelectedFileName("");

    if (!selectedFile) {
      return;
    }

    setValidateStatus("running");

    try {
      const jsonText = await selectedFile.text();
      await validateBackupJsonText(jsonText);
      setRestoreSource("plain");
    } catch (error: unknown) {
      console.error(error);
      setValidateErrorMessage(getErrorMessage(error));
      setValidateStatus("error");
    } finally {
      event.target.value = "";
    }
  }

  async function handleValidateEncryptedBackupFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile = event.target.files?.[0];

    resetRestorePreview();
    setEncryptedValidateStatus("idle");
    setEncryptedValidateErrorMessage("");
    setSelectedFileName("");
    setEncryptedSelectedFileName(selectedFile?.name ?? "");

    if (!selectedFile) {
      return;
    }

    setEncryptedValidateStatus("running");
    setValidateStatus("running");

    try {
      const encryptedJsonText = await selectedFile.text();
      const decryptedJsonText = await decryptBackupJson(
        encryptedJsonText,
        decryptPassword,
      );

      await validateBackupJsonText(decryptedJsonText);

      setRestoreSource("encrypted");
      setEncryptedValidateStatus("success");
      setDecryptPassword("");
    } catch (error: unknown) {
      console.error(error);
      setEncryptedValidateErrorMessage(getErrorMessage(error));
      setEncryptedValidateStatus("error");
      setValidateStatus("error");
    } finally {
      event.target.value = "";
    }
  }

  async function handleRestoreBackup() {
    if (!validationResult) {
      return;
    }

    setRestoreStatus("running");
    setRestoreErrorMessage("");

    try {
      const restoredBackup = await restoreDatabaseBackup(validationResult.data);
      const loadedCurrentSummary = await getCurrentDatabaseBackupSummary();

      setRestoreResult(restoredBackup);
      setCurrentSummary(loadedCurrentSummary);
      setRestoreStatus("success");
    } catch (error: unknown) {
      console.error(error);
      setRestoreErrorMessage(getErrorMessage(error));
      setRestoreStatus("error");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          設定・バックアップ
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          現在のナレッジ、問い合わせメモ、分類、タグ、関連リンク、月次振り返りをバックアップファイルとして保存・検証・復元します。
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          <p className="font-semibold">バックアップファイルの取り扱い注意</p>
          <p className="mt-2">
            バックアップファイルには、登録済みのナレッジ、問い合わせメモ、月次振り返りの本文が含まれます。
            社外秘情報や個人情報を含めないよう注意してください。
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <DatabaseBackup size={20} className="text-slate-700" />
                <h2 className="text-lg font-bold text-slate-900">
                  通常バックアップ
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                現在のデータをバックアップファイルとして保存します。別のPCへ移すときや、後で復元したいときに使用します。
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleCreateBackup()}
              disabled={exportStatus === "running"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} />
              {exportStatus === "running"
                ? "作成・保存中..."
                : "バックアップを作成して保存"}
            </button>
          </div>

          {exportStatus === "success" && backupResult && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <p className="font-semibold">
                バックアップファイルを作成し、保存しました。
              </p>
              <p className="mt-1 break-all">
                ファイル名: {backupResult.fileName}
              </p>
            </div>
          )}

          {exportStatus === "error" && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">
                バックアップ作成またはファイル保存に失敗しました。
              </p>
              <p className="mt-1 break-all">{errorMessage}</p>
            </div>
          )}

          {backupResult && (
            <BackupCountGrid
              knowledgeItems={backupResult.summary.counts.knowledgeItems}
              inquiryNotes={backupResult.summary.counts.inquiryNotes}
              categories={
                backupResult.summary.counts.knowledgeCategories +
                backupResult.summary.counts.inquiryCategories
              }
              tags={backupResult.summary.counts.tags}
              monthlyReviews={backupResult.summary.counts.monthlyReviews}
            />
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <LockKeyhole size={20} className="text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">
              暗号化バックアップ
            </h2>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            パスワードを設定して、暗号化したバックアップファイルを保存します。
            持ち出しや共有時のリスクを下げたい場合に使用します。
          </p>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            <p className="font-semibold">暗号化バックアップの注意</p>
            <p className="mt-2">
              パスワードを忘れると、暗号化バックアップは復元できません。
              また、この機能はバックアップファイルを暗号化するものであり、端末内のSQLiteデータベース自体を暗号化するものではありません。
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="backup-encryption-password"
                className="text-sm font-semibold text-slate-700"
              >
                暗号化パスワード
              </label>
              <input
                id="backup-encryption-password"
                type="password"
                value={encryptionPassword}
                onChange={(event) => {
                  setEncryptionPassword(event.target.value);
                  setEncryptStatus("idle");
                  setEncryptErrorMessage("");
                }}
                placeholder="8文字以上"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="backup-encryption-password-confirm"
                className="text-sm font-semibold text-slate-700"
              >
                確認用パスワード
              </label>
              <input
                id="backup-encryption-password-confirm"
                type="password"
                value={encryptionPasswordConfirm}
                onChange={(event) => {
                  setEncryptionPasswordConfirm(event.target.value);
                  setEncryptStatus("idle");
                  setEncryptErrorMessage("");
                }}
                placeholder="同じパスワードを入力"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <button
              type="button"
              onClick={() => void handleCreateEncryptedBackup()}
              disabled={!canCreateEncryptedBackup}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LockKeyhole size={16} />
              {encryptStatus === "running"
                ? "暗号化・保存中..."
                : "暗号化して保存"}
            </button>
          </div>

          {encryptStatus === "success" && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <p className="font-semibold">
                暗号化バックアップファイルを作成し、保存しました。
              </p>
              <p className="mt-1 break-all">ファイル名: {encryptedFileName}</p>
            </div>
          )}

          {encryptStatus === "error" && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">
                暗号化バックアップの作成に失敗しました。
              </p>
              <p className="mt-1 break-all">{encryptErrorMessage}</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">
              バックアップの検証・復元
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            保存済みのバックアップファイルを読み込み、このアプリで復元できる形式か確認します。
          </p>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-bold text-slate-900">
                通常バックアップから復元
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                通常のバックアップファイル（.json）を選択します。
              </p>

              <label className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <FileCheck2 size={16} />
                バックアップファイルを選択
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => void handleValidateBackupFile(event)}
                  className="hidden"
                />
              </label>

              {selectedFileName && (
                <p className="mt-4 text-sm text-slate-500">
                  選択ファイル: {selectedFileName}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-bold text-slate-900">
                暗号化バックアップから復元
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                暗号化バックアップファイル（.json）と、作成時に設定したパスワードを使って復元準備を行います。
              </p>

              <div className="mt-4">
                <label
                  htmlFor="backup-decrypt-password"
                  className="text-sm font-semibold text-slate-700"
                >
                  復元用パスワード
                </label>
                <input
                  id="backup-decrypt-password"
                  type="password"
                  value={decryptPassword}
                  onChange={(event) => {
                    setDecryptPassword(event.target.value);
                    setEncryptedValidateStatus("idle");
                    setEncryptedValidateErrorMessage("");
                  }}
                  placeholder="暗号化時のパスワード"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <label
                className={
                  canSelectEncryptedBackup
                    ? "mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    : "mt-4 inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-400 opacity-60"
                }
              >
                <LockKeyhole size={16} />
                暗号化バックアップファイルを選択
                <input
                  type="file"
                  accept="application/json,.json"
                  disabled={!canSelectEncryptedBackup}
                  onChange={(event) =>
                    void handleValidateEncryptedBackupFile(event)
                  }
                  className="hidden"
                />
              </label>

              {encryptedSelectedFileName && (
                <p className="mt-4 text-sm text-slate-500">
                  選択ファイル: {encryptedSelectedFileName}
                </p>
              )}

              {encryptedValidateStatus === "success" && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  暗号化バックアップファイルを確認しました。
                </div>
              )}

              {encryptedValidateStatus === "error" && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-semibold">
                    暗号化バックアップファイルの確認に失敗しました。
                  </p>
                  <p className="mt-1 break-all">
                    {encryptedValidateErrorMessage}
                  </p>
                </div>
              )}
            </section>
          </div>

          {validateStatus === "running" && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              バックアップファイルを確認しています...
            </div>
          )}

          {validateStatus === "success" && validationResult && (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <p className="font-semibold">
                  バックアップファイルを確認しました。
                </p>
                <p className="mt-1">
                  作成日時: {validationResult.summary.exportedAt}
                </p>
              </div>

              {restoreSource && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-semibold">
                    復元元: {restoreSourceLabels[restoreSource]}
                  </p>
                  <p className="mt-1 text-slate-500">
                    選択した{restoreSourceLabels[restoreSource]}を確認済みです。
                  </p>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="font-semibold">注意</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {validationResult.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-bold text-slate-900">
                  復元プレビュー
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  現在のデータ件数と、選択したバックアップファイル内の件数を比較します。
                  復元を実行すると、現在のデータはバックアップファイルの内容で置き換えられます。
                </p>

                {currentSummary ? (
                  <BackupComparisonGrid
                    currentSummary={currentSummary}
                    backupSummary={validationResult.summary}
                  />
                ) : (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    現在のデータ件数を確認できませんでした。
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0 text-red-700"
                  />
                  <div>
                    <p className="font-semibold">復元前の確認</p>
                    <p className="mt-2">
                      復元を実行すると、現在のデータは選択したバックアップファイルの内容で置き換えられます。
                      必ず現在のデータもバックアップしてから実行してください。
                    </p>
                  </div>
                </div>

                <label className="mt-4 flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={hasConfirmedCurrentBackup}
                    onChange={(event) =>
                      setHasConfirmedCurrentBackup(event.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span className="font-semibold">
                    現在のデータをバックアップ済みです
                  </span>
                </label>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleRestoreBackup()}
                    disabled={!canRestore}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RotateCcw size={16} />
                    {restoreStatus === "running"
                      ? "復元中..."
                      : "バックアップから復元する"}
                  </button>
                </div>
              </section>

              {restoreStatus === "success" && restoreResult && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  <p className="font-semibold">
                    バックアップファイルから復元しました。
                  </p>
                  <p className="mt-1">復元日時: {restoreResult.restoredAt}</p>
                </div>
              )}

              {restoreStatus === "error" && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-semibold">復元に失敗しました。</p>
                  <p className="mt-1 break-all">{restoreErrorMessage}</p>
                </div>
              )}
            </div>
          )}

          {validateStatus === "error" &&
            encryptedValidateStatus !== "error" && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-semibold">
                  バックアップファイルの確認に失敗しました。
                </p>
                <p className="mt-1 break-all">{validateErrorMessage}</p>
              </div>
            )}
        </section>
      </div>
    </div>
  );
}

function BackupCountGrid({
  knowledgeItems,
  inquiryNotes,
  categories,
  tags,
  monthlyReviews,
}: {
  knowledgeItems: number;
  inquiryNotes: number;
  categories: number;
  tags: number;
  monthlyReviews: number;
}) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
      <CountCard label="ナレッジ" value={knowledgeItems} />
      <CountCard label="問い合わせメモ" value={inquiryNotes} />
      <CountCard label="分類" value={categories} />
      <CountCard label="タグ" value={tags} />
      <CountCard label="月次振り返り" value={monthlyReviews} />
    </div>
  );
}

function BackupComparisonGrid({
  currentSummary,
  backupSummary,
}: {
  currentSummary: DatabaseBackupSummary;
  backupSummary: DatabaseBackupSummary;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-100 text-left text-xs font-semibold text-slate-500">
          <tr>
            <th className="px-4 py-3">対象</th>
            <th className="px-4 py-3 text-right">現在のデータ</th>
            <th className="px-4 py-3 text-right">バックアップ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          <ComparisonRow
            label="ナレッジ"
            currentValue={currentSummary.counts.knowledgeItems}
            backupValue={backupSummary.counts.knowledgeItems}
          />
          <ComparisonRow
            label="問い合わせメモ"
            currentValue={currentSummary.counts.inquiryNotes}
            backupValue={backupSummary.counts.inquiryNotes}
          />
          <ComparisonRow
            label="分類"
            currentValue={
              currentSummary.counts.knowledgeCategories +
              currentSummary.counts.inquiryCategories
            }
            backupValue={
              backupSummary.counts.knowledgeCategories +
              backupSummary.counts.inquiryCategories
            }
          />
          <ComparisonRow
            label="タグ"
            currentValue={currentSummary.counts.tags}
            backupValue={backupSummary.counts.tags}
          />
          <ComparisonRow
            label="関連リンク"
            currentValue={currentSummary.counts.inquiryKnowledgeLinks}
            backupValue={backupSummary.counts.inquiryKnowledgeLinks}
          />
          <ComparisonRow
            label="月次振り返り"
            currentValue={currentSummary.counts.monthlyReviews}
            backupValue={backupSummary.counts.monthlyReviews}
          />
          <ComparisonRow
            label="アプリ設定"
            currentValue={currentSummary.counts.appSettings}
            backupValue={backupSummary.counts.appSettings}
          />
        </tbody>
      </table>
    </div>
  );
}

function ComparisonRow({
  label,
  currentValue,
  backupValue,
}: {
  label: string;
  currentValue: number;
  backupValue: number;
}) {
  const hasDifference = currentValue !== backupValue;

  return (
    <tr>
      <td className="px-4 py-3 font-semibold text-slate-700">{label}</td>
      <td className="px-4 py-3 text-right text-slate-600">{currentValue}</td>
      <td
        className={
          hasDifference
            ? "px-4 py-3 text-right font-semibold text-amber-700"
            : "px-4 py-3 text-right text-slate-600"
        }
      >
        {backupValue}
      </td>
    </tr>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
