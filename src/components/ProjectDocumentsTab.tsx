import React, { useState, useEffect } from 'react';
import { Box, Paper, Group, TextInput, Button, ActionIcon, Stack, Textarea, Menu, Text, Loader, MultiSelect, Select, Notification, Popover, Drawer, Modal, Switch, Badge, Tooltip, Title, Table } from '@mantine/core';
import { IconEdit, IconTrash, IconDots, IconRobot, IconWorld, IconArrowBack, IconMessagePlus, IconMessageCircle, IconSearch, IconPlus } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { RefObject } from 'react';
import { getGeminiClient } from '@/utils/gemini';
import { io, Socket } from 'socket.io-client';
import { useDisclosure } from '@mantine/hooks';
import { listDocuments, createDocument, type CivilMemoryDocument } from '@/utils/civilMemoryDocuments';

// Define the props type
interface ProjectDocumentsTabProps {
  projectId?: string;
  docTabs: { id: string; title: string; tags?: string[] }[];
  setDocTabs: React.Dispatch<React.SetStateAction<{ id: string; title: string; tags?: string[] }[]>>;
  activeDocTab: string;
  setActiveDocTab: (id: string) => void;
  docRows: { [docId: string]: string[] };
  setDocRows: React.Dispatch<React.SetStateAction<{ [docId: string]: string[] }>>;
  addingRowFor: string | null;
  setAddingRowFor: (id: string | null) => void;
  newRowValue: string;
  setNewRowValue: (v: string) => void;
  savingRow: boolean;
  setSavingRow: (v: boolean) => void;
  editingRow: { docId: string; idx: number } | null;
  setEditingRow: (v: { docId: string; idx: number } | null) => void;
  editRowValue: string;
  setEditRowValue: (v: string) => void;
  savingEdit: boolean;
  setSavingEdit: (v: boolean) => void;
  aiProcessing: { docId: string; idx: number } | null;
  setAiProcessing: (v: { docId: string; idx: number } | null) => void;
  addRowInputRef: RefObject<HTMLTextAreaElement | null>;
  handleAddDocument: () => Promise<void>;
  handleRenameDoc: (tabId: string, newTitle: string, newTags?: string[]) => Promise<void>;
  handleDeleteDoc: (tabId: string) => Promise<void>;
  handleAddRow: (docId: string) => void;
  handleSaveRow: (docId: string) => Promise<void>;
  handleCancelRow: () => void;
  handleDeleteRow: (docId: string, rowIdx: number) => Promise<void>;
  handleStartEditRow: (docId: string, idx: number, value: string) => void;
  handleSaveEditRow: () => Promise<void>;
  handleCancelEditRow: () => void;
  handleAiTransformRow: (docId: string, idx: number, value: string) => Promise<void>;
  docSearch: string;
  setDocSearch: (v: string) => void;
  docPage: number;
  setDocPage: (v: number | ((p: number) => number)) => void;
  DOCS_PER_PAGE: number;
  styles: any;
  showNotification: (opts: any) => void;
  tagFilter: string[];
  setTagFilter: (tags: string[]) => void;
  refetchDocuments: () => void;
}

// Add annotation types
interface Reply {
  user_id: string;
  timestamp: string;
  reply_text: string;
  reply_id: string;
  replies?: Reply[];
}

interface Annotation {
  annotation_id: string;
  document_id: string;
  row_id: string;
  start_offset: number;
  end_offset: number;
  user_id: string;
  timestamp: string;
  comment_text: string;
  resolved: boolean;
  replies: Reply[];
}

