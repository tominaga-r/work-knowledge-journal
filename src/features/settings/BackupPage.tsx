import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlertTriangle,
  Clipboard,
  DatabaseBackup,
  Download,
  FileCheck2,
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

type ActionStatus = "idle" | "running" | "success" | "error";

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
  const [exportStatus, setExportStatus] = useState<ActionStatus>("idle");
  const [copyStatus, setCopyStatus] = useState<ActionStatus>("idle");
  const [downloadStatus, setDownloadStatus] = useState<ActionStatus>("idle");
  const [validateStatus, setValidateStatus] = useState<ActionStatus>("idle");
  const [restoreStatus, setRestoreStatus] = useState<ActionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copyErrorMessage, setCopyErrorMessage] = useState("");
  const [downloadErrorMessage, setDownloadErrorMessage] = useState("");
  const [validateErrorMessage, setValidateErrorMessage] = useState("");
  const [restoreErrorMessage, setRestoreErrorMessage] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [hasConfirmedCurrentBackup, setHasConfirmedCurrentBackup] =
    useState(false);

  const hasBackupJson = useMemo(() => {
    return Boolean(backupResult?.json);
  }, [backupResult]);

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

  async function handleCreateBackup() {
    setExportStatus("running");
    setCopyStatus("idle");
    setDownloadStatus("idle");
    setErrorMessage("");
    setCopyErrorMessage("");
    setDownloadErrorMessage("");

    try {
      const createdBackup = await createDatabaseBackup();

      downloadJsonFile(createdBackup.json, createdBackup.fileName);

      setBackupResult(createdBackup);
      setExportStatus("success");
      setDownloadStatus("success");
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(getErrorMessage(error));
      setExportStatus("error");
    }
  }

  async function handleCopyBackupJson() {
    if (!backupResult) {
      return;
    }

    setCopyStatus("running");
    setCopyErrorMessage("");

    try {
      await navigator.clipboard.writeText(backupResult.json);
      setCopyStatus("success");
    } catch (error: unknown) {
      console.error(error);
      setCopyErrorMessage(getErrorMessage(error));
      setCopyStatus("error");
    }
  }

  function handleDownloadBackupJson() {
    if (!backupResult) {
      return;
    }

    setDownloadStatus("running");
    setDownloadErrorMessage("");

    try {
      downloadJsonFile(backupResult.json, backupResult.fileName);
      setDownloadStatus("success");
    } catch (error: unknown) {
      console.error(error);
      setDownloadErrorMessage(getErrorMessage(error));
      setDownloadStatus("error");
    }
  }

  async function handleValidateBackupFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile = event.target.files?.[0];

    setValidationResult(null);
    setCurrentSummary(null);
    setRestoreResult(null);
    setHasConfirmedCurrentBackup(false);
    setValidateStatus("idle");
    setRestoreStatus("idle");
    setValidateErrorMessage("");
    setRestoreErrorMessage("");
    setSelectedFileName(selectedFile?.name ?? "");

    if (!selectedFile) {
      return;
    }

    setValidateStatus("running");

    try {
      const jsonText = await selectedFile.text();
      const validatedBackup = validateDatabaseBackupJson(jsonText);
      const loadedCurrentSummary = await getCurrentDatabaseBackupSummary();

      setValidationResult(validatedBackup);
      setCurrentSummary(loadedCurrentSummary);
      setValidateStatus("success");
    } catch (error: unknown) {
      console.error(error);
      setValidateErrorMessage(getErrorMessage(error));
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
          現在のナレッジ、問い合わせメモ、分類、タグ、関連リンク、月次振り返りをJSON形式で出力・検証・復元します。
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          <p className="font-semibold">バックアップJSONの取り扱い注意</p>
          <p className="mt-2">
            バックアップJSONには登録済みのナレッジ、問い合わせメモ、月次振り返りの本文が含まれます。
            社外秘情報や個人情報を含めないよう注意してください。
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <DatabaseBackup size={20} className="text-slate-700" />
                <h2 className="text-lg font-bold text-slate-900">
                  JSONバックアップ
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                現在のデータをJSONファイルとして保存します。ボタンを押すと、バックアップJSONを作成してそのままファイル保存します。
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
                バックアップJSONを作成し、ファイル保存しました。
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
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                バックアップJSONの内容
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                作成したJSONの内容を確認できます。必要に応じてコピーや再保存もできます。
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleCopyBackupJson()}
                disabled={!hasBackupJson || copyStatus === "running"}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Clipboard size={16} />
                {copyStatus === "running" ? "コピー中..." : "コピー"}
              </button>

              <button
                type="button"
                onClick={handleDownloadBackupJson}
                disabled={!hasBackupJson || downloadStatus === "running"}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download size={16} />
                {downloadStatus === "running"
                  ? "保存中..."
                  : "ファイルを再保存"}
              </button>
            </div>
          </div>

          {copyStatus === "success" && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              バックアップJSONをクリップボードにコピーしました。
            </div>
          )}

          {copyStatus === "error" && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-semibold">コピーに失敗しました。</p>
              <p className="mt-1 break-all">{copyErrorMessage}</p>
            </div>
          )}

          {downloadStatus === "success" && exportStatus !== "success" && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              バックアップJSONをファイルとして保存しました。
            </div>
          )}

          {downloadStatus === "error" && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-semibold">ファイル保存に失敗しました。</p>
              <p className="mt-1 break-all">{downloadErrorMessage}</p>
            </div>
          )}

          <pre className="mt-5 max-h-130 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-950 p-5 text-sm leading-6 text-slate-100">
            {backupResult?.json || "まだバックアップJSONは作成されていません。"}
          </pre>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-slate-700" />
                <h2 className="text-lg font-bold text-slate-900">
                  バックアップJSONの検証・復元
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                保存済みのJSONファイルを読み込み、このアプリのバックアップとして使える形式か確認します。
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <FileCheck2 size={16} />
              JSONを選択
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => void handleValidateBackupFile(event)}
                className="hidden"
              />
            </label>
          </div>

          {selectedFileName && (
            <p className="mt-4 text-sm text-slate-500">
              選択ファイル: {selectedFileName}
            </p>
          )}

          {validateStatus === "running" && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              バックアップJSONを検証しています...
            </div>
          )}

          {validateStatus === "success" && validationResult && (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <p className="font-semibold">
                  バックアップJSONは有効な形式です。
                </p>
                <p className="mt-1">
                  作成日時: {validationResult.summary.exportedAt}
                </p>
              </div>

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
                  現在のDB件数と、選択したバックアップJSON内の件数を比較します。
                  復元を実行すると、現在のDB内容はバックアップJSONの内容で置き換えられます。
                </p>

                {currentSummary ? (
                  <BackupComparisonGrid
                    currentSummary={currentSummary}
                    backupSummary={validationResult.summary}
                  />
                ) : (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    現在のDB件数を確認できませんでした。
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
                      復元を実行すると、現在のDB内容は選択したバックアップJSONの内容で置き換えられます。
                      必ず現在のDBもバックアップしてから実行してください。
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
                    現在のDBバックアップを作成・保存済みです
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
                    バックアップJSONから復元しました。
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

          {validateStatus === "error" && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">
                バックアップJSONの検証に失敗しました。
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
            <th className="px-4 py-3 text-right">現在のDB</th>
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
