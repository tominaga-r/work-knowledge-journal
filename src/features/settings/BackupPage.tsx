import { ChangeEvent, useMemo, useState } from "react";
import {
  Clipboard,
  DatabaseBackup,
  Download,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { getErrorMessage } from "../../lib/utils/error";
import {
  BackupValidationResult,
  DatabaseBackupResult,
  createDatabaseBackup,
  validateDatabaseBackupJson,
} from "./backupRepository";

type ActionStatus = "idle" | "running" | "success" | "error";

export function BackupPage() {
  const [backupResult, setBackupResult] = useState<DatabaseBackupResult | null>(
    null,
  );
  const [validationResult, setValidationResult] =
    useState<BackupValidationResult | null>(null);
  const [exportStatus, setExportStatus] = useState<ActionStatus>("idle");
  const [copyStatus, setCopyStatus] = useState<ActionStatus>("idle");
  const [downloadStatus, setDownloadStatus] = useState<ActionStatus>("idle");
  const [validateStatus, setValidateStatus] = useState<ActionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copyErrorMessage, setCopyErrorMessage] = useState("");
  const [downloadErrorMessage, setDownloadErrorMessage] = useState("");
  const [validateErrorMessage, setValidateErrorMessage] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  const hasBackupJson = useMemo(() => {
    return Boolean(backupResult?.json);
  }, [backupResult]);

  async function handleCreateBackup() {
    setExportStatus("running");
    setCopyStatus("idle");
    setDownloadStatus("idle");
    setErrorMessage("");
    setCopyErrorMessage("");
    setDownloadErrorMessage("");

    try {
      const createdBackup = await createDatabaseBackup();

      setBackupResult(createdBackup);
      setExportStatus("success");
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
      const blob = new Blob([backupResult.json], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = backupResult.fileName;
      anchor.click();

      URL.revokeObjectURL(url);
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
    setValidateStatus("idle");
    setValidateErrorMessage("");
    setSelectedFileName(selectedFile?.name ?? "");

    if (!selectedFile) {
      return;
    }

    setValidateStatus("running");

    try {
      const jsonText = await selectedFile.text();
      const result = validateDatabaseBackupJson(jsonText);

      setValidationResult(result);
      setValidateStatus("success");
    } catch (error: unknown) {
      console.error(error);
      setValidateErrorMessage(getErrorMessage(error));
      setValidateStatus("error");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          設定・バックアップ
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          現在のナレッジ、問い合わせメモ、分類、タグ、関連リンク、月次振り返りをJSON形式で出力・検証します。
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
                現在のデータを外部ファイルとして保管できるようにします。
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleCreateBackup()}
              disabled={exportStatus === "running"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} />
              {exportStatus === "running" ? "作成中..." : "バックアップを作成"}
            </button>
          </div>

          {exportStatus === "success" && backupResult && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <p className="font-semibold">バックアップJSONを作成しました。</p>
              <p className="mt-1 break-all">
                ファイル名: {backupResult.fileName}
              </p>
            </div>
          )}

          {exportStatus === "error" && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">バックアップ作成に失敗しました。</p>
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
                バックアップJSON
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                作成したJSONはコピーまたはファイル保存できます。
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
                {downloadStatus === "running" ? "保存中..." : "ファイル保存"}
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

          {downloadStatus === "success" && (
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
                  バックアップJSONの検証
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                保存済みのJSONファイルを読み込み、このアプリのバックアップとして使える形式か確認します。
                この操作ではデータベースは変更されません。
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

              <BackupCountGrid
                knowledgeItems={validationResult.summary.counts.knowledgeItems}
                inquiryNotes={validationResult.summary.counts.inquiryNotes}
                categories={
                  validationResult.summary.counts.knowledgeCategories +
                  validationResult.summary.counts.inquiryCategories
                }
                tags={validationResult.summary.counts.tags}
                monthlyReviews={validationResult.summary.counts.monthlyReviews}
              />
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

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
