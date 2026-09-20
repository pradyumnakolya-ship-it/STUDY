"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  BookOpen, 
  Sparkles, 
  Send, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileCheck, 
  Layers, 
  HelpCircle,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  MaterialItemData, 
  MaterialChunkData, 
  CitationData, 
  uploadMaterial, 
  listMaterials, 
  getMaterialDetail, 
  deleteMaterial, 
  queryMaterial, 
  queryAllMaterials 
} from "@/lib/api";

interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: CitationData[];
  timestamp: string;
}

export default function MaterialsPage() {
  const { user } = useAuth();

  // Materials Library State
  const [materials, setMaterials] = useState<MaterialItemData[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(true);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notesText, setNotesText] = useState("");
  const [uploadMode, setUploadMode] = useState<"file" | "text">("file");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Inspector & Chunks State
  const [inspectChunks, setInspectChunks] = useState<MaterialChunkData[]>([]);
  const [showChunkInspector, setShowChunkInspector] = useState(false);

  // RAG Chat State
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isAnswering]);

  const loadMaterials = async () => {
    setLoadingList(true);
    try {
      const items = await listMaterials();
      setMaterials(items);
      if (items.length > 0 && !selectedMaterialId) {
        setSelectedMaterialId(items[0].id);
      }
    } catch (err) {
      console.error("Failed to load materials", err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!uploadTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        setUploadTitle(cleanName);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      setUploadError("Please provide a title for your study material.");
      return;
    }
    if (uploadMode === "file" && !selectedFile) {
      setUploadError("Please select a PDF or text file to upload.");
      return;
    }
    if (uploadMode === "text" && !notesText.trim()) {
      setUploadError("Please enter notes or study text.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const res = await uploadMaterial(
        uploadTitle.trim(),
        uploadMode === "text" ? notesText.trim() : "",
        uploadMode === "file" && selectedFile ? selectedFile : undefined
      );

      setUploadSuccess(`Indexed "${res.material.title}" into ${res.material.chunk_count} chunks.`);
      setUploadTitle("");
      setSelectedFile(null);
      setNotesText("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh list and select new material
      await loadMaterials();
      setSelectedMaterialId(res.material.id);

      // Seed initial welcome message for this doc
      setChatHistory([
        {
          id: "seed-msg",
          role: "assistant",
          content: `I've finished indexing **${res.material.title}**! You can ask me to explain any topic, summarize sections, or generate practice questions based strictly on your uploaded material.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this study document?")) return;

    try {
      await deleteMaterial(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
      if (selectedMaterialId === id) {
        setSelectedMaterialId(materials.length > 1 ? materials.find(m => m.id !== id)?.id || null : null);
      }
    } catch (err) {
      alert("Failed to delete material");
    }
  };

  const handleInspect = async (id: string) => {
    try {
      const detail = await getMaterialDetail(id);
      setInspectChunks(detail.chunks);
      setShowChunkInspector(true);
    } catch (err) {
      alert("Could not load document chunks");
    }
  };

  const handleAskQuestion = async (queryText?: string) => {
    const q = (queryText || questionInput).trim();
    if (!q || isAnswering) return;

    const userMsgId = `user-${Date.now()}`;
    const newHistory: ChatEntry[] = [
      ...chatHistory,
      {
        id: userMsgId,
        role: "user",
        content: q,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ];

    setChatHistory(newHistory);
    setQuestionInput("");
    setIsAnswering(true);

    try {
      let res;
      if (selectedMaterialId) {
        res = await queryMaterial(selectedMaterialId, q);
      } else {
        res = await queryAllMaterials(q);
      }

      setChatHistory([
        ...newHistory,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: res.answer,
          citations: res.citations,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } catch (err: any) {
      setChatHistory([
        ...newHistory,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: `⚠️ Error retrieving from study notes: ${err.message || "Failed to generate answer"}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsAnswering(false);
    }
  };

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[var(--border)] bg-white sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <Link
            href="/home"
            className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-nested)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--cta-primary)] text-white flex items-center justify-center font-bold text-base shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-[var(--text-primary)] leading-tight">My Materials & RAG Q&A</h1>
              <p className="text-xs text-[var(--text-secondary)]">Upload notes or PDFs and query with verified source citations</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#E1F5EE] border border-[#B7EBD8] text-[#085041] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>RAG Grounded AI</span>
          </span>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Column (5 Cols): Upload & Material Library */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Upload Card */}
          <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Upload className="w-4 h-4 text-[var(--cta-primary)]" />
                <span>Upload Study Material</span>
              </h2>

              <div className="flex bg-[var(--surface-nested)] p-0.5 rounded-lg border border-[var(--border)] text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setUploadMode("file")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${uploadMode === "file" ? "bg-white shadow-xs text-[var(--text-primary)] font-bold" : "text-[var(--text-secondary)]"}`}
                >
                  PDF File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("text")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${uploadMode === "text" ? "bg-white shadow-xs text-[var(--text-primary)] font-bold" : "text-[var(--text-secondary)]"}`}
                >
                  Raw Notes
                </button>
              </div>
            </div>

            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Document Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Operating Systems - Virtual Memory Notes"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] focus:outline-none focus:border-[var(--cta-primary)] focus:bg-white transition-all"
                />
              </div>

              {uploadMode === "file" ? (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Select PDF or Text File</label>
                  <div className="border border-dashed border-[var(--border)] rounded-xl p-4 text-center bg-[var(--surface-nested)] hover:border-[var(--cta-primary)] transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={handleFileChange}
                      className="hidden"
                      id="material-file-input"
                    />
                    <label htmlFor="material-file-input" className="cursor-pointer flex flex-col items-center justify-center gap-1.5">
                      <FileCheck className="w-6 h-6 text-[var(--text-secondary)]" />
                      <span className="text-xs font-semibold text-[var(--cta-primary)] hover:underline">
                        {selectedFile ? selectedFile.name : "Click to select a file"}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">PDF, TXT, or MD up to 20MB</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Paste Study Notes / Lecture Excerpts</label>
                  <textarea
                    rows={4}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Paste lecture transcription, textbook summary, or key study formulas here..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] focus:outline-none focus:border-[var(--cta-primary)] focus:bg-white resize-none"
                  />
                </div>
              )}

              {uploadError && (
                <div className="p-2.5 rounded-xl bg-[#FAEAF0] border border-[#F4C0D1] text-[#72243E] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-2.5 rounded-xl bg-[#E1F5EE] border border-[#B7EBD8] text-[#085041] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-2.5 rounded-xl bg-[var(--cta-primary)] text-white font-semibold text-xs hover:bg-[var(--cta-primary-hover)] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting & Chunking Document...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Index into RAG Library</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Library Cards List */}
          <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#3C3489]" />
                <span>Your Study Documents ({materials.length})</span>
              </h2>

              <button
                onClick={() => setSelectedMaterialId(null)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${selectedMaterialId === null ? "bg-[#3C3489] text-white border-[#3C3489]" : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-nested)]"}`}
              >
                Search All
              </button>
            </div>

            {loadingList ? (
              <div className="py-12 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--cta-primary)]" />
                <span>Loading materials...</span>
              </div>
            ) : materials.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2 border border-dashed border-[var(--border)] rounded-xl p-6">
                <FileText className="w-8 h-8 text-[var(--text-tertiary)]" />
                <p className="font-semibold text-[var(--text-primary)]">No documents uploaded yet</p>
                <p className="text-[11px] max-w-xs">Upload your course syllabus, lecture slides, or revision notes above to start asking grounded questions.</p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
                {materials.map((mat) => {
                  const isSelected = selectedMaterialId === mat.id;
                  return (
                    <div
                      key={mat.id}
                      onClick={() => setSelectedMaterialId(mat.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected 
                          ? "border-[var(--cta-primary)] bg-[var(--surface-nested)] shadow-xs" 
                          : "border-[var(--border)] hover:border-[var(--border-subtle)] hover:bg-[var(--surface-nested)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${mat.file_type === 'pdf' ? 'bg-[#FAECE7] text-[var(--cta-primary)]' : 'bg-[#EEEDFE] text-[#3C3489]'}`}>
                            {mat.file_type}
                          </span>
                          <h3 className="font-bold text-xs text-[var(--text-primary)] truncate">{mat.title}</h3>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            title="Inspect Chunks"
                            onClick={(e) => { e.stopPropagation(); handleInspect(mat.id); }}
                            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete Material"
                            onClick={(e) => handleDelete(mat.id, e)}
                            className="p-1 rounded text-[var(--text-secondary)] hover:text-[#72243E] hover:bg-[#FAEAF0]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {mat.summary && (
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 italic">
                          "{mat.summary}"
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-[var(--border)]">
                        <span>{mat.chunk_count} chunks</span>
                        <span>•</span>
                        <span>{mat.total_pages} page(s)</span>
                        <span>•</span>
                        <span>{(mat.file_size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 Cols): Grounded RAG Chat & Citations */}
        <div className="lg:col-span-7 flex flex-col bg-white border border-[var(--border)] rounded-2xl shadow-xs overflow-hidden h-[750px]">
          
          {/* Chat Scope Header */}
          <div className="px-6 py-4 border-b border-[var(--border)] bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E1F5EE] text-[#085041] flex items-center justify-center font-bold text-xs">
                AI
              </div>
              <div>
                <h3 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-2">
                  <span>Document Tutor</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-nested)] border border-[var(--border)] text-[var(--text-secondary)]">
                    {selectedMaterial ? `Scope: ${selectedMaterial.title}` : "Scope: All Study Library"}
                  </span>
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  Answers generated strictly from your uploaded course materials
                </p>
              </div>
            </div>

            {selectedMaterial && (
              <button
                onClick={() => handleInspect(selectedMaterial.id)}
                className="text-xs text-[var(--cta-primary)] hover:underline flex items-center gap-1 font-semibold"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>View Excerpts</span>
              </button>
            )}
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[var(--surface-nested)]">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#FAECE7] text-[var(--cta-primary)] flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-[var(--text-primary)] mb-1">
                  Ask Anything About Your Notes
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mb-6">
                  Select a document on the left and ask questions. The AI Study Tutor will answer using only your uploaded materials and cite exact pages.
                </p>

                <div className="w-full space-y-2 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Try asking:</p>
                  {[
                    "What are the main concepts covered in this document?",
                    "Summarize the key definitions and formulas.",
                    "Generate 2 difficult practice questions from these notes."
                  ].map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAskQuestion(sample)}
                      className="w-full text-left p-2.5 rounded-xl border border-[var(--border)] bg-white hover:border-[var(--cta-primary)] hover:text-[var(--cta-primary)] text-xs transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span className="truncate">{sample}</span>
                      <Send className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                        isUser
                          ? "bg-[var(--cta-primary)] text-white font-medium"
                          : "bg-white text-[var(--text-primary)] border border-[var(--border)]"
                      }`}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-sm font-bold mt-2 mb-1" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-xs font-bold mt-2 mb-1" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-xs font-semibold mt-1 mb-0.5" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                          code: ({node, ...props}) => (
                            <code className="bg-[var(--surface-nested)] text-[var(--cta-primary)] px-1.5 py-0.5 rounded text-[11px] font-mono" {...props} />
                          )
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>

                      {/* Source Citations Shelf */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                            <BookOpen className="w-3 h-3 text-[var(--cta-primary)]" />
                            <span>Verified Source Citations ({msg.citations.length})</span>
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            {msg.citations.map((cite, cIdx) => {
                              const citeKey = `${msg.id}-${cIdx}`;
                              const isExpanded = expandedCitations[citeKey];
                              return (
                                <div
                                  key={cIdx}
                                  onClick={() => setExpandedCitations(prev => ({ ...prev, [citeKey]: !isExpanded }))}
                                  className="p-2 rounded-xl bg-[var(--surface-nested)] border border-[var(--border)] text-[11px] hover:border-[var(--cta-primary)] cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center justify-between font-semibold text-[var(--text-primary)]">
                                    <span className="truncate max-w-[120px]">
                                      {cite.page_number ? `Page ${cite.page_number}` : cite.material_title}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#E1F5EE] text-[#085041]">
                                      {(cite.relevance_score * 100).toFixed(0)}% match
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2 italic">
                                    "{cite.excerpt}"
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-[var(--text-tertiary)] mt-1 px-1">{msg.timestamp}</span>
                  </div>
                );
              })
            )}

            {isAnswering && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-white p-3 rounded-2xl border border-[var(--border)] w-fit shadow-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--cta-primary)]" />
                <span>Searching document excerpts and synthesizing answer...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 border-t border-[var(--border)] bg-white">
            <form
              onSubmit={(e) => { e.preventDefault(); handleAskQuestion(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder={selectedMaterial ? `Ask a question about ${selectedMaterial.title}...` : "Ask a question across all study materials..."}
                className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] focus:outline-none focus:border-[var(--cta-primary)] focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!questionInput.trim() || isAnswering}
                className="px-4 py-2.5 rounded-xl bg-[var(--cta-primary)] text-white font-semibold text-xs hover:bg-[var(--cta-primary-hover)] transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Chunk Inspector Modal */}
      {showChunkInspector && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[var(--border)] max-w-2xl w-full max-h-[80vh] flex flex-col shadow-lg overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--cta-primary)]" />
                <span>Semantic Chunks Preview ({inspectChunks.length} Chunks)</span>
              </h3>
              <button
                onClick={() => setShowChunkInspector(false)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {inspectChunks.map((c, i) => (
                <div key={c.id} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] text-xs">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)] mb-1">
                    <span>Chunk #{i + 1} {c.page_number ? `• Page ${c.page_number}` : ""}</span>
                    <span>{c.char_count} chars</span>
                  </div>
                  <p className="text-[var(--text-primary)] leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
