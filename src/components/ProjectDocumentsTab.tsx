import React, { useState, useEffect } from 'react';
import { Box, Paper, Group, TextInput, Button, ActionIcon, Stack, Textarea, Menu, Text, Loader, MultiSelect, Select, Notification, Popover, Drawer, Modal, Switch, Badge, Tooltip } from '@mantine/core';
import { IconEdit, IconTrash, IconDots, IconRobot, IconWorld, IconArrowBack, IconMessagePlus, IconMessageCircle } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import type { RefObject } from 'react';
import { getGeminiClient } from '@/utils/gemini';
import { MultiSelect as MantineMultiSelect, MultiSelectProps } from '@mantine/core';

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
}: ProjectDocumentsTabProps) => {
  // Add state for renaming document
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameDocValue, setRenameDocValue] = useState("");
  
  // Add state for tag filtering
  const [tagFilter, setTagFilter] = useState<string[]>([]);

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
      const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
      const rows = (docRows[docId] || []).filter(row => typeof row === "string");
      
      if (rows.length === 0) {
        showNotification({ color: 'blue', message: 'No content to translate.' });
        setTranslating(false);
        return;
      }
      
      // First translate the document title
      const docTab = docTabs.find(tab => tab.id === docId);
      if (docTab) {
        const titlePrompt = `Translate the following text to ${languageOptions.find(l => l.value === targetLang)?.label || targetLang}. Only return the translated text.\n\nText: ${docTab.title}`;
        try {
          const titleResult = await model.generateContent(titlePrompt);
          const translatedTitle = titleResult.response.text().trim();
          // Update the document title
          await handleRenameDoc(docId, translatedTitle, docTab.tags);
          showNotification({ color: 'green', message: 'Document title translated.' });
        } catch (err: any) {
          showNotification({ color: 'red', message: 'Failed to translate document title.' });
        }
      }
      
      // Then translate all rows
      const translated: string[] = [];
      for (let i = 0; i < rows.length; ++i) {
        const prompt = `Translate the following text to ${languageOptions.find(l => l.value === targetLang)?.label || targetLang}. Only return the translated text.\n\nText: ${rows[i]}`;
        try {
          const result = await model.generateContent(prompt);
          const aiText = result.response.text().trim();
          translated.push(aiText);
        } catch (err: any) {
          showNotification({ color: 'red', message: `Translation failed for row ${i + 1}.` });
          translated.push(rows[i]); // Fallback to original
        }
      }
      
      // Update the document rows
      const updatedRows = { ...docRows };
      updatedRows[docId] = translated;
      setDocRows(updatedRows);
      showNotification({ color: 'green', message: 'Document content translated successfully!' });
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

  return (
    <Box style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
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
                    {/* 1. Find all annotations for this row (by row_id and not resolved)
                        2. For each annotation, wrap the annotated text in a <span> with highlight styles and icon on hover
                        3. Render the row as a sequence of plain and highlighted spans */}
                    {row.split('').map((char, charIdx) => {
                      const annotation = annotations.find(a => a.row_id === `${idx}` && a.start_offset <= charIdx && a.end_offset > charIdx);
                      if (annotation) {
                        return (
                          <span
                            key={`${idx}-${charIdx}`}
                            style={{
                              backgroundColor: styles.highlightColor,
                              borderBottom: '1px dashed #1976d2',
                            }}
                            onClick={() => { setSidebarOpen(true); setActiveAnnotationId(annotation.annotation_id); }}
                          >
                            {char}
                          </span>
                        );
                      } else {
                        return <span key={`${idx}-${charIdx}`}>{char}</span>;
                      }
                    })}
                  </Paper>
                )}
                {/* Row comment marker and comment button */}
                <Group gap={4}>
                  {commentCount > 0 && (
                    <Tooltip label={`${commentCount} comment${commentCount > 1 ? 's' : ''} on this row`}>
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => {
                          setSidebarOpen(true);
                          // Optionally, filter/focus sidebar to this row's comments
                          // For now, just open sidebar and scroll to first annotation for this row
                          if (rowAnnotations.length > 0) {
                            setActiveAnnotationId(rowAnnotations[0].annotation_id);
                          }
                        }}
                        title="Show comments for this row"
                      >
                        <IconMessageCircle size={18} />
                        <Badge color="blue" size="xs" style={{ position: 'absolute', top: -6, right: -6 }}>{commentCount}</Badge>
                      </ActionIcon>
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
                      components={{
                        p: ({node, ...props}) => <Text size="sm" color="blue" {...props} />,
                        li: ({node, ...props}) => <li style={{ marginLeft: 16 }} {...props} />,
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
    </Box>
  );
};

export default ProjectDocumentsTab; 