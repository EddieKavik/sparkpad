import React, { useState } from 'react';
import { Box, Paper, Group, TextInput, Button, ActionIcon, Stack, Textarea, Menu, Text, Loader, MultiSelect, Select, Notification, Popover } from '@mantine/core';
import { IconEdit, IconTrash, IconDots, IconRobot, IconWorld, IconArrowBack } from '@tabler/icons-react';
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
              nothingFound="No options"
              disabled={translating}
              withinPortal
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
    </Box>
  );
};

export default ProjectDocumentsTab; 