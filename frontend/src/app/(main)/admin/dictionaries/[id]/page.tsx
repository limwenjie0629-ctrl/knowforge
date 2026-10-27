"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Download,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface Term {
  word: string;
  pos: string | null;
  weight: number;
}

interface SynonymGroup {
  primary: string;
  synonyms: string[];
}

interface DictionaryResponse {
  id: string;
  name: string;
  description: string | null;
  terms: Array<Record<string, unknown>>;
  synonyms: Array<Record<string, unknown>>;
  stop_words: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

function normalizeTerms(raw: Array<Record<string, unknown>>): Term[] {
  return raw.map((t) => ({
    word: String(t.word ?? ""),
    pos: t.pos != null ? String(t.pos) : null,
    weight: typeof t.weight === "number" ? t.weight : 1.0,
  }));
}

function normalizeSynonyms(
  raw: Array<Record<string, unknown>>
): SynonymGroup[] {
  return raw.map((g) => ({
    primary: String(g.primary ?? ""),
    synonyms: Array.isArray(g.synonyms)
      ? (g.synonyms as unknown[]).map((s) => String(s))
      : [],
  }));
}

export default function EditDictionaryPage() {
  const params = useParams<{ id: string }>();
  const dictId = params.id;
  const router = useRouter();
  const { addToast } = useToast();

  const [dictionary, setDictionary] = React.useState<DictionaryResponse | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);

  // 鍏冩暟鎹紪杈?  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [savingMeta, setSavingMeta] = React.useState(false);

  // 娣诲姞鏈
  const [newTermWord, setNewTermWord] = React.useState("");
  const [newTermPos, setNewTermPos] = React.useState("");
  const [newTermWeight, setNewTermWeight] = React.useState("1.0");
  const [addingTerm, setAddingTerm] = React.useState(false);

  // 娣诲姞鍚屼箟璇嶇粍
  const [newGroupPrimary, setNewGroupPrimary] = React.useState("");
  const [newGroupSynonyms, setNewGroupSynonyms] = React.useState("");
  const [addingGroup, setAddingGroup] = React.useState(false);

  // 鍋滅敤璇?  const [stopWordsText, setStopWordsText] = React.useState("");
  const [savingStopWords, setSavingStopWords] = React.useState(false);