// Accept all necessary props for state and handlers
const ProjectDocumentsTab = ({
  projectId,
  docTabs,
  setDocTabs,
  activeDocTab,
  setActiveDocTab,
  docRows,
  setDocRows,
  addingRowFor,
  setAddingRowFor,
  newRowValue,
  setNewRowValue,
  savingRow,
  setSavingRow,
  editingRow,
  setEditingRow,
  editRowValue,
  setEditRowValue,
  savingEdit,
  setSavingEdit,
  aiProcessing,
  setAiProcessing,
  addRowInputRef,
  handleAddDocument,
  handleRenameDoc,
  handleDeleteDoc,
  handleAddRow,
  handleSaveRow,
  handleCancelRow,
  handleDeleteRow,
  handleStartEditRow,
  handleSaveEditRow,
  handleCancelEditRow,
  handleAiTransformRow,
  docSearch,
  setDocSearch,
  docPage,
  setDocPage,
  DOCS_PER_PAGE,
  styles,
  showNotification,
  tagFilter,
  setTagFilter,
  refetchDocuments,
}: ProjectDocumentsTabProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  // Add state for renaming document
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameDocValue, setRenameDocValue] = useState("");

  // Add state for remote cursors
  const [activeCursors, setActiveCursors] = useState<any[]>([]);

  // Add state for translation feature
  const [translating, setTranslating] = useState(false);
  const [translatedRows, setTranslatedRows] = useState<string[] | null>(null);
  const [translationLang, setTranslationLang] = useState<string | null>(null);
  const [showLangSelect, setShowLangSelect] = useState<string | null>(null);

  // Add after other useState hooks
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Annotation selection/toolbar state
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number, y: number } | null>(null);

  // Add after other useState hooks
  const [commentInputOpen, setCommentInputOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');

  // Add after other useState hooks
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  // Add after other useState hooks
  const [replyDrafts, setReplyDrafts] = useState<{ [annotationId: string]: string }>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Add after other useState hooks
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [annotationToDelete, setAnnotationToDelete] = useState<string | null>(null);

  // Add after other useState hooks
  const [showResolved, setShowResolved] = useState(false);

  // Add state for AI Prompt dropdown
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPromptProcessing, setAiPromptProcessing] = useState(false);

  // Add state for Document Transition AI
  const [sourceTransitionDoc, setSourceTransitionDoc] = useState<string | null>(null);
  const [targetTransitionDoc, setTargetTransitionDoc] = useState<string | null>(null);
  const [transitionGenerating, setTransitionGenerating] = useState(false);

  // Advanced Document Workflow state
  const [advDocs, setAdvDocs] = useState<CivilMemoryDocument[]>([]);
  const [advUsers, setAdvUsers] = useState([]);
  const [showAdvCreate, setShowAdvCreate] = useState(false);
  const [advOwner, setAdvOwner] = useState('');
  const [advReviewer, setAdvReviewer] = useState('');
  const [advContent, setAdvContent] = useState('');
  const [advCreating, setAdvCreating] = useState(false);
  const [activeAdvDoc, setActiveAdvDoc] = useState(null);
  const [advDocDetail, setAdvDocDetail] = useState(null);
  const [advHistory, setAdvHistory] = useState([]);
  const [advStatus, setAdvStatus] = useState('');
  const [advVersion, setAdvVersion] = useState(1);
  const [advShowHistory, setAdvShowHistory] = useState(false);
  const [advCompareModal, setAdvCompareModal] = useState(false);
  const [advCompareA, setAdvCompareA] = useState(null);
  const [advCompareB, setAdvCompareB] = useState(null);
  const [advDiff, setAdvDiff] = useState(null);

  useEffect(() => {
    if (!projectId) return;

    const socketInstance = io('http://localhost:3001');
    setSocket(socketInstance);

    socketInstance.emit('project:join', projectId);

    socketInstance.on('document:created', () => {
      showNotification({ color: 'blue', message: `A new document was added. Refreshing...` });
      refetchDocuments();
    });

    socketInstance.on('document:renamed', ({ docId, newTitle, newTags }: { docId: string; newTitle: string; newTags?: string[] }) => {
      setDocTabs(prevTabs =>
        prevTabs.map(tab => (tab.id === docId ? { ...tab, title: newTitle, tags: newTags } : tab))
      );
    });

    socketInstance.on('document:deleted', (docId: string) => {
      setDocTabs(prevTabs => {
        const newTabs = prevTabs.filter(tab => tab.id !== docId);
        if (activeDocTab === docId && newTabs.length > 0) {
          setActiveDocTab(newTabs[0].id);
        }
        return newTabs;
      });
    });

    socketInstance.on('row:added', ({ docId, newRow }: { docId: string; newRow: string }) => {
      setDocRows(prevRows => ({
        ...prevRows,
        [docId]: [...(prevRows[docId] || []), newRow],
      }));
    });

    socketInstance.on('row:updated', ({ docId, rowIdx, updatedRow }: { docId: string; rowIdx: number; updatedRow: string }) => {
      setDocRows(prevRows => ({
        ...prevRows,
        [docId]: (prevRows[docId] || []).map((row, idx) => (idx === rowIdx ? updatedRow : row)),
      }));
    });

    socketInstance.on('row:deleted', ({ docId, rowIdx }: { docId: string; rowIdx: number }) => {
      setDocRows(prevRows => ({
        ...prevRows,
        [docId]: (prevRows[docId] || []).filter((_, idx) => idx !== rowIdx),
      }));
    });

    socketInstance.on('cursor:update', (data) => {
      setActiveCursors(prev => {
        const existing = prev.find(c => c.userId === data.userId);
        if (existing) {
          return prev.map(c => c.userId === data.userId ? { ...c, ...data } : c);
        }
        return [...prev, { ...data, color: getRandomColor() }];
      });
    });

    socketInstance.on('cursor:left', ({ userId }: { userId: string }) => {
      setActiveCursors(prev => prev.filter(c => c.userId !== userId));
    });

    return () => {
      socketInstance.emit('project:leave', projectId);
      socketInstance.disconnect();
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket && projectId) {
        socket.emit('cursor:leave', { projectId, userId: socket.id });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [socket, projectId]);

  const getRandomColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7D842', '#F9A825'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleRealtimeEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.currentTarget.value;
    const cursorPosition = e.target.selectionStart;
    setEditRowValue(newValue); // Update local input for the typist

    // Emit change to everyone else
    if (socket && projectId && editingRow) {
      socket.emit('row:update', {
        projectId,
        docId: editingRow.docId,
        rowIdx: editingRow.idx,
        updatedRow: newValue,
      });
      socket.emit('cursor:update', {
        projectId,
        docId: editingRow.docId,
        rowIdx: editingRow.idx,
        cursorPosition,
        userId: socket.id, // Or a more persistent user ID
      });
    }
  };

  const handleBlurAndSave = async () => {
    // Persist the final state to the database
    await handleSaveEditRow();
    // Exit editing mode
    handleCancelEditRow();
  };

  const handleAddDocumentAndEmit = async () => {
    await handleAddDocument();
    if (socket && projectId) {
      socket.emit('document:create', { projectId });
    }
  };

  const handleRenameDocAndEmit = async (docId: string, newTitle: string, newTags?: string[]) => {
    await handleRenameDoc(docId, newTitle, newTags);
    if (socket && projectId) {
      socket.emit('document:rename', { projectId, docId, newTitle, newTags });
    }
  };

  const handleDeleteDocAndEmit = async (docId: string) => {
    await handleDeleteDoc(docId);
    if (socket && projectId) {
      socket.emit('document:delete', { projectId, docId });
    }
  };

  const handleSaveRowAndEmit = async (docId: string) => {
    await handleSaveRow(docId);
    if (socket && projectId) {
      socket.emit('row:add', { projectId, docId, newRow: newRowValue });
    }
  };

  const handleDeleteRowAndEmit = async (docId: string, rowIdx: number) => {
    await handleDeleteRow(docId, rowIdx);
    if (socket && projectId) {
      socket.emit('row:delete', { projectId, docId, rowIdx });
    }
  };

  // List of supported languages
  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'French' },
    { value: 'sw', label: 'Swahili' },
    { value: 'am', label: 'Amharic' },
    { value: 'ar', label: 'Arabic' },
    { value: 'zu', label: 'Zulu' },
    { value: 'ha', label: 'Hausa' },
    { value: 'yo', label: 'Yoruba' },
    // Add more as needed
  ];

  // Compute filtered and paginated tabs
  const filteredTabs = docTabs.filter(tab =>
    tab.title.toLowerCase().includes(docSearch.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredTabs.length / DOCS_PER_PAGE));
  const paginatedTabs = docSearch
    ? filteredTabs // show all matches if searching
    : filteredTabs.slice((docPage - 1) * DOCS_PER_PAGE, docPage * DOCS_PER_PAGE);

  // Translation handler
  async function handleTranslateDocument(docId: string, targetLang: string) {
    setTranslating(true);
    setTranslationLang(targetLang);
    try {
      const gemini = getGeminiClient();
      const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
      const rows = (docRows[docId] || []).filter(row => typeof row === "string");
      if (rows.length === 0) {
        showNotification({ color: 'blue', message: 'No content to translate.' });
        setTranslating(false);
        return;
      }
      // Translate the document title
      const docTab = docTabs.find(tab => tab.id === docId);
      let translatedTitle = '';
      if (docTab) {
        const titlePrompt = `Translate the following text to ${languageOptions.find(l => l.value === targetLang)?.label || targetLang}. Only return the translated text.\n\nText: ${docTab.title}`;
        try {
          const titleResult = await model.generateContent(titlePrompt);
          translatedTitle = titleResult.response.text().trim();
        } catch (err: any) {
          showNotification({ color: 'red', message: 'Failed to translate document title.' });
          translatedTitle = docTab.title + ' (translated)';
        }
      }
      // Translate all rows and create new rows
      const translated: string[] = [];
      for (let i = 0; i < rows.length; ++i) {
        const prompt = `Translate the following text to ${languageOptions.find(l => l.value === targetLang)?.label || targetLang}. Only return the translated text.\n\nText: ${rows[i]}`;
        try {
          const result = await model.generateContent(prompt);
          const aiText = result.response.text().trim();
          // Insert original row, then translated row
          translated.push(rows[i]);
          translated.push(aiText);
        } catch (err: any) {
          showNotification({ color: 'red', message: `Translation failed for row ${i + 1}.` });
          translated.push(rows[i]);
        }
      }
      // Create a new document tab and rows
      const newDocId = `doc-${Date.now()}`;
      const newTabs = [
        ...docTabs,
        { id: newDocId, title: translatedTitle || 'Translated Document', tags: docTab?.tags || [] }
      ];
      setDocTabs(newTabs);
      setActiveDocTab(newDocId);
      setDocRows({ ...docRows, [newDocId]: translated });
      showNotification({ color: 'green', message: 'Translated document created!' });
    } catch (err: any) {
      showNotification({ color: 'red', message: 'Translation failed.' });
    }
    setTranslating(false);
  }

  function addAnnotation(annotation: Annotation) {
    setAnnotations(prev => [...prev, annotation]);
  }

  function updateAnnotation(annotation_id: string, update: Partial<Annotation>) {
    setAnnotations(prev => prev.map(a => a.annotation_id === annotation_id ? { ...a, ...update } : a));
  }

  function deleteAnnotation(annotation_id: string) {
    setAnnotations(prev => prev.filter(a => a.annotation_id !== annotation_id));
  }

  function handleRowTextSelection(e: React.MouseEvent, row: string, rowIdx: number) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      // No selection, clear state
      setSelectedRowId(null);
      setSelectionStart(null);
      setSelectionEnd(null);
      setSelectedText('');
      setToolbarPosition(null);
      return;
    }
    const selectedText = selection.toString();
    if (!selectedText) {
      setSelectedRowId(null);
      setSelectionStart(null);
      setSelectionEnd(null);
      setSelectedText('');
      setToolbarPosition(null);
      return;
    }
    // Find offsets within the row string
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if (!anchorNode || !focusNode) return;
    // Only support selection within the same row for now
    // (More advanced: check if anchorNode/focusNode are inside this row's DOM)
    const rowText = row;
    const anchorOffset = selection.anchorOffset;
    const focusOffset = selection.focusOffset;
    let start = Math.min(anchorOffset, focusOffset);
    let end = Math.max(anchorOffset, focusOffset);
    // Fallback: find selectedText in rowText
    if (rowText) {
      const idx = rowText.indexOf(selectedText);
      if (idx !== -1) {
        start = idx;
        end = idx + selectedText.length;
      }
    }
    // Get mouse position for toolbar
    const rect = (selection.rangeCount > 0) ? selection.getRangeAt(0).getBoundingClientRect() : null;
    const x = rect ? rect.left + window.scrollX : e.clientX;
    const y = rect ? rect.top + window.scrollY - 32 : e.clientY - 32;
    setSelectedRowId(`${rowIdx}`);
    setSelectionStart(start);
    setSelectionEnd(end);
    setSelectedText(selectedText);
    setToolbarPosition({ x, y });
  }

  // --- Annotation Backend API Real Implementation ---
  async function fetchAnnotations(document_id: string): Promise<Annotation[]> {
    const res = await fetch(`/api/annotations?document_id=${document_id}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return await res.json();
  }

  async function createAnnotation(annotation: Annotation): Promise<void> {
    const res = await fetch('/api/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(annotation),
    });
    if (!res.ok) throw new Error('Failed to create');
  }

  async function updateAnnotationAPI(annotation_id: string, update: Partial<Annotation>): Promise<void> {
    const res = await fetch(`/api/annotations/${annotation_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    if (!res.ok) throw new Error('Failed to update');
  }

  async function deleteAnnotationAPI(annotation_id: string): Promise<void> {
    const res = await fetch(`/api/annotations/${annotation_id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
  }

  // Fetch annotations on mount/activeDocTab change
  useEffect(() => {
    if (activeDocTab) {
      fetchAnnotations(projectId || '').then(setAnnotations).catch(() => showNotification({ color: 'red', message: 'Failed to load comments.' }));
    }
    // eslint-disable-next-line
  }, [activeDocTab, projectId]);

  // Recursive function to render replies
  const renderReplies = (replies: Reply[], parentId: string) => (
    <div style={{ marginTop: 8, paddingLeft: 16 }}>
      {replies.map(reply => (
        <Paper key={reply.reply_id} p="xs" radius="sm" withBorder style={{ background: '#f4f8fb' }}>
          <Text size="sm">{reply.reply_text}</Text>
          <Text size="xs" c="dimmed">{reply.user_id} • {new Date(reply.timestamp).toLocaleString()}</Text>
          <Button size="xs" variant="subtle" onClick={() => setReplyingTo(reply.reply_id)}>Reply</Button>
          {/* Render nested replies */}
          {replyingTo === reply.reply_id && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <Textarea
                value={replyDrafts[reply.reply_id] || ''}
                onChange={e => {
                  const value = e.target.value;
                  setReplyDrafts(d => ({ ...d, [reply.reply_id]: value }));
                }}
                placeholder="Write a reply..."
                minRows={2}
                maxRows={4}
                autoFocus
              />
              <Group mt={4} justify="flex-end">
                <Button size="xs" variant="default" onClick={() => { setReplyingTo(null); setReplyDrafts(d => ({ ...d, [reply.reply_id]: '' })); }}>Cancel</Button>
                <Button size="xs" color="blue" disabled={!(replyDrafts[reply.reply_id] || '').trim()} onClick={() => {
                  const replyText = (replyDrafts[reply.reply_id] || '').trim();
                  if (!replyText) return;
                  // Helper to add reply recursively
                  function addNestedReply(repliesArr: Reply[]): Reply[] {
                    return repliesArr.map(r =>
                      r.reply_id === reply.reply_id
                        ? { ...r, replies: [...(r.replies || []), {
                          reply_id: Math.random().toString(36).slice(2),
                          user_id: 'current_user',
                          timestamp: new Date().toISOString(),
                          reply_text: replyText,
                          replies: [],
                        }] }
                        : { ...r, replies: r.replies ? addNestedReply(r.replies) : [] }
                    );
                  }
                  setAnnotations(prev => prev.map(ann =>
                    ann.replies ? { ...ann, replies: addNestedReply(ann.replies) } : ann
                  ));
                  setSidebarOpen(true);
                  setActiveAnnotationId(parentId);
                  setReplyingTo(null);
                  setReplyDrafts(d => ({ ...d, [reply.reply_id]: '' }));
                }}>Post</Button>
              </Group>
            </div>
          )}
          {/* Render replies for this annotation */}
          {reply.replies && reply.replies.length > 0 && renderReplies(reply.replies, reply.reply_id)}
        </Paper>
      ))}
    </div>
  );

  // Handler for running AI for each row
  const runAiForEachRow = async () => {
    if (!aiPrompt.trim() || aiPromptProcessing) return;
    setAiPromptProcessing(true);
    try {
      const gemini = getGeminiClient();
      const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
      const rows = docRows[activeDocTab] || [];
      const updatedRows = await Promise.all(rows.map(async (row) => {
        let prompt = aiPrompt;
        if (prompt.includes("____")) {
          prompt = prompt.replace(/____/g, row);
        } else {
          prompt = `${prompt} ${row}`;
        }
        try {
          const result = await model.generateContent(prompt);
          const aiText = result.response.text().trim();
          // Insert original row, then AI result as a new row
          return [row, aiText];
        } catch {
          showNotification({ color: 'red', message: 'AI failed for a row.' });
          return [row];
        }
      }));
      // Flatten the array and update rows
      setDocRows({ ...docRows, [activeDocTab]: updatedRows.flat() });
      showNotification({ color: 'green', message: 'AI results added as new rows.' });
    } finally {
      setAiPromptProcessing(false);
    }
  };

  // Fetch users and project-specific documents
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(u => {
        // Get project members from props or context
        let projectMembers = [];
        if (typeof docTabs !== 'undefined' && docTabs.length > 0 && docTabs[0].projectMembers) {
          projectMembers = docTabs[0].projectMembers;
        } else if (typeof window !== 'undefined' && window.currentProjectMembers) {
          projectMembers = window.currentProjectMembers;
        } else if (typeof projectId !== 'undefined' && window.projectsById) {
          const p = window.projectsById[projectId];
          if (p && Array.isArray(p.members)) projectMembers = p.members;
        }
        // Fallback: try to get from localStorage
        if (!projectMembers.length && typeof localStorage !== 'undefined') {
          try {
            const projects = JSON.parse(localStorage.getItem('projects:backup') || '[]');
            const p = projects.find((proj: any) => String(proj.id) === String(projectId));
            if (p && Array.isArray(p.members)) projectMembers = p.members;
          } catch {}
        }
        // Normalize projectMembers to array of emails
        projectMembers = projectMembers.map((m: any) => typeof m === 'string' ? m : m.email);
        setAdvUsers(u.filter((user: any) => projectMembers.includes(user.email)).map((user: any) => ({ value: user.email, label: user.email })));
      });
    if (projectId) {
      fetch(`/api/documents?projectId=${projectId}`)
        .then(res => res.json())
        .then(setAdvDocs);
    }
  }, [projectId, advCreating, docTabs]);

  // Fetch document detail when selected
  useEffect(() => {
    if (!activeAdvDoc) return;
    fetch(`/api/documents/${activeAdvDoc}`)
      .then(res => res.json())
      .then(d => {
        setAdvDocDetail(d);
        setAdvStatus(d.status);
        setAdvVersion(d.version);
      });
    fetch(`/api/documents/${activeAdvDoc}/history`)
      .then(res => res.json())
      .then(h => setAdvHistory(h));
  }, [activeAdvDoc]);

  // Create new document
  const handleAdvCreate = async () => {
    setAdvCreating(true);
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: advContent, owner: advOwner, reviewer: advReviewer, projectId }),
    });
    const doc = await res.json();
    setAdvCreating(false);
    setShowAdvCreate(false);
    setActiveAdvDoc(doc.id);
  };

  // Save draft
  const handleAdvSaveDraft = async () => {
    await fetch(`/api/documents/${activeAdvDoc}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: advDocDetail.content, editor: advDocDetail.owner }),
    });
    window.location.reload();
  };

  // Submit for approval
  const handleAdvSubmitForApproval = async () => {
    await fetch(`/api/documents/${activeAdvDoc}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit_for_approval', reviewer: advDocDetail.reviewer }),
    });
    window.location.reload();
  };

  // Approve
  const handleAdvApprove = async () => {
    await fetch(`/api/documents/${activeAdvDoc}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', reviewer: advDocDetail.reviewer }),
    });
    window.location.reload();
  };

  // Reject
  const handleAdvReject = async () => {
    await fetch(`/api/documents/${activeAdvDoc}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reviewer: advDocDetail.reviewer }),
    });
    window.location.reload();
  };

  // Compare versions
  const handleAdvCompare = async () => {
    if (!advCompareA || !advCompareB) return;
    const res = await fetch(`/api/documents/${activeAdvDoc}/compare?versionA=${advCompareA}&versionB=${advCompareB}`);
    const data = await res.json();
    setAdvDiff(data.diff);
    setAdvCompareModal(true);
  };

  const handleGenerateTransition = async () => {
    if (!sourceTransitionDoc || !targetTransitionDoc) {
        showNotification({ color: 'red', message: 'Please select a source and target document.' });
        return;
    }
    if (sourceTransitionDoc === targetTransitionDoc) {
        showNotification({ color: 'red', message: 'Source and target documents cannot be the same.' });
        return;
    }
    setTransitionGenerating(true);
    try {
        const gemini = getGeminiClient();
        const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });

        const sourceRows = docRows[sourceTransitionDoc] || [];
        const targetRows = docRows[targetTransitionDoc] || [];

        const prompt = `
Given the following source document and target document, generate guidance on how to transition the content from the source to the target.
Analyze the differences and provide actionable steps or suggestions for merging/updating the content.

Source Document Content:
---
${sourceRows.join('\n')}
---

Target Document Content:
---
${targetRows.join('\n')}
---

Transition Guidance:
`;
        const result = await model.generateContent(prompt);
        const guidance = result.response.text().trim();
        
        const newDocId = `doc-transition-${Date.now()}`;
        const sourceDocTitle = docTabs.find(t => t.id === sourceTransitionDoc)?.title || 'Source';
        const targetDocTitle = docTabs.find(t => t.id === targetTransitionDoc)?.title || 'Target';
        const newDocTitle = `Transition: ${sourceDocTitle} to ${targetDocTitle}`;
        
        const newTabs = [
            ...docTabs,
            { id: newDocId, title: newDocTitle, tags: ['transition-guidance'] }
        ];
        setDocTabs(newTabs);
        setDocRows({ ...docRows, [newDocId]: guidance.split('\n') });
        setActiveDocTab(newDocId);
        if (socket && projectId) {
            socket.emit('document:create', { projectId });
        }

        showNotification({ color: 'green', message: 'Transition guidance document created.' });

    } catch (error) {
        console.error("Transition generation failed:", error);
        showNotification({ color: 'red', message: 'Failed to generate transition guidance.' });
    } finally {
        setTransitionGenerating(false);
    }
  };

  return (
    <Box style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
      {/* Header: Add Document, Search, Pagination */}
      <Group mb="md" align="center" justify="space-between">
        {/* Document Tabs List (as buttons or pills) */}
        <Group gap={8} style={{ flexWrap: 'wrap', maxWidth: '60vw', overflowX: 'auto' }}>
          {paginatedTabs.map(tab => (
            <Group key={tab.id} gap={4}>
              <Button
                size="xs"
                variant={tab.id === activeDocTab ? 'filled' : 'light'}
                color={tab.id === activeDocTab ? styles.accentColor : 'gray'}
                onClick={() => setActiveDocTab(tab.id)}
                style={{ borderRadius: 12, fontWeight: 600, marginRight: 0, marginBottom: 4 }}
              >
                {tab.title}
              </Button>
              <Menu shadow="md" width={140} position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="subtle" size="xs" style={{ marginLeft: 0, marginBottom: 4 }}>
                    <IconDots size={14} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconEdit size={14} />}
                    onClick={() => {
                      setRenamingDocId(tab.id);
                      setRenameDocValue(tab.title);
                    }}
                  >
                    Rename
                  </Menu.Item>
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => handleDeleteDocAndEmit(tab.id)}
                    disabled={docTabs.length === 1}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          ))}
        </Group>
        <Group gap={8}>
          {/* Search Input */}
          <TextInput
            placeholder="Search documents..."
            value={docSearch}
            onChange={e => setDocSearch(e.currentTarget.value)}
            size="xs"
            leftSection={<IconSearch size={16} />}
            style={{ minWidth: 180 }}
          />
          {/* Add Document Button */}
          <Button
            size="xs"
            leftSection={<IconPlus size={16} />}
            onClick={handleAddDocumentAndEmit}
            style={{ borderRadius: 12, fontWeight: 700 }}
          >
            Add Document
          </Button>
        </Group>
      </Group>
      {/* Document Title and Language Selector */}
      <Group mb="md" align="center" justify="space-between">
        <Text fw={700} size="lg" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {docTabs.find(tab => tab.id === activeDocTab)?.title || ''}
        </Text>
        <Popover
          opened={showLangSelect === activeDocTab}
          onClose={() => setShowLangSelect(null)}
          position="bottom"
          withArrow
          shadow="md"
        >
          <Popover.Target>
            <ActionIcon
              variant="light"
              color="blue"
              onClick={() => setShowLangSelect(activeDocTab)}
              title="Translate document"
              loading={translating}
              disabled={translating}
            >
              <IconWorld size={20} />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown>
            <Select
              data={languageOptions}
              value={translationLang}
              onChange={lang => {
                if (lang) {
                  handleTranslateDocument(activeDocTab, lang);
                  setShowLangSelect(null);
                }
              }}
              placeholder="Select language"
              searchable
              disabled={translating}
            />
            {translating && <Loader size="xs" mt="sm" />}
          </Popover.Dropdown>
        </Popover>
      </Group>
      <Stack mt="md" style={{ flex: 1 }}>
        {(translatedRows || (docRows[activeDocTab] || [])
          .filter(row => typeof row === "string" && row.toLowerCase().includes(docSearch.toLowerCase())))
          .map((row, idx) => {
            const isEditing = editingRow && editingRow.docId === activeDocTab && editingRow.idx === idx;
            const isAI = aiProcessing && aiProcessing.docId === activeDocTab && aiProcessing.idx === idx;
            // Count annotations for this row
            const rowAnnotations = annotations.filter(a => a.row_id === `${idx}` && a.document_id === (projectId || ''));
            const commentCount = rowAnnotations.length;
            return (
              <Group key={idx} justify="space-between" align="center" style={{ position: "relative" }}>
                {isEditing ? (
                  <>
                    <Textarea
                      value={editRowValue}
                      onChange={handleRealtimeEditChange}
                      onBlur={handleBlurAndSave}
                      autoFocus
                      style={{ flex: 1, position: 'relative' }}
                      minRows={2}
                      disabled={!!isAI}
                      placeholder="Type your Markdown here..."
                      ref={addRowInputRef}
                      onMouseUp={(e) => handleRowTextSelection(e, row, idx)}
                    />
                    {activeCursors
                      .filter(c => c.docId === activeDocTab && c.rowIdx === idx && c.userId !== socket?.id)
                      .map(cursor => (
                        <div
                          key={cursor.userId}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            left: `${cursor.cursorPosition * 7.5 + 12}px`, // Adjust multiplier based on font size/char width + padding
                            width: '2px',
                            height: '20px',
                            backgroundColor: cursor.color,
                            zIndex: 10,
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: '-22px',
                              left: '-2px',
                              background: cursor.color,
                              color: 'white',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {cursor.userId.slice(0, 6)}
                          </div>
                        </div>
                      ))}
                    <ActionIcon
                      size={28}
                      color={styles.accentColor}
                      variant="light"
                      onClick={() => handleAiTransformRow(activeDocTab, idx, editRowValue)}
                      loading={!!isAI}
                      disabled={!!isAI}
                      title="Transform with AI"
                    >
                      <IconRobot size={18} />
                    </ActionIcon>
                  </>
                ) : (
                  <Paper
                    p="sm"
                    withBorder
                    radius="md"
                    style={{ flex: 1, minWidth: 0, cursor: "pointer", background: styles.tabBackground, color: styles.secondaryTextColor, border: styles.cardBorder }}
                    onClick={() => handleStartEditRow(activeDocTab, idx, row)}
                    title="Click to edit"
                    onMouseUp={(e) => handleRowTextSelection(e, row, idx)}
                  >
                    {/* Render row as Markdown, with annotation highlighting if present */}
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: '#1769aa', textDecoration: 'underline' }} />,
                        code: (props: any) => {
                          const { inline = false, className, children, ...rest } = props;
                          if (inline) {
                            return <code style={{ background: '#f4f4f4', borderRadius: 4, padding: '2px 6px', fontSize: 13 }}>{children}</code>;
                          }
                          return <pre style={{ background: '#23243a', color: '#fff', borderRadius: 8, padding: 12, overflowX: 'auto' }}><code>{children}</code></pre>;
                        },
                        ul: ({node, ...props}) => <ul style={{ marginLeft: 20, marginBottom: 8 }} {...props} />,
                        ol: ({node, ...props}) => <ol style={{ marginLeft: 20, marginBottom: 8 }} {...props} />,
                        li: ({node, ...props}) => <li style={{ marginBottom: 4 }} {...props} />,
                        p: ({node, ...props}) => <p style={{ marginBottom: 8 }} {...props} />,
                        blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: '3px solid #1769aa', margin: '8px 0', padding: '4px 12px', color: '#555', background: '#f5f7fa' }} {...props} />,
                      }}
                    >
                      {row}
                    </ReactMarkdown>
                  </Paper>
                )}
                {/* Row comment marker and comment button */}
                <Group gap={4}>
                  {commentCount > 0 && (
                    <Tooltip label={`${commentCount} comment${commentCount > 1 ? 's' : ''} on this row`}>
                      <div style={{ position: 'relative', display: 'inline-block', width: 32, height: 32 }}>
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => {
                            setSidebarOpen(true);
                            if (rowAnnotations.length > 0) {
                              setActiveAnnotationId(rowAnnotations[0].annotation_id);
                            }
                          }}
                          title="Show comments for this row"
                          size={32}
                          style={{ position: 'relative' }}
                        >
                          <IconMessageCircle size={18} />
                        </ActionIcon>
                        <Badge
                          color="blue"
                          size="xs"
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            pointerEvents: 'none',
                            zIndex: 1,
                            minWidth: 16,
                            height: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            padding: 0,
                          }}
                          radius="xl"
                        >
                          {commentCount}
                        </Badge>
                      </div>
                    </Tooltip>
                  )}
                  <Tooltip label="Add a comment to this row">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => {
                        setSelectedRowId(`${idx}`);
                        setSelectionStart(0);
                        setSelectionEnd(row.length);
                        setSelectedText(row);
                        setToolbarPosition({ x: window.innerWidth / 2, y: window.scrollY + 120 }); // Centered toolbar
                        setCommentInputOpen(true);
                      }}
                      title="Comment on this row"
                    >
                      <IconMessagePlus size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Menu shadow="md" width={120} position="bottom-end" withinPortal>
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" size={28} style={{ opacity: 0.7 }}>
                      <IconDots size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => handleDeleteRowAndEmit(activeDocTab, idx)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                {/* AI result for this row */}
                {false && (
                  <Paper p="xs" mt={4} radius="sm" withBorder style={{ background: styles.tabBackground, border: styles.cardBorder }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: '#1769aa', textDecoration: 'underline' }} />,
                        code: (props: any) => {
                          const { inline = false, className, children, ...rest } = props;
                          if (inline) {
                            return <code style={{ background: '#f4f4f4', borderRadius: 4, padding: '2px 6px', fontSize: 13 }}>{children}</code>;
                          }
                          return <pre style={{ background: '#23243a', color: '#fff', borderRadius: 8, padding: 12, overflowX: 'auto' }}><code>{children}</code></pre>;
                        },
                        ul: ({node, ...props}) => <ul style={{ marginLeft: 20, marginBottom: 8 }} {...props} />,
                        ol: ({node, ...props}) => <ol style={{ marginLeft: 20, marginBottom: 8 }} {...props} />,
                        li: ({node, ...props}) => <li style={{ marginBottom: 4 }} {...props} />,
                        p: ({node, ...props}) => <p style={{ marginBottom: 8 }} {...props} />,
                        blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: '3px solid #1769aa', margin: '8px 0', padding: '4px 12px', color: '#555', background: '#f5f7fa' }} {...props} />,
                      }}
                    >
                      {""}
                    </ReactMarkdown>
                  </Paper>
                )}
              </Group>
            );
          })}
        {addingRowFor === activeDocTab ? (
          <Group>
            <Textarea
              value={newRowValue}
              onChange={e => setNewRowValue(e.currentTarget.value)}
              placeholder="Enter row text (Ctrl+Enter to save)"
              autoFocus
              style={{ flex: 1 }}
              minRows={2}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  handleSaveRowAndEmit(activeDocTab);
                }
              }}
              ref={addRowInputRef}
            />
            <Button size="xs" color={styles.accentColor} onClick={() => handleSaveRowAndEmit(activeDocTab)} loading={savingRow} style={{ background: styles.buttonGradient, color: '#fff', fontWeight: 700, borderRadius: 12 }}>
              Save
            </Button>
            <Button size="xs" variant="default" onClick={handleCancelRow} disabled={savingRow} style={{ background: styles.tabBackground, color: styles.secondaryTextColor, fontWeight: 600, borderRadius: 12 }}>
              Cancel
            </Button>
          </Group>
        ) : (
          <Button
            size="xs"
            variant="light"
            color={styles.accentColor}
            onClick={() => {
              setAddingRowFor(activeDocTab);
              setNewRowValue("");
              setTimeout(() => {
                addRowInputRef.current?.focus();
              }, 100);
            }}
            style={{ background: styles.tabBackground, color: styles.secondaryTextColor, fontWeight: 600, borderRadius: 12 }}
          >
            + Add Row
          </Button>
        )}
      </Stack>
      {/* Pagination Controls (moved to bottom) */}
      {totalPages > 1 && (
        <Group mt="md" mb="md" justify="center" gap={4}>
          <Button size="xs" variant="subtle" onClick={() => setDocPage(p => Math.max(1, p - 1))} disabled={docPage === 1}>Prev</Button>
          <Text size="sm" style={{ minWidth: 60, textAlign: 'center' }}>Page {docPage} of {totalPages}</Text>
          <Button size="xs" variant="subtle" onClick={() => setDocPage(p => Math.min(totalPages, p + 1))} disabled={docPage === totalPages}>Next</Button>
        </Group>
      )}
      {/* Banner for translated view */}
      {translatedRows && (
        <Paper p="xs" mb="md" radius="md" withBorder style={{ background: '#e3f6fd', border: '1px solid #90caf9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconWorld size={18} color="#1976d2" />
          <Text fw={600} style={{ flex: 1 }}>
            Viewing translation to {languageOptions.find(l => l.value === translationLang)?.label || translationLang}
          </Text>
          <Button size="xs" leftSection={<IconArrowBack size={14} />} onClick={() => { setTranslatedRows(null); setTranslationLang(null); }}>
            Revert to Original
          </Button>
        </Paper>
      )}
      {/* Floating annotation toolbar */}
      {toolbarPosition && selectedText && (
        <div
          style={{
            position: 'absolute',
            left: toolbarPosition.x,
            top: toolbarPosition.y,
            zIndex: 2000,
            background: '#fff',
            border: '1px solid #1976d2',
            borderRadius: 8,
            boxShadow: '0 2px 8px #1976d233',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ActionIcon
            color="blue"
            variant="filled"
            size="md"
            title="Add Comment"
            onClick={() => setCommentInputOpen(true)}
          >
            <IconMessagePlus size={20} />
          </ActionIcon>
        </div>
      )}
      {commentInputOpen && toolbarPosition && (
        <div
          style={{
            position: 'absolute',
            left: toolbarPosition.x,
            top: toolbarPosition.y + 40,
            zIndex: 2100,
            background: '#fff',
            border: '1px solid #1976d2',
            borderRadius: 8,
            boxShadow: '0 2px 8px #1976d233',
            padding: 12,
            minWidth: 240,
          }}
        >
          <Textarea
            value={commentDraft}
            onChange={e => setCommentDraft(e.currentTarget.value)}
            placeholder="Add a comment..."
            minRows={2}
            maxRows={5}
            autoFocus
          />
          <Group mt={8} justify="flex-end">
            <Button size="xs" variant="default" onClick={() => { setCommentInputOpen(false); setCommentDraft(''); }}>Cancel</Button>
            <Button size="xs" color="blue" disabled={!commentDraft.trim()} onClick={() => {
              if (!selectedRowId || selectionStart == null || selectionEnd == null) return;
              const newAnnotationId = Math.random().toString(36).slice(2);
              const newAnnotation = {
                annotation_id: newAnnotationId,
                document_id: projectId || '',
                row_id: selectedRowId,
                start_offset: selectionStart,
                end_offset: selectionEnd,
                user_id: 'current_user', // Replace with real user id
                timestamp: new Date().toISOString(),
                comment_text: commentDraft,
                resolved: false,
                replies: [],
              };
              addAnnotation(newAnnotation);
              createAnnotation(newAnnotation).catch(() => showNotification({ color: 'red', message: 'Failed to save comment.' }));
              setCommentInputOpen(false);
              setCommentDraft('');
              setSelectedRowId(null);
              setSelectionStart(null);
              setSelectionEnd(null);
              setSelectedText('');
              setToolbarPosition(null);
              setSidebarOpen(true); // Open sidebar
              setActiveAnnotationId(newAnnotationId); // Focus on new annotation
            }}>Post</Button>
          </Group>
        </div>
      )}
      <Drawer
        opened={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        position="right"
        size="md"
        title="Document Comments"
      >
        <Stack>
          <Switch
            label="Show resolved comments"
            checked={showResolved}
            onChange={e => setShowResolved(e.currentTarget.checked)}
            mb="md"
          />
          {annotations
            .filter(a => a.document_id === (projectId || ''))
            .filter(a => showResolved || !a.resolved)
            .map(ann => (
              <Paper key={ann.annotation_id} p="sm" mb="sm" withBorder style={{ background: activeAnnotationId === ann.annotation_id ? '#e3f6fd' : '#fff', cursor: 'pointer' }} onClick={() => {
                setActiveAnnotationId(ann.annotation_id);
                // Optionally scroll to highlight in document
              }}>
                <Text size="sm" fw={700} style={{ color: '#1976d2' }}>{ann.comment_text}</Text>
                <Text size="xs" c="dimmed">{ann.user_id} • {new Date(ann.timestamp).toLocaleString()}</Text>
                <Text size="xs" style={{ background: styles.highlightColor, borderRadius: 4, padding: '0 4px', display: 'inline-block', marginTop: 4 }}>{ann.row_id && ann.start_offset != null && ann.end_offset != null ? (docRows[activeDocTab]?.[parseInt(ann.row_id)] || '').slice(ann.start_offset, ann.end_offset) : ''}</Text>
                <Group mt={8} justify="flex-end">
                  <Button size="xs" color="green" variant="light" onClick={() => updateAnnotation(ann.annotation_id, { resolved: true })}>Resolve</Button>
                  <Button size="xs" color="red" variant="light" onClick={() => { setDeleteConfirmOpen(true); setAnnotationToDelete(ann.annotation_id); }}>Delete</Button>
                  <Button size="xs" variant="subtle" onClick={() => setReplyingTo(ann.annotation_id)}>Reply</Button>
                </Group>
                {replyingTo === ann.annotation_id && (
                  <div style={{ marginTop: 8, marginBottom: 8 }}>
                    <Textarea
                      value={replyDrafts[ann.annotation_id] || ''}
                      onChange={e => {
                        const value = e.target.value;
                        setReplyDrafts(d => ({ ...d, [ann.annotation_id]: value }));
                      }}
                      placeholder="Write a reply..."
                      minRows={2}
                      maxRows={4}
                      autoFocus
                    />
                    <Group mt={4} justify="flex-end">
                      <Button size="xs" variant="default" onClick={() => { setReplyingTo(null); setReplyDrafts(d => ({ ...d, [ann.annotation_id]: '' })); }}>Cancel</Button>
                      <Button size="xs" color="blue" disabled={!(replyDrafts[ann.annotation_id] || '').trim()} onClick={() => {
                        const replyText = (replyDrafts[ann.annotation_id] || '').trim();
                        if (!replyText) return;
                        setAnnotations(prev => prev.map(a =>
                          a.annotation_id === ann.annotation_id
                            ? { ...a, replies: [...(a.replies || []), {
                                reply_id: Math.random().toString(36).slice(2),
                                user_id: 'current_user',
                                timestamp: new Date().toISOString(),
                                reply_text: replyText,
                                replies: [],
                              }] }
                            : a
                        ));
                        setSidebarOpen(true);
                        setActiveAnnotationId(ann.annotation_id);
                        setReplyingTo(null);
                        setReplyDrafts(d => ({ ...d, [ann.annotation_id]: '' }));
                      }}>Post</Button>
                    </Group>
                  </div>
                )}
                {/* Render replies for this annotation */}
                {ann.replies && ann.replies.length > 0 && renderReplies(ann.replies, ann.annotation_id)}
              </Paper>
            ))}
        </Stack>
      </Drawer>
      {/* Delete confirmation modal */}
      <Modal opened={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Comment?" centered>
        <Text>Are you sure you want to delete this comment and all its replies? This action cannot be undone.</Text>
        <Group mt={16} justify="flex-end">
          <Button variant="default" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button color="red" onClick={() => {
            if (annotationToDelete) {
              deleteAnnotation(annotationToDelete);
              deleteAnnotationAPI(annotationToDelete).catch(() => showNotification({ color: 'red', message: 'Failed to delete comment.' }));
            }
            setDeleteConfirmOpen(false);
            setAnnotationToDelete(null);
          }}>Delete</Button>
        </Group>
      </Modal>
      {/* Rename Document Modal */}
      <Modal opened={!!renamingDocId} onClose={() => setRenamingDocId(null)} title="Rename Document" centered>
        <TextInput
          value={renameDocValue}
          onChange={e => setRenameDocValue(e.currentTarget.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && renamingDocId) {
              handleRenameDocAndEmit(renamingDocId, renameDocValue);
              setRenamingDocId(null);
            }
          }}
          autoFocus
        />
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={() => setRenamingDocId(null)}>Cancel</Button>
          <Button onClick={() => {
            if (renamingDocId) {
              handleRenameDocAndEmit(renamingDocId, renameDocValue);
              setRenamingDocId(null);
            }
          }}>Save</Button>
        </Group>
      </Modal>
      <Paper shadow="xs" p="md" mt="xl">
        <Title order={4}>Advanced Document Workflow</Title>
        <Group mb="md">
          <Button onClick={() => setShowAdvCreate(true)}>Create New Document</Button>
        </Group>
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Version</th>
              <th>Owner</th>
              <th>Reviewer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {advDocs.map(doc => (
              <tr key={doc.id}>
                <td>{doc.id}</td>
                <td>{doc.status}</td>
                <td>{doc.version}</td>
                <td>{doc.owner}</td>
                <td>{doc.reviewer}</td>
                <td>
                  <Button size="xs" onClick={() => setActiveAdvDoc(doc.id)}>
                    Open
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Modal opened={showAdvCreate} onClose={() => setShowAdvCreate(false)} title="Create New Document" size="md">
          <TextInput
            label="Initial Content"
            value={advContent}
            onChange={e => setAdvContent(e.target.value)}
            placeholder="Enter document content..."
            mb="md"
          />
          <Select
            label="Owner"
            data={advUsers}
            value={advOwner}
            onChange={setAdvOwner}
            placeholder="Select owner"
            searchable
            mb="md"
          />
          <Select
            label="Reviewer"
            data={advUsers}
            value={advReviewer}
            onChange={setAdvReviewer}
            placeholder="Select reviewer"
            searchable
            mb="md"
          />
          <Group mt="md">
            <Button onClick={handleAdvCreate} loading={advCreating} disabled={!advOwner || !advReviewer}>
              Create
            </Button>
            <Button variant="outline" onClick={() => setShowAdvCreate(false)}>
              Cancel
            </Button>
          </Group>
        </Modal>
        {activeAdvDoc && advDocDetail && (
          <Modal opened={!!activeAdvDoc} onClose={() => setActiveAdvDoc(null)} title={`Document: ${activeAdvDoc}`} size="xl">
            <Text>Status: {advStatus} | Version: {advVersion}</Text>
            <Textarea
              value={advDocDetail ? advDocDetail.content : ''}
              onChange={e => advDocDetail && setAdvDocDetail({ ...advDocDetail, content: e.target.value })}
              minRows={15}
              autosize
              mt="md"
              placeholder="Start typing..."
              styles={{ input: { fontFamily: 'monospace', fontSize: 16 } }}
              disabled={advStatus === 'pending_approval' || advStatus === 'approved'}
            />
            <Group mt="md">
              <Button onClick={handleAdvSaveDraft} disabled={advStatus === 'pending_approval' || advStatus === 'approved'}>Save Draft</Button>
              <Button onClick={handleAdvSubmitForApproval} disabled={advStatus !== 'draft'}>Submit for Approval</Button>
              <Button onClick={handleAdvApprove} disabled={advStatus !== 'pending_approval'}>Approve</Button>
              <Button onClick={handleAdvReject} disabled={advStatus !== 'pending_approval'} color="red">Reject</Button>
              <Button onClick={() => setAdvShowHistory(true)}>Version History</Button>
            </Group>
            <Modal opened={advShowHistory} onClose={() => setAdvShowHistory(false)} title="Version History" size="lg">
              {advHistory && advHistory.length > 0 ? (
                <>
                  <ul>
                    {advHistory.map((v) => (
                      <li key={v.version}>
                        Version {v.version} ({v.status}) - {v.timestamp}
                      </li>
                    ))}
                  </ul>
                  <Group mt="md">
                    <Select
                      label="Compare A"
                      data={advHistory.map((v) => ({ value: v.version.toString(), label: `v${v.version}` }))}
                      value={advCompareA}
                      onChange={setAdvCompareA}
                    />
                    <Select
                      label="Compare B"
                      data={advHistory.map((v) => ({ value: v.version.toString(), label: `v${v.version}` }))}
                      value={advCompareB}
                      onChange={setAdvCompareB}
                    />
                    <Button onClick={handleAdvCompare} disabled={!advCompareA || !advCompareB}>Compare</Button>
                  </Group>
                </>
              ) : (
                <Text>No history available.</Text>
              )}
            </Modal>
            <Modal opened={advCompareModal} onClose={() => setAdvCompareModal(false)} title="Version Diff" size="lg">
              {advDiff ? (
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {advDiff.map((part, idx) => (
                    <span
                      key={idx}
                      style={{ background: part.added ? '#d4fcdc' : part.removed ? '#ffd6d6' : 'none' }}
                    >
                      {part.value}
                    </span>
                  ))}
                </pre>
              ) : (
                <Text>No diff available.</Text>
              )}
            </Modal>
          </Modal>
        )}
      </Paper>
      {/* AI Tools Section */}
      <Paper shadow="xs" p="md" mt="xl">
        <Title order={3} mb="lg">AI Tools</Title>
        <Stack>
            {/* AI Prompt Section (moved from top) */}
            <Paper withBorder p="md" radius="md" style={{ background: '#f8fafd' }}>
              <Title order={4}>AI Prompt for Each Row</Title>
              <Text size="sm" c="dimmed" mb="md">
                Run a custom prompt on each row of the current document. Use `____` as a placeholder for the row's content.
              </Text>
              <Group align="flex-end" wrap="nowrap">
                <TextInput
                  label="AI Prompt (use ____ for row value)"
                  placeholder="e.g. 'Summarize ____ in one sentence.'"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.currentTarget.value)}
                  style={{ flex: 1 }}
                  disabled={aiPromptProcessing}
                />
                <Button
                  onClick={runAiForEachRow}
                  loading={aiPromptProcessing}
                  disabled={!aiPrompt.trim() || aiPromptProcessing}
                >
                  Run AI for Each Row
                </Button>
              </Group>
            </Paper>

            {/* Document Transition AI Section (re-created from screenshot) */}
            <Paper withBorder p="md" radius="md" mt="md" style={{ background: '#f8fafd' }}>
                <Title order={4}>Document Transition AI</Title>
                <Text size="sm" c="dimmed" mb="md">
                    Use AI to help transition content from one document to another. Select a source document and a target document.
                </Text>
                <Group grow align="flex-end">
                    <Select
                        label="Source Document"
                        placeholder="Select source"
                        data={docTabs.map(t => ({ value: t.id, label: t.title }))}
                        value={sourceTransitionDoc}
                        onChange={setSourceTransitionDoc}
                        searchable
                    />
                    <Select
                        label="Target Document"
                        placeholder="Select target"
                        data={docTabs.map(t => ({ value: t.id, label: t.title }))}
                        value={targetTransitionDoc}
                        onChange={setTargetTransitionDoc}
                        searchable
                    />
                    <Button
                        onClick={handleGenerateTransition}
                        loading={transitionGenerating}
                        disabled={!sourceTransitionDoc || !targetTransitionDoc || sourceTransitionDoc === targetTransitionDoc}
                    >
                        Generate Transition Guidance
                    </Button>
                </Group>
            </Paper>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ProjectDocumentsTab; 