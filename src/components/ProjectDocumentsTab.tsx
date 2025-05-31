import React, { useState } from 'react';
import { Box, Paper, Group, TextInput, Button, ActionIcon, Stack, Textarea, Menu, Text } from '@mantine/core';
import { IconEdit, IconTrash, IconDots, IconRobot } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import type { RefObject } from 'react';

// Define the props type
interface ProjectDocumentsTabProps {
  docTabs: { id: string; title: string }[];
  setDocTabs: (tabs: { id: string; title: string }[]) => void;
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
  handleRenameDoc: (tabId: string, newTitle: string) => Promise<void>;
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

// Accept all necessary props for state and handlers
const ProjectDocumentsTab = ({
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
  // Compute filtered and paginated tabs
  const filteredTabs = docTabs.filter(tab => tab.title.toLowerCase().includes(docSearch.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredTabs.length / DOCS_PER_PAGE));
  const paginatedTabs = docSearch
    ? filteredTabs // show all matches if searching
    : filteredTabs.slice((docPage - 1) * DOCS_PER_PAGE, docPage * DOCS_PER_PAGE);

  // Add state for renaming document
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameDocValue, setRenameDocValue] = useState("");

  return (
    <Box style={{ flex: 1, minWidth: 0, marginLeft: 32, maxWidth: 800, marginRight: 'auto' }}>
      <Paper p="md" radius={12} withBorder style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, background: styles.cardBackground, border: styles.cardBorder }}>
        <Group gap={8} style={{ flex: 1, alignItems: 'center' }}>
          <TextInput
            placeholder="Search documents..."
            value={docSearch}
            onChange={e => { setDocSearch(e.currentTarget.value); setDocPage(1); }}
            size="sm"
            style={{ minWidth: 180 }}
          />
          {paginatedTabs.map(tab => (
            <Box key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {renamingDocId === tab.id ? (
                <TextInput
                  value={renameDocValue}
                  onChange={e => setRenameDocValue(e.currentTarget.value)}
                  onBlur={async () => {
                    if (renameDocValue.trim() && renameDocValue !== tab.title) {
                      await handleRenameDoc(tab.id, renameDocValue.trim());
                    }
                    setRenamingDocId(null);
                  }}
                  onKeyDown={async e => {
                    if (e.key === 'Enter') {
                      if (renameDocValue.trim() && renameDocValue !== tab.title) {
                        await handleRenameDoc(tab.id, renameDocValue.trim());
                      }
                      setRenamingDocId(null);
                    } else if (e.key === 'Escape') {
                      setRenamingDocId(null);
                    }
                  }}
                  size="sm"
                  autoFocus
                  style={{ minWidth: 100, marginRight: 4 }}
                />
              ) : (
                <Button
                  variant={activeDocTab === tab.id ? 'filled' : 'light'}
                  color={activeDocTab === tab.id ? styles.accentColor : 'gray'}
                  size="sm"
                  onClick={() => {
                    setActiveDocTab(tab.id);
                    setAddingRowFor(null);
                  }}
                  style={{ borderRadius: 8, fontWeight: 600, paddingRight: 8, paddingLeft: 8, minWidth: 0 }}
                >
                  {tab.title}
                </Button>
              )}
              <ActionIcon size={22} variant="subtle" color="blue" onClick={() => { setRenamingDocId(tab.id); setRenameDocValue(tab.title); setEditingRow(null); setEditRowValue(''); }} title="Rename document">
                <IconEdit size={14} />
              </ActionIcon>
              <ActionIcon
                size={22}
                variant="subtle"
                color="red"
                onClick={() => handleDeleteDoc(tab.id)}
                title="Delete document"
                disabled={docTabs.length === 1}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Box>
          ))}
          <Button
            size="sm"
            variant="outline"
            color={styles.accentColor}
            onClick={async () => {
              await handleAddDocument();
              setTimeout(() => {
                const newTab = docTabs[docTabs.length - 1];
                if (newTab) {
                  setActiveDocTab(newTab.id);
                  setAddingRowFor(newTab.id);
                  setNewRowValue("");
                }
              }, 100);
            }}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            + New Document
          </Button>
          {docSearch === '' && totalPages > 1 && (
            <Group gap={4} align="center" style={{ marginLeft: 16 }}>
              <Button size="xs" variant="light" onClick={() => setDocPage(p => Math.max(1, p - 1))} disabled={docPage === 1}>Prev</Button>
              <Text size="xs" style={{ minWidth: 40, textAlign: 'center' }}>{docPage} / {totalPages}</Text>
              <Button size="xs" variant="light" onClick={() => setDocPage(p => Math.min(totalPages, p + 1))} disabled={docPage === totalPages}>Next</Button>
            </Group>
          )}
        </Group>
      </Paper>
      <Stack mt="md">
        {(docRows[activeDocTab] || []).map((row, idx) => {
          const isEditing = editingRow && editingRow.docId === activeDocTab && editingRow.idx === idx;
          const isAI = aiProcessing && aiProcessing.docId === activeDocTab && aiProcessing.idx === idx;
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
                >
                  <ReactMarkdown>{row}</ReactMarkdown>
                </Paper>
              )}
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
    </Box>
  );
};

export default ProjectDocumentsTab; 