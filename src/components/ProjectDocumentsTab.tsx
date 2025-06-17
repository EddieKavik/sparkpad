import React, { useState, useEffect } from 'react';
import { Box, Paper, Group, TextInput, Button, ActionIcon, Stack, Textarea, Menu, Text, Loader, MultiSelect, Select, Notification, Popover, Drawer, Modal, Switch, Badge, Tooltip } from '@mantine/core';
import { IconEdit, IconTrash, IconDots, IconRobot, IconWorld, IconArrowBack, IconMessagePlus, IconMessageCircle, IconSearch, IconPlus } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { RefObject } from 'react';
import { getGeminiClient } from '@/utils/gemini';

// Define the props type
interface ProjectDocumentsTabProps {
  projectId?: string;
  docTabs: { id: string; title: string; tags?: string[] }[];
  setDocTabs: (tabs: { id: string; title: string; tags?: string[] }[]) => void;
  activeDocTab: string;
  setActiveDocTab: (id: string) => void;
  docRows: { [docId: string]: string[] };
  setDocRows: (rows: { [docId: string]: string[] }) => void;
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
}: ProjectDocumentsTabProps) => {
  // Add state for renaming document
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameDocValue, setRenameDocValue] = useState("");
  
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

  return (
    <Box style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
      {/* AI Prompt Section */}
      <Paper withBorder p="md" mb="md" radius="md" style={{ background: '#f8fafd' }}>
        <Text fw={600} mb={8}>AI Prompt</Text>
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
            style={{ minWidth: 160 }}
          >
            Run AI for Each Row
          </Button>
        </Group>
      </Paper>
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
                    onClick={() => handleDeleteDoc(tab.id)}
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
            onClick={handleAddDocument}
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
                      onChange={e => setEditRowValue(e.currentTarget.value)}
                      autoFocus
                      style={{ flex: 1 }}
                      minRows={2}
                      disabled={!!isAI}
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          handleSaveEditRow();
                        }
                      }}
                      placeholder="Type your Markdown here... (Ctrl+Enter to save)"
                      ref={addRowInputRef}
                      onMouseUp={(e) => handleRowTextSelection(e, row, idx)}
                    />
                    <Button size="xs" color={styles.accentColor} onClick={handleSaveEditRow} loading={savingEdit || !!isAI} disabled={!!isAI} style={{ background: styles.buttonGradient, color: '#fff', fontWeight: 700, borderRadius: 12 }}>
                      Save
                    </Button>
                    <Button size="xs" variant="default" onClick={handleCancelEditRow} disabled={savingEdit || !!isAI} style={{ background: styles.tabBackground, color: styles.secondaryTextColor, fontWeight: 600, borderRadius: 12 }}>
                      Cancel
                    </Button>
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
                      onClick={() => handleDeleteRow(activeDocTab, idx)}
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
                  handleSaveRow(activeDocTab);
                }
              }}
              ref={addRowInputRef}
            />
            <Button size="xs" color={styles.accentColor} onClick={() => handleSaveRow(activeDocTab)} loading={savingRow} style={{ background: styles.buttonGradient, color: '#fff', fontWeight: 700, borderRadius: 12 }}>
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
              handleRenameDoc(renamingDocId, renameDocValue);
              setRenamingDocId(null);
            }
          }}
          autoFocus
        />
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={() => setRenamingDocId(null)}>Cancel</Button>
          <Button onClick={() => {
            if (renamingDocId) {
              handleRenameDoc(renamingDocId, renameDocValue);
              setRenamingDocId(null);
            }
          }}>Save</Button>
        </Group>
      </Modal>
    </Box>
  );
};

export default ProjectDocumentsTab; 