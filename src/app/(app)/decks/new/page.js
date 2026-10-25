"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  DECK_CATEGORIES,
  DECK_TEMPLATES,
  SETUP_TABLES,
  getTemplateInfo,
  getSetupTableInfo,
  normalizeTags,
  parseTagsFromInput,
  formatTagsForInput,
} from "@/lib/decksEngine";
import { renderMarkdown } from "@/lib/markdown";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

function DeckEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const preloadLinkTable = searchParams?.get("link_table") || null;
  const preloadLinkId = searchParams?.get("link_id") || null;
  const preloadLinkLabel = searchParams?.get("link_label") || null;

  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "general",
    tagsInput: "",
    templateUsed: null,
    linkedSetupTable: preloadLinkTable || null,
    linkedSetupId: preloadLinkId || null,
    linkedSetupLabel: preloadLinkLabel || null,
    status: "published",
  });

  const [userId, setUserId] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [existingId, setExistingId] = useState(null);
  const [showTemplates, setShowTemplates] = useState(!isEdit);
  const [previewMode, setPreviewMode] = useState("split");
  const [showLinkPicker, setShowLinkPicker] = useState(false);

  const [linkTable, setLinkTable] = useState(preloadLinkTable || "sld_setups");
  const [linkOptions, setLinkOptions] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const textareaRef = useRef(null);

  // ============================================================
  // LOAD EXISTING DECK (with screenshots)
  // ============================================================
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      if (!isEdit) return;

      setLoading(true);
      const { data, error: loadErr } = await supabase
        .from("decks")
        .select("*")
        .eq("id", editId)
        .maybeSingle();

      if (loadErr || !data) {
        setError(loadErr?.message || "Deck not found.");
        setLoading(false);
        return;
      }

      setForm({
        title: data.title || "",
        content: data.content || "",
        category: data.category || "general",
        tagsInput: formatTagsForInput(data.tags || []),
        templateUsed: data.template_used,
        linkedSetupTable: data.linked_setup_table,
        linkedSetupId: data.linked_setup_id,
        linkedSetupLabel: data.linked_setup_label,
        status: data.status || "published",
      });

      // Load screenshots
      const { data: shots } = await supabase
        .from("deck_screenshots")
        .select("*")
        .eq("deck_id", data.id)
        .order("display_order", { ascending: true });
      setScreenshots(shots || []);

      setExistingId(data.id);
      setShowTemplates(false);
      setLoading(false);
    }
    load();
  }, [editId, isEdit, supabase]);

  // ============================================================
  // LOAD SETUP OPTIONS FOR LINKING
  // ============================================================
  useEffect(() => {
    async function loadLinks() {
      if (!showLinkPicker) return;
      setLoadingLinks(true);
      const { data, error: linkErr } = await supabase
        .from(linkTable)
        .select("id, pair, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!linkErr && data) setLinkOptions(data);
      setLoadingLinks(false);
    }
    loadLinks();
  }, [linkTable, showLinkPicker, supabase]);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function applyTemplate(templateKey) {
    const template = getTemplateInfo(templateKey);
    if (!template) return;

    setForm(f => ({
      ...f,
      content: template.content,
      templateUsed: templateKey,
      title: templateKey === "backtest" ? "Backtest — " :
             templateKey === "doctrine" ? "Doctrine Insight — " :
             templateKey === "comparison" ? "Comparison — A vs B" :
             templateKey === "review" ? "Trade Review — " :
             templateKey === "quote" ? "Quote — " : "",
    }));

    setShowTemplates(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(0, 0);
      }
    }, 50);
  }

  function applyFormatting(format) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.content.slice(start, end);
    let wrapped = selected;
    let cursorOffset = 0;

    switch (format) {
      case "bold": wrapped = `**${selected || "bold text"}**`; cursorOffset = 2; break;
      case "italic": wrapped = `*${selected || "italic text"}*`; cursorOffset = 1; break;
      case "code": wrapped = `\`${selected || "code"}\``; cursorOffset = 1; break;
      case "h1": wrapped = `# ${selected || "Heading 1"}`; cursorOffset = 2; break;
      case "h2": wrapped = `## ${selected || "Heading 2"}`; cursorOffset = 3; break;
      case "h3": wrapped = `### ${selected || "Heading 3"}`; cursorOffset = 4; break;
      case "list":
        wrapped = selected ? selected.split("\n").map(l => `- ${l}`).join("\n") : "- Item 1\n- Item 2";
        cursorOffset = 2;
        break;
      case "checkbox": wrapped = `- [ ] Task`; cursorOffset = 6; break;
      case "quote": wrapped = `> ${selected || "Quote"}`; cursorOffset = 2; break;
      case "link": wrapped = `[${selected || "link text"}](https://)`; cursorOffset = 0; break;
      case "hr": wrapped = `\n---\n`; cursorOffset = 5; break;
      default: return;
    }

    const before = form.content.slice(0, start);
    const after = form.content.slice(end);
    update("content", before + wrapped + after);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + (selected ? wrapped.length : wrapped.length - cursorOffset);
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey)) {
      if (e.key === "b") { e.preventDefault(); applyFormatting("bold"); }
      else if (e.key === "i") { e.preventDefault(); applyFormatting("italic"); }
      else if (e.key === "k") { e.preventDefault(); applyFormatting("code"); }
    }
  }

  const tags = useMemo(() => parseTagsFromInput(form.tagsInput), [form.tagsInput]);
  const previewHtml = useMemo(() => renderMarkdown(form.content), [form.content]);

  // ============================================================
  // SAVE
  // ============================================================
  async function saveDeck({ status }) {
    if (!form.title.trim()) {
      setError("Title is required.");
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      content: form.content,
      content_format: "markdown",
      category: form.category,
      tags: normalizeTags(tags),
      template_used: form.templateUsed,
      linked_setup_table: form.linkedSetupTable,
      linked_setup_id: form.linkedSetupId,
      linked_setup_label: form.linkedSetupLabel,
      status: status || form.status,
    };

    let deckRow;
    if (isEdit && existingId) {
      const { data: existingDeck } = await supabase
        .from("decks")
        .select("title, content, tags")
        .eq("id", existingId)
        .maybeSingle();

      if (existingDeck) {
        await supabase.from("deck_versions").insert({
          deck_id: existingId,
          user_id: user.id,
          title: existingDeck.title,
          content: existingDeck.content,
          tags: existingDeck.tags,
        });
      }

      const { data, error: updErr } = await supabase
        .from("decks")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existingId)
        .select()
        .single();
      if (updErr) { setError(updErr.message); return null; }
      deckRow = data;
    } else {
      const { data, error: insErr } = await supabase
        .from("decks")
        .insert(payload)
        .select()
        .single();
      if (insErr) { setError(insErr.message); return null; }
      deckRow = data;
      setExistingId(data.id);
    }

    return deckRow;
  }

  async function handleSavePublished() {
    setSaving(true); setError("");
    const row = await saveDeck({ status: "published" });
    setSaving(false);
    if (!row) return;
    setSaved(true);
    setTimeout(() => router.push(`/decks/${row.id}`), 800);
  }

  async function handleSaveDraft() {
    setSavingDraft(true); setError("");
    const row = await saveDeck({ status: "draft" });
    setSavingDraft(false);
    if (!row) return;
    setSaved(true);
    setTimeout(() => router.push(`/decks/${row.id}`), 800);
  }

  // ============================================================
  // ENSURE DECK EXISTS (for screenshot upload)
  // ============================================================
  async function ensureDeckSaved() {
    if (existingId) return existingId;
    const row = await saveDeck({ status: "draft" });
    if (!row) throw new Error("Failed to save deck before uploading screenshot.");
    return row.id;
  }

  // ============================================================
  // LINK SETUP PICKER
  // ============================================================
  function pickLinkedSetup(setup) {
    update("linkedSetupTable", linkTable);
    update("linkedSetupId", setup.id);
    update("linkedSetupLabel", setup.pair || "Setup");
    setShowLinkPicker(false);
  }

  function clearLinkedSetup() {
    update("linkedSetupTable", null);
    update("linkedSetupId", null);
    update("linkedSetupLabel", null);
  }

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return <div className="p-6 text-gray-400">Loading deck...</div>;
  }

  const categoryInfo = DECK_CATEGORIES.find(c => c.key === form.category) || DECK_CATEGORIES[0];
  const linkedTableInfo = getSetupTableInfo(form.linkedSetupTable);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? "Edit Deck" : "New Deck"}</h1>
            <p className="text-gray-400 text-sm">Capture research with Markdown, screenshots, and links.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => router.push("/decks")}
              className="text-xs px-3 py-2 rounded-lg bg-gray-800 text-gray-300 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Template picker */}
        {showTemplates && !isEdit && (
          <div className="p-4 rounded-lg bg-indigo-950/30 border-2 border-indigo-800/60 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-indigo-200">Pick a template</h2>
                <p className="text-xs text-indigo-300/70 mt-0.5">Or start blank.</p>
              </div>
              <button type="button" onClick={() => setShowTemplates(false)} className="text-xs text-gray-400 hover:text-white">
                Skip → Blank
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {DECK_TEMPLATES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => applyTemplate(t.key)}
                  className="text-left p-3 rounded-lg border border-gray-700 bg-black hover:border-indigo-600 transition"
                >
                  <p className="text-sm font-bold text-white">{t.emoji} {t.label}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{t.hint}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Meta fields */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div>
            <label className="block text-xs mb-1 text-gray-400">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Give this deck a clear title..."
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-base font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Category</label>
              <select value={form.category} onChange={(e) => update("category", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {DECK_CATEGORIES.map(c => (
                  <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Tags <span className="text-gray-600">(space or comma separated)</span>
              </label>
              <input
                type="text"
                value={form.tagsInput}
                onChange={(e) => update("tagsInput", e.target.value)}
                placeholder="#fvg #judas-swing #backtested"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm font-mono"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.map(t => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 border border-purple-800 text-purple-200 font-mono">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Setup linking */}
          <div>
            <label className="block text-xs mb-1 text-gray-400">Linked Setup (optional)</label>
            {form.linkedSetupId && linkedTableInfo ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/30 border border-amber-800">
                <span className="text-xs text-amber-200 flex-1">
                  🔗 {linkedTableInfo.emoji} {linkedTableInfo.label} · {form.linkedSetupLabel}
                </span>
                <button type="button" onClick={clearLinkedSetup} className="text-xs text-red-400 hover:text-red-300">
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLinkPicker(true)}
                className="w-full text-left px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm text-gray-400 hover:border-gray-600"
              >
                + Link to a trading setup
              </button>
            )}
          </div>
        </div>

        {/* Link picker modal */}
        {showLinkPicker && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowLinkPicker(false)}>
            <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                <p className="text-sm font-bold">Link a Setup</p>
                <button type="button" onClick={() => setShowLinkPicker(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
              </div>
              <div className="p-3 border-b border-gray-800">
                <select value={linkTable} onChange={(e) => setLinkTable(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                  {SETUP_TABLES.map(t => (
                    <option key={t.key} value={t.key}>{t.emoji} {t.label} System</option>
                  ))}
                </select>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {loadingLinks && <p className="text-center text-xs text-gray-500 py-4">Loading...</p>}
                {!loadingLinks && linkOptions.length === 0 && (
                  <p className="text-center text-xs text-gray-500 py-4">No setups in this system yet.</p>
                )}
                {!loadingLinks && linkOptions.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pickLinkedSetup(opt)}
                    className="w-full text-left p-2 rounded border border-gray-800 hover:border-amber-700 mb-1 text-xs"
                  >
                    <span className="font-bold text-white">{opt.pair || "Untitled"}</span>
                    <span className="text-gray-500 ml-2">· {new Date(opt.created_at).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Editor + Preview */}
        <div className="rounded-lg bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-2 p-2 border-b border-gray-800 bg-black/40">
            <div className="flex items-center gap-1 flex-wrap">
              <button type="button" onClick={() => applyFormatting("bold")} className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 font-bold" title="Bold (Ctrl+B)">B</button>
              <button type="button" onClick={() => applyFormatting("italic")} className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 italic" title="Italic (Ctrl+I)">I</button>
              <button type="button" onClick={() => applyFormatting("code")} className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 font-mono" title="Code (Ctrl+K)">`c`</button>
              <span className="text-gray-700">|</span>
              <button type="button" onClick={() => applyFormatting("h1")} className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 font-bold">H1</button>
              <button type="button" onClick={() => applyFormatting("h2")} className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 font-bold">H2</button>
              <button type="button" onClick={() => applyFormatting("h3")} className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 font-bold">H3</button>
              <span className="text-gray-700">|</span>
              <button type="button" onClick={() => applyFormatting("list")} className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700">•</button>
              <button type="button" onClick={() => applyFormatting("checkbox")} className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700">☐</button>
              <button type="button" onClick={() => applyFormatting("quote")} className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700">&ldquo;</button>
              <button type="button" onClick={() => applyFormatting("link")} className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700">🔗</button>
              <button type="button" onClick={() => applyFormatting("hr")} className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700">—</button>
            </div>
            <div className="flex items-center gap-1">
              {[
                { key: "edit", label: "Edit" },
                { key: "split", label: "Split" },
                { key: "preview", label: "Preview" },
              ].map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setPreviewMode(m.key)}
                  className={`px-2 py-1 text-xs rounded transition ${
                    previewMode === m.key ? "bg-indigo-700 text-white font-bold" : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`grid ${previewMode === "split" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} min-h-[500px]`}>
            {(previewMode === "edit" || previewMode === "split") && (
              <textarea
                ref={textareaRef}
                value={form.content}
                onChange={(e) => update("content", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write in Markdown... **bold**, *italic*, `code`, # headers, - lists, > quotes, ![image](url)"
                className="w-full p-4 bg-black text-gray-200 font-mono text-sm resize-none focus:outline-none min-h-[500px]"
                spellCheck="false"
              />
            )}
            {(previewMode === "preview" || previewMode === "split") && (
              <div className="p-4 bg-gray-950 border-l border-gray-800 overflow-y-auto max-h-[800px]">
                {form.content ? (
                  <div className="prose-custom" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <p className="text-gray-600 text-sm italic">Preview will appear here as you write...</p>
                )}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-gray-800 text-[10px] text-gray-500 flex items-center justify-between">
            <span>{form.content.split(/\s+/).filter(Boolean).length} words · {form.content.length} chars</span>
            <span>{categoryInfo.emoji} {categoryInfo.label}</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SCREENSHOTS */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-emerald-300">📸 Screenshots</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {existingId
                ? `${screenshots.length} attached`
                : "Save the deck as a draft first, then screenshots can be attached."}
            </p>
          </div>
          <ScreenshotUploader
            setupId={existingId}
            userId={userId}
            screenshots={screenshots}
            onChange={setScreenshots}
            table="deck_screenshots"
            onEnsureSetup={ensureDeckSaved}
          />
          {screenshots.length > 0 && (
            <ScreenshotGallery
              screenshots={screenshots}
              onDelete={(id) => setScreenshots(prev => prev.filter(s => s.id !== id))}
              table="deck_screenshots"
            />
          )}
        </div>

        {/* Error / Saved */}
        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {saved && <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">✅ Saved — redirecting...</div>}

        {/* Save buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || saving || !form.title.trim()}
            className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-yellow-800 hover:bg-yellow-700 text-white"
          >
            {savingDraft ? "Saving..." : "📝 Save as Draft"}
          </button>
          <button
            type="button"
            onClick={handleSavePublished}
            disabled={saving || savingDraft || !form.title.trim()}
            className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-indigo-700 hover:bg-indigo-600 text-white"
          >
            {saving ? "Saving..." : "✅ Publish Deck"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function DeckEditorPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 bg-black text-white"><div className="max-w-6xl mx-auto text-gray-400">Loading editor...</div></main>}>
      <DeckEditorContent />
    </Suspense>
  );
}