  // 瀵煎叆瀵硅瘽妗?  const [importOpen, setImportOpen] = React.useState(false);
  const [importFormat, setImportFormat] = React.useState<"json" | "csv">(
    "json"
  );
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);

  const fetchDictionary = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<DictionaryResponse>(
        `/api/admin/dictionaries/${dictId}`
      );
      setDictionary(data);
      setName(data.name);
      setDescription(data.description ?? "");
      setStopWordsText((data.stop_words ?? []).join("\n"));
    } catch (err) {
      if (err instanceof ApiClientError) {
        addToast({
          type: "error",
          message: "鍔犺浇璇嶅吀澶辫触",
          description: err.message,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [dictId, addToast]);

  React.useEffect(() => {
    void fetchDictionary();
  }, [fetchDictionary]);

  const handleSaveMeta = async () => {
    if (!name.trim()) {
      addToast({ type: "error", message: "璇峰～鍐欏悕绉? });
      return;
    }
    setSavingMeta(true);
    try {
      await apiClient.put(`/api/admin/dictionaries/${dictId}`, {
        name: name.trim(),
        description: description || null,
      });
      addToast({ type: "success", message: "宸蹭繚瀛? });
      void fetchDictionary();
    } catch (err) {
      if (err instanceof ApiClientError) {
        addToast({
          type: "error",
          message: "淇濆瓨澶辫触",
          description: err.message,
        });
      }
    } finally {
      setSavingMeta(false);
    }
  };

  const handleAddTerm = async () => {
    const word = newTermWord.trim();
    if (!word) {
      addToast({ type: "error", message: "璇峰～鍐欐湳璇? });
      return;
    }
    setAddingTerm(true);
    try {
      await apiClient.post(`/api/admin/dictionaries/${dictId}/terms`, {
        terms: [
          {
            word,
            pos: newTermPos.trim() || null,
            weight: Number(newTermWeight) || 1.0,
          },
        ],
      });
      addToast({ type: "success", message: "宸叉坊鍔犳湳璇? });
      setNewTermWord("");
      setNewTermPos("");
      setNewTermWeight("1.0");
      void fetchDictionary();
    } catch (err) {
      if (err instanceof ApiClientError) {
        addToast({
          type: "error",
          message: "娣诲姞澶辫触",
          description: err.message,
        });
      }
    } finally {
      setAddingTerm(false);
    }
  };

  const handleRemoveTerm = async (word: string) => {
    try {
      await apiClient.delete(`/api/admin/dictionaries/${dictId}/terms`, {
        body: { words: [word] },
      });
      addToast({ type: "success", message: "宸插垹闄ゆ湳璇? });
      void fetchDictionary();
    } catch (err) {
      if (err instanceof ApiClientError) {
        addToast({
          type: "error",
          message: "鍒犻櫎澶辫触",
          description: err.message,
        });
      }
    }
  };

  const handleAddSynonymGroup = async () => {
    const primary = newGroupPrimary.trim();
    const synonyms = newGroupSynonyms
      .split(/[,锛孿n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!primary || synonyms.length === 0) {
      addToast({ type: "error", message: "璇峰～鍐欎富璇嶅拰鑷冲皯涓€涓悓涔夎瘝" });
      return;
    }
    setAddingGroup(true);
    try {
      await apiClient.post(`/api/admin/dictionaries/${dictId}/synonyms`, {
        primary,
        synonyms,
      });
      addToast({ type: "success", message: "宸叉坊鍔犲悓涔夎瘝缁? });
      setNewGroupPrimary("");
      setNewGroupSynonyms("");
      void fetchDictionary();
    } catch (err) {
      if (err instanceof ApiClientError) {
        addToast({
          type: "error",
          message: "娣诲姞澶辫触",
          description: err.message,
        });
      }
    } finally {
      setAddingGroup(false);
    }
  };

  const handleRemoveSynonymGroup = async (primary: string) => {
    try {
      await apiClient.delete(`/api/admin/dictionaries/${dictId}/synonyms`, {
        body: { primary },
      });
      addToast({ type: "success", message: "宸插垹闄ゅ悓涔夎瘝缁? });
      void fetchDictionary();
    } catch (err) {
      if (err instanceof ApiClientError) {
        addToast({
          type: "error",
          message: "鍒犻櫎澶辫触",
          description: err.message,
        });
      }
    }
  };

  const handleSaveStopWords = async () => {
    const stopWords = stopWordsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    setSavingStopWords(true);
    try {
      await apiClient.put(`/api/admin/dictionaries/${dictId}`, {
        stop_words: stopWords,
      });
      addToast({ type: "success", message: "宸蹭繚瀛樺仠鐢ㄨ瘝" });
      void fetchDictionary();
    } catch (err) {
      if (err instanceof ApiClientError) {
        addToast({
          type: "error",
          message: "淇濆瓨澶辫触",
          description: err.message,
        });
      }
    } finally {
      setSavingStopWords(false);
    }
  };

  const handleExport = async (format: "json" | "csv") => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const token = apiClient.getAccessToken();
      const response = await fetch(
        `${baseUrl}/api/admin/dictionaries/${dictId}/export/${format}`,
        {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      if (!response.ok) {
        throw new Error(`瀵煎嚭澶辫触: ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dictionary?.name ?? "dictionary"}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: "success", message: "瀵煎嚭鎴愬姛" });
    } catch (err) {
      addToast({
        type: "error",
        message: "瀵煎嚭澶辫触",
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      if (importFormat === "json") {
        const text = await importFile.text();
        const json = JSON.parse(text);
        await apiClient.post(
          `/api/admin/dictionaries/${dictId}/import/json`,
          json
        );
      } else {
        const formData = new FormData();
        formData.append("file", importFile);
        const baseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
        const token = apiClient.getAccessToken();
        const response = await fetch(
          `${baseUrl}/api/admin/dictionaries/${dictId}/import/csv`,
          {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
          }
        );
        if (!response.ok) {
          throw new Error(`瀵煎叆澶辫触: ${response.statusText}`);
        }
      }
      addToast({ type: "success", message: "瀵煎叆鎴愬姛" });
      setImportOpen(false);
      setImportFile(null);
      void fetchDictionary();
    } catch (err) {
      addToast({
        type: "error",
        message: "瀵煎叆澶辫触",
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">鍔犺浇涓?..</div>
    );
  }

  if (!dictionary) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        璇嶅吀涓嶅瓨鍦?        <div className="mt-4">
          <Button onClick={() => router.push("/admin/dictionaries")}>
            杩斿洖鍒楄〃
          </Button>
        </div>
      </div>
    );
  }

  const terms = normalizeTerms(dictionary.terms);
  const synonyms = normalizeSynonyms(dictionary.synonyms);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-2">
        <Link href="/admin/dictionaries">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            杩斿洖鍒楄〃
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/admin/dictionaries/${dictId}/candidates`}>
            <Button variant="outline" size="sm">
              <Sparkles className="mr-1 h-4 w-4" />
              鍊欓€夋湳璇?            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="mr-1 h-4 w-4" />
            瀵煎叆
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
          >
            <Download className="mr-1 h-4 w-4" />
            瀵煎嚭 JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
          >
            <Download className="mr-1 h-4 w-4" />
            瀵煎嚭 CSV
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{dictionary.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {terms.length} 涓湳璇?路 {synonyms.length} 涓悓涔夎瘝缁?路{" "}
          {dictionary.stop_words?.length ?? 0} 涓仠鐢ㄨ瘝
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">鍩烘湰淇℃伅</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dict-name">鍚嶇О</Label>
            <Input
              id="dict-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dict-description">鎻忚堪</Label>
            <Textarea
              id="dict-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveMeta} disabled={savingMeta}>
              {savingMeta ? "淇濆瓨涓?.." : "淇濆瓨"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 鏈 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">鏈 ({terms.length})</CardTitle>
          <CardDescription>棰嗗煙鏈,鍚敤鍚庝細鍚屾鍒?IK 鍒嗚瘝鍣?/CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5 space-y-1">
              <Label className="text-xs">鏈</Label>
              <Input
                value={newTermWord}
                onChange={(e) => setNewTermWord(e.target.value)}
                placeholder="渚嬪:鑱氫箼鐑?
                maxLength={30}
              />
            </div>
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">璇嶆€?/Label>
              <Input
                value={newTermPos}
                onChange={(e) => setNewTermPos(e.target.value)}
                placeholder="鍙€?濡?n"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">鏉冮噸</Label>
              <Input
                type="number"
                step={0.1}
                value={newTermWeight}
                onChange={(e) => setNewTermWeight(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Button
                onClick={handleAddTerm}
                disabled={addingTerm}
                className="w-full"
              >
                <Plus className="mr-1 h-4 w-4" />
                娣诲姞
              </Button>
            </div>
          </div>

          {terms.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              鏆傛棤鏈
            </div>
          ) : (
            <div className="border rounded-md max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">鏈</th>
                    <th className="text-left px-3 py-2 font-medium">璇嶆€?/th>
                    <th className="text-left px-3 py-2 font-medium">鏉冮噸</th>
                    <th className="text-right px-3 py-2 font-medium">鎿嶄綔</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {terms.map((t, idx) => (
                    <tr key={`${t.word}-${idx}`} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{t.word}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {t.pos ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {t.weight}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTerm(t.word)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 鍚屼箟璇嶇粍 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            鍚屼箟璇嶇粍 ({synonyms.length})
          </CardTitle>
          <CardDescription>
            涓昏瘝涓庡悓涔夎瘝鐨勬槧灏勫叧绯?鎼滅储鏃朵富璇嶅懡涓椂浼氭墿灞曟煡璇?          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3 space-y-1">
              <Label className="text-xs">涓昏瘝</Label>
              <Input
                value={newGroupPrimary}
                onChange={(e) => setNewGroupPrimary(e.target.value)}
                maxLength={30}
                placeholder="渚嬪:鑱氫箼鐑?
              />
            </div>
            <div className="col-span-7 space-y-1">
              <Label className="text-xs">鍚屼箟璇?鐢ㄩ€楀彿鎴栨崲琛屽垎闅?</Label>
              <Input
                value={newGroupSynonyms}
                onChange={(e) => setNewGroupSynonyms(e.target.value)}
                placeholder="PE,鑱氫箼鐑鏂?
              />
            </div>
            <div className="col-span-2">
              <Button
                onClick={handleAddSynonymGroup}
                disabled={addingGroup}
                className="w-full"
              >
                <Plus className="mr-1 h-4 w-4" />
                娣诲姞
              </Button>
            </div>
          </div>

          {synonyms.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              鏆傛棤鍚屼箟璇嶇粍
            </div>
          ) : (
            <div className="space-y-2">
              {synonyms.map((g) => (
                <div
                  key={g.primary}
                  className="flex items-center justify-between gap-2 border rounded-md px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium">{g.primary}</span>
                    <span className="text-muted-foreground">鈫?/span>
                    <span className="text-muted-foreground truncate">
                      {g.synonyms.join(", ")}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSynonymGroup(g.primary)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 鍋滅敤璇?*/}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">鍋滅敤璇?/CardTitle>
          <CardDescription>姣忚涓€涓?绱㈠紩鏃朵細琚繃婊?/CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={6}
            value={stopWordsText}
            onChange={(e) => setStopWordsText(e.target.value)}
            placeholder="鐨?#10;浜?#10;鍦?
          />
          <div className="flex justify-end">
            <Button onClick={handleSaveStopWords} disabled={savingStopWords}>
              {savingStopWords ? "淇濆瓨涓?.." : "淇濆瓨鍋滅敤璇?}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>瀵煎叆璇嶅吀</DialogTitle>
            <DialogDescription>
              涓婁紶 JSON 鎴?CSV 鏂囦欢,鍐呭灏嗕笌鐜版湁璇嶆潯鍚堝苟
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>鏂囦欢鏍煎紡</Label>
              <div className="flex items-center gap-4 text-sm">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={importFormat === "json"}
                    onChange={() => setImportFormat("json")}
                  />
                  JSON
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={importFormat === "csv"}
                    onChange={() => setImportFormat("csv")}
                  />
                  CSV (word,pos,weight)
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>閫夋嫨鏂囦欢</Label>
              <input
                type="file"
                accept={importFormat === "json" ? ".json" : ".csv"}
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {importFile && (
                <p className="text-xs text-muted-foreground">
                  宸查€夋嫨: {importFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportOpen(false);
                setImportFile(null);
              }}
            >
              鍙栨秷
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || importing}
            >
              {importing ? "瀵煎叆涓?.." : "瀵煎叆"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
