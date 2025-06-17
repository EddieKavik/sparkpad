"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Container, Title, Tabs, Box, Text, Loader, Center, Group, TextInput, Button, Stack, Modal, ActionIcon, rem, Menu, Avatar, Paper, MultiSelect, Textarea, Badge, Divider, Select, Accordion, Popover } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconSettings, IconDots, IconTrash, IconArrowLeft, IconSend, IconFile, IconMoodSmile, IconRobot, IconEdit, IconSparkles, IconChevronDown, IconChevronUp, IconDownload, IconUpload, IconWorld, IconSearch, IconCalendarEvent, IconCurrencyDollar, IconUsersGroup, IconPlus, IconMicrophone, IconMicrophoneOff } from "@tabler/icons-react";
import { getGeminiClient } from "@/utils/gemini";
import { useTheme } from '@/contexts/ThemeContext';
import { useDisclosure } from '@mantine/hooks';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import FloatingAssistant from '@/components/FloatingAssistant';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { saveAs } from 'file-saver';
import AskAI from '../../../components/AskAI';
import AIInsightsPanel from '../../../components/AIInsightsPanel';
import AISentimentInsights from '../../../components/AISentimentInsights';
import AIWorkflowAutomation from '../../../components/AIWorkflowAutomation';
import AIRiskAlerts from '../../../components/AIRiskAlerts';
import { useMediaQuery } from '@mantine/hooks';
import OnboardingAssistant from '../../../components/OnboardingAssistant';
// @ts-ignore
import ProjectDocumentsTab from '../../../components/ProjectDocumentsTab';
import { PieChart, PieChartProps, BarChart, BarChartProps } from '@mantine/charts';
import { randomColor } from '@/utils/randomColor'; // If you have a color util, otherwise define a palette inline
import DirectivesHubPage from '../../directives/page';
import TargetGroupsPage from '../../directives/target-groups/page';

// Add module declarations for missing types
// @ts-ignore
// eslint-disable-next-line
declare module 'react-big-calendar';
// @ts-ignore
// eslint-disable-next-line
declare module 'file-saver';

// Helper to get up to 3 initials from a name or email
function getInitials(nameOrEmail: string) {
    // If it's an email, use the part before @
    let base = nameOrEmail;
    if (nameOrEmail.includes("@")) {
        base = nameOrEmail.split("@")[0];
    }
    // Split by space, dash, dot, or underscore
    const parts = base.split(/\s+|\.|-|_/).filter(Boolean);
    let initials = parts.map((p) => p[0]?.toUpperCase() || "").join("");
    if (initials.length > 3) initials = initials.slice(0, 3);
    return initials;
}

// Theme-specific styles
const themeStyles = {
    executive: {
        background: "#f5f7fa",
        overlay: {
            background: 'none',
            filter: 'none',
        },
        cardBackground: "#fff",
        cardBorder: "1px solid #e3e8ee",
        cardShadow: '0 2px 12px rgba(44, 62, 80, 0.06)',
        textColor: "#1a1b1e",
        secondaryTextColor: "#5c5f66",
        accentColor: "#1769aa",
        buttonGradient: { from: '#1769aa', to: '#1e88e5', deg: 90 },
        badgeColor: 'blue',
        tabBackground: '#f5f7fa',
        tabListBackground: '#fff',
        tabPanelBackground: '#fff',
    },
    classic: {
        background: "#f8f9fa",
        overlay: {
            background: 'none',
            filter: 'none',
        },
        cardBackground: "#fff",
        cardBorder: "1px solid #e9ecef",
        cardShadow: '0 2px 8px rgba(0,0,0,0.06)',
        textColor: "#1a1b1e",
        secondaryTextColor: "#868e96",
        accentColor: "#228be6",
        buttonGradient: { from: '#228be6', to: '#40c057', deg: 90 },
        badgeColor: 'blue',
        tabBackground: '#f1f3f5',
        tabListBackground: '#fff',
        tabPanelBackground: '#fff',
    },
};

// Utility to load projects from localStorage as fallback
function loadProjectsFromLocal() {
    try {
        const data = localStorage.getItem('projects:backup');
        return data ? JSON.parse(data) : [];
    } catch { return []; }
}

// Expense type for budgeting/finance
export interface Expense {
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
    linkedTaskId?: string;
    receiptUrl?: string;
}

// Task interface/type
interface Task {
    id: string;
    title: string;
    description: string;
    assignee: string;
    status: 'todo' | 'in-progress' | 'blocked' | 'done';
    priority: 'low' | 'medium' | 'high' | 'critical';
    dueDate: string;
    createdAt: string;
    updatedAt: string;
    // Budgeting fields
    budget?: number; // Optional budget allocated to this task
    expenses?: Expense[]; // Expenses for this task
}

// Document tab type
export type DocTab = { id: string; title: string; tags?: string[] };

function generateICS(tasks: Task[], projectName: string) {
    const pad = (n: number) => n < 10 ? '0' + n : n;
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    };
    let ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:SparkPad\nCALSCALE:GREGORIAN\n`;
    tasks.filter(t => t.dueDate).forEach(task => {
        ics += `BEGIN:VEVENT\nSUMMARY:${task.title}\nDESCRIPTION:${task.description || ''}\nDTSTART:${formatDate(task.dueDate)}\nDTEND:${formatDate(task.dueDate)}\nSTATUS:${task.status}\nPRIORITY:${task.priority}\nEND:VEVENT\n`;
    });
    ics += 'END:VCALENDAR';
    return ics;
}

// Utility to load document tabs from Civil Memory
async function loadDocTabsFromCivilMemory(projectId: string) {
  try {
    const userEmail = localStorage.getItem("user:username");
    if (!userEmail) return null;
    const res = await fetch(`http://localhost:3333/doctabs?mode=disk&key=${encodeURIComponent(userEmail)}:${encodeURIComponent(projectId)}`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : null;
    }
  } catch {}
  return null;
}
// Utility to save document tabs to Civil Memory
async function saveDocTabsToCivilMemory(projectId: string, tabs: DocTab[]) {
  try {
    const userEmail = localStorage.getItem("user:username");
    if (!userEmail) return;
    await fetch(`http://localhost:3333/doctabs?mode=disk&key=${encodeURIComponent(userEmail)}:${encodeURIComponent(projectId)}`,
      { method: "POST", body: JSON.stringify(tabs) });
  } catch {}
}

// Move fetchProject out of useEffect
async function fetchProject(projectId: string | string[] | undefined, setProject: any, setRenameValue: any, router: any, setLoading: any) {
    setLoading(true);
    try {
        const userEmail = localStorage.getItem("user:username");
        if (!userEmail) {
            router.replace("/login");
            return;
        }
        const res = await fetch(`/api/projects/${encodeURIComponent(String(projectId))}?userEmail=${encodeURIComponent(userEmail)}`);
        if (!res.ok) throw new Error("Failed to fetch project");
        const project = await res.json();
        if (!project || project.error) {
            throw new Error((project && project.error) || "Project not found");
        }
        setProject(project);
        setRenameValue(project.name || "");
    } catch (err: any) {
        showNotification({
            title: "Error",
            message: err.message || "Failed to fetch project",
            color: "red",
        });
    } finally {
        setLoading(false);
    }
}

// Helper to get display name from email or username
function getDisplayName(email: string) {
    // Try to get user object from localStorage if available
    try {
        const usersRaw = localStorage.getItem('users');
        if (usersRaw) {
            const users = JSON.parse(usersRaw);
            if (users && typeof users === 'object' && users[email] && users[email].name) {
                return users[email].name;
            }
        }
    } catch {}
    // Fallback: use part before @
    if (email.includes('@')) return email.split('@')[0];
    return email;
}

// IndexedDB utility for audio blobs
function openAudioDB() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('SparkPadAudio', 1);
        request.onupgradeneeded = (event) => {
            const db = request.result;
            if (!db.objectStoreNames.contains('audio')) {
                db.createObjectStore('audio');
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
async function saveAudioBlob(key: string, blob: Blob) {
    const db = await openAudioDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('audio', 'readwrite');
        tx.objectStore('audio').put(blob, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
async function getAudioBlob(key: string): Promise<Blob | null> {
    const db = await openAudioDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('audio', 'readonly');
        const req = tx.objectStore('audio').get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

// Replace saveAudioBlob and getAudioBlob for Civil Memory audio storage
async function uploadAudioToCivilMemory(key: string, blob: Blob) {
    const res = await fetch(`http://localhost:3333/audio?mode=disk&key=${encodeURIComponent(key)}`, {
        method: 'POST',
        body: blob,
    });
    if (!res.ok) throw new Error('Failed to upload audio');
    return key;
}
async function fetchAudioFromCivilMemory(key: string): Promise<Blob | null> {
    const res = await fetch(`http://localhost:3333/audio?mode=disk&key=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    // Force the correct MIME type for browser playback
    return new Blob([arrayBuffer], { type: 'audio/webm' });
}

export default function ProjectViewPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.projectId;
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [adding, setAdding] = useState(false);
    const [settingsOpened, setSettingsOpened] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const [renaming, setRenaming] = useState(false);
    // Document tabs state
    const [docTabs, setDocTabs] = useState<DocTab[]>([]);
    const [activeTab, setActiveTab] = useState("documents");
    const [activeDocTab, setActiveDocTab] = useState(docTabs[0]?.id || "default");
    // Document rows state
    const [docRows, setDocRows] = useState<{ [docId: string]: string[] }>({});
    const [addingRowFor, setAddingRowFor] = useState<string | null>(null);
    const [newRowValue, setNewRowValue] = useState("");
    const [savingRow, setSavingRow] = useState(false);
    // Add after savingRow state
    const [editingRow, setEditingRow] = useState<{ docId: string; idx: number } | null>(null);
    const [editRowValue, setEditRowValue] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);
    // AI row transformation state
    const [aiProcessing, setAiProcessing] = useState<{ docId: string; idx: number } | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    // Chat state
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [aiThinking, setAiThinking] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();
    // Force the use of the executive theme
    const styles = themeStyles['executive'] || {};
    const [researchItems, setResearchItems] = useState<any[]>([]);
    const [researchLoading, setResearchLoading] = useState(false);
    const [newResearch, setNewResearch] = useState<{ title: string; type: string; content: string; tags?: string[] }>({ title: '', type: 'web', content: '', tags: [] });
    const [editResearch, setEditResearch] = useState<any | null>(null);
    const [editResearchLoading, setEditResearchLoading] = useState(false);
    const [summarizingId, setSummarizingId] = useState<string | null>(null);
    const [newResearchFile, setNewResearchFile] = useState<File | null>(null);
    const [editResearchFile, setEditResearchFile] = useState<File | null>(null);
    const [commentInputs, setCommentInputs] = useState<{ [id: string]: string }>({});
    const [commentLoading, setCommentLoading] = useState<{ [id: string]: boolean }>({});
    const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});
    const [sortBy, setSortBy] = useState<'date' | 'title' | 'type'>('date');
    const [suggestingTags, setSuggestingTags] = useState(false);
    const [editSuggestingTags, setEditSuggestingTags] = useState(false);
    // Add state for Q&A
    const [qaQuestion, setQaQuestion] = useState("");
    const [qaAnswer, setQaAnswer] = useState("");
    const [qaLoading, setQaLoading] = useState(false);
    const [qaError, setQaError] = useState("");
    const [qaHistory, setQaHistory] = useState<{ id: string, question: string, answer: string, createdBy: string, createdAt: string }[]>([]);
    const [isFollowup, setIsFollowup] = useState(false);
    const [editQAPair, setEditQAPair] = useState<any | null>(null);
    const [editQALoading, setEditQALoading] = useState(false);
    const [qaSearch, setQaSearch] = useState("");
    // Add state for renaming document
    const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
    const [renameDocValue, setRenameDocValue] = useState("");
    // Add state for tasks
    const [tasks, setTasks] = useState<Task[]>(project?.tasks || []);
    const [newTask, setNewTask] = useState<Partial<Task>>({ title: '', description: '', assignee: '', status: 'todo', priority: 'medium', dueDate: '' });
    const [addingTask, setAddingTask] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editTask, setEditTask] = useState<Partial<Task>>({});
    // Add state for Kanban/List view toggle
    const [taskView, setTaskView] = useState<'list' | 'board'>('list');
    // Add state for files
    const [files, setFiles] = useState<any[]>(project?.files || []);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [calendarModalOpen, setCalendarModalOpen] = useState(false);
    const [calendarModalMode, setCalendarModalMode] = useState<'add' | 'edit'>('add');
    const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(null);
    const [calendarTask, setCalendarTask] = useState<Partial<Task>>({});
    const isMobile = useMediaQuery('(max-width: 768px)');
    // Add state for document search and pagination
    const [docSearch, setDocSearch] = useState("");
    const [docPage, setDocPage] = useState(1);
    const [tagFilter, setTagFilter] = useState<string[]>([]);
    const DOCS_PER_PAGE = 5; // Define how many documents to show per page

    const locales = { 'en-US': enUS };
    const localizer = dateFnsLocalizer({
        format,
        parse,
        startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
        getDay,
        locales,
    });

    const addRowInputRef = useRef<HTMLTextAreaElement | null>(null);

    // 1. Add state for finance tab
    const [financeBudget, setFinanceBudget] = useState<number>(project?.budget || 0);
    const [financeCurrency, setFinanceCurrency] = useState<string>(project?.currency || 'USD');
    const [financeExpenses, setFinanceExpenses] = useState<Expense[]>(project?.expenses || []);
    const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
    const [newExpense, setNewExpense] = useState<Partial<Expense>>({ amount: 0, date: '', description: '', category: '' });
    // Add state for AI finance Q&A
    const [financeAiQuestion, setFinanceAiQuestion] = useState('');
    const [financeAiAnswer, setFinanceAiAnswer] = useState('');
    const [financeAiLoading, setFinanceAiLoading] = useState(false);
    const [financeAiError, setFinanceAiError] = useState('');
    // Add state for AI category suggestion
    const [categorySuggesting, setCategorySuggesting] = useState(false);
    const [categorySuggestError, setCategorySuggestError] = useState('');
    // --- Add state for document transition feature ---
    const [transitionSource, setTransitionSource] = useState<string | null>(null);
    const [transitionTarget, setTransitionTarget] = useState<string | null>(null);
    const [transitionLoading, setTransitionLoading] = useState(false);
    const [transitionResult, setTransitionResult] = useState<string | null>(null);
    // Add state for sidebar controls
    const [translationLang, setTranslationLang] = useState<string | null>(null);
    const [showLangSelect, setShowLangSelect] = useState<string | null>(null);
    const [translating, setTranslating] = useState(false);
    const languageOptions = [
      { value: 'en', label: 'English' },
      { value: 'fr', label: 'French' },
      { value: 'sw', label: 'Swahili' },
      { value: 'am', label: 'Amharic' },
      { value: 'ar', label: 'Arabic' },
      { value: 'zu', label: 'Zulu' },
      { value: 'ha', label: 'Hausa' },
      { value: 'yo', label: 'Yoruba' },
    ];
    const [allResearchTags, setAllResearchTags] = useState<{ value: string; label: string }[]>([]);
    const filteredTabs = docTabs.filter(tab =>
      tab.title.toLowerCase().includes(docSearch.toLowerCase()) &&
      (tagFilter.length === 0 || (tab.tags || []).some(tag => tagFilter.includes(tag)))
    );

    // Add state for AI Prompt dropdown
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiPromptProcessing, setAiPromptProcessing] = useState(false);
    // Handler stub for running AI for each row
    const runAiForEachRow = () => {
      setAiPromptProcessing(true);
      // TODO: Implement AI logic for each row
      setTimeout(() => setAiPromptProcessing(false), 1000);
    };

    // Add a ref for the file input
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [addingResearch, setAddingResearch] = useState(false);

    // Add state for editing an expense
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [editExpenseData, setEditExpenseData] = useState<Partial<Expense>>({});

    // Add state for chat context (group or private)
    const [chatContext, setChatContext] = useState<'group' | string>('group'); // 'group' or member email

    // Add state for unread counts
    const [unreadCounts, setUnreadCounts] = useState<{ [email: string]: number }>({});

    // 1. Add state for editing and replying
    const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
    const [editMsgValue, setEditMsgValue] = useState("");
    const [replyToMsg, setReplyToMsg] = useState<any>(null);

    // Add state for voice recording
    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    // Add state for recording timer
    const [recordingTime, setRecordingTime] = useState(0);
    const MAX_RECORDING_TIME = 60; // seconds
    let recordingInterval: NodeJS.Timeout | null = null;

    const [audioURLs, setAudioURLs] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const user = localStorage.getItem("user");
        if (user) {
            try {
                const parsed = JSON.parse(user);
                setUserName(parsed.name || null);
            } catch {
                setUserName(null);
            }
        }
        fetchProject(projectId, setProject, setRenameValue, router, setLoading);
    }, [projectId, router]);

    // Load document rows from Civil Memory on mount or when projectId changes
    useEffect(() => {
        const fetchDocRowsAndTabs = async () => {
            if (!projectId || Array.isArray(projectId)) return;
            try {
                const userEmail = localStorage.getItem("user:username");
                if (!userEmail) {
                    router.replace("/login");
                    return;
                }
                // Load docRows
                const res = await fetch(`http://localhost:3333/docs?mode=disk&key=${encodeURIComponent(userEmail)}`);
                if (res.ok) {
                    let data = await res.json();
                    // MIGRATION: If data is an array, convert to object keyed by the first docTab or default
                    if (Array.isArray(data)) {
                        // Find the first docTab id, or fallback to 'default'
                        let docId = 'default';
                        if (docTabs && docTabs.length > 0) docId = docTabs[0].id;
                        data = { [docId]: data };
                        // Save migrated data
                        await fetch(`http://localhost:3333/docs?mode=disk&key=${encodeURIComponent(userEmail)}`, {
                            method: "POST",
                            body: JSON.stringify(data),
                        });
                    }
                    setDocRows(typeof data === "object" && data ? data : {});
                }
                // Load docTabs
                const tabs = await loadDocTabsFromCivilMemory(projectId);
                if (tabs && Array.isArray(tabs) && tabs.length > 0) {
                    setDocTabs(tabs);
                    setActiveDocTab(tabs[0].id);
                }
            } catch { }
        };
        fetchDocRowsAndTabs();
    }, [projectId, router]);

    // Save document rows to Civil Memory
    const saveDocRows = async (updated: { [docId: string]: string[] }) => {
        if (!projectId || Array.isArray(projectId)) return;
        const userEmail = localStorage.getItem("user:username");
        if (!userEmail) {
            router.replace("/login");
            return;
        }
        await fetch(`http://localhost:3333/docs?mode=disk&key=${encodeURIComponent(userEmail)}`, {
            method: "POST",
            body: JSON.stringify(updated),
        });
    };

    const handleAddMember = async () => {
        if (!project || !newMemberEmail) return;
        if (project.members && project.members.includes(newMemberEmail)) {
            showNotification({ title: "Already a member", message: "This user is already a member.", color: "yellow" });
            return;
        }
        setAdding(true);
        try {
            // Fetch all projects for current user
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail) {
                router.replace("/login");
                return;
            }
            const res = await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`);
            let projects = [];
            if (res.ok) {
                const text = await res.text();
                projects = text ? JSON.parse(text) : [];
                if (!Array.isArray(projects)) projects = [];
            }
            // Find and update the project
            const idx = projects.findIndex((p: any) => String(p.id) === String(projectId));
            if (idx === -1) throw new Error("Project not found");
            const updatedProject = { ...projects[idx] };
            // Ensure members is a unique array of valid emails
            updatedProject.members = Array.isArray(updatedProject.members) ? updatedProject.members : [];
            updatedProject.members = Array.from(new Set([...updatedProject.members, newMemberEmail].filter(Boolean)));
            projects[idx] = updatedProject;

            // Save back to current user's storage
            const saveRes = await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`, {
                method: "POST",
                body: JSON.stringify(projects),
            });
            if (!saveRes.ok) throw new Error("Failed to add member");

            // Fetch and update new member's projects
            const newMemberRes = await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(newMemberEmail)}`);
            let newMemberProjects = [];
            if (newMemberRes.ok) {
                const text = await newMemberRes.text();
                newMemberProjects = text ? JSON.parse(text) : [];
                if (!Array.isArray(newMemberProjects)) newMemberProjects = [];
            }
            // Avoid duplicate projects for the new member
            if (!newMemberProjects.some((p: any) => String(p.id) === String(updatedProject.id))) {
                newMemberProjects.push(updatedProject);
            } else {
                // If project exists, update its members array
                newMemberProjects = newMemberProjects.map((p: any) =>
                    String(p.id) === String(updatedProject.id) ? updatedProject : p
                );
            }
            const saveNewMemberRes = await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(newMemberEmail)}`, {
                method: "POST",
                body: JSON.stringify(newMemberProjects),
            });
            if (!saveNewMemberRes.ok) throw new Error("Failed to update new member's projects");

            setNewMemberEmail("");
            showNotification({ title: "Success", message: "Member added!", color: "green" });
            // Refresh project data so UI updates
            await fetchProject(projectId, setProject, setRenameValue, router, setLoading);
        } catch (err: any) {
            showNotification({ title: "Error", message: err.message || "Failed to add member", color: "red" });
        } finally {
            setAdding(false);
        }
    };

    const handleRename = async () => {
        if (!project || !renameValue) return;
        setRenaming(true);
        try {
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail) {
                router.replace("/login");
                return;
            }
            const res = await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`);
            if (!res.ok) throw new Error("Failed to fetch projects");
            let projects = await res.json();
            if (!Array.isArray(projects) || projects.length === 0) {
                projects = loadProjectsFromLocal();
            }
            const idx = projects.findIndex((p: any) => String(p.id).trim() === String(projectId).trim());
            if (idx === -1) {
                console.error('Project not found. projectId:', projectId, 'projects:', projects.map((p: any) => p.id));
                throw new Error("Project not found");
            }
            const updatedProject = { ...projects[idx], name: renameValue };
            projects[idx] = updatedProject;
            const saveRes = await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`, {
                method: "POST",
                body: JSON.stringify(projects),
            });
            if (!saveRes.ok) throw new Error("Failed to rename project");
            setProject(updatedProject);
            setSettingsOpened(false);
            showNotification({ title: "Success", message: "Project renamed!", color: "green" });
        } catch (err: any) {
            showNotification({ title: "Error", message: err.message || "Failed to rename project", color: "red" });
        } finally {
            setRenaming(false);
        }
    };

    const handleRemoveMember = async (emailToRemove: string) => {
        if (!project) return;
        if (!Array.isArray(project.members) || project.members.length <= 1) {
            showNotification({ title: "Error", message: "A project must have at least one member.", color: "red" });
            return;
        }
        try {
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail) {
                router.replace("/login");
                return;
            }
            const res = await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`);
            if (!res.ok) throw new Error("Failed to fetch projects");
            const projects = await res.json();
            const idx = projects.findIndex((p: any) => String(p.id) === String(projectId));
            if (idx === -1) throw new Error("Project not found");
            const updatedProject = { ...projects[idx] };
            updatedProject.members = updatedProject.members.filter((email: string) => email !== emailToRemove);
            projects[idx] = updatedProject;
            const saveRes = await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`, {
                method: "POST",
                body: JSON.stringify(projects),
            });
            if (!saveRes.ok) throw new Error("Failed to remove member");
            setProject(updatedProject);
            showNotification({ title: "Success", message: "Member removed!", color: "green" });
        } catch (err: any) {
            showNotification({ title: "Error", message: err.message || "Failed to remove member", color: "red" });
        }
    };

    const handleAddDocument = async () => {
        try {
            if (!projectId || Array.isArray(projectId)) throw new Error("Invalid projectId");
            const newId = `doc-${Date.now()}`;
            const tabsWithTags = docTabs.map(t => ({ ...t, tags: t.tags ?? [] }));
            const newTabs = [
                ...tabsWithTags,
                { id: newId, title: "Untitled Document", tags: [] }
            ];
            setDocTabs(newTabs);
            await saveDocTabsToCivilMemory(projectId, newTabs);
            const updatedRows = {
                ...docRows,
                [newId]: []
            };
            setDocRows(updatedRows);
            await saveDocRows(updatedRows);
            setActiveDocTab(newId);
            setAddingRowFor(newId); // Immediately show add row for new doc
            setNewRowValue("");
            showNotification({ title: "Success", message: "New document created!", color: "green" });
        } catch (err: any) {
            showNotification({ title: "Error", message: err.message || "Failed to create document", color: "red" });
        }
    };

    const handleRenameDoc = async (tabId: string, newTitle: string, newTags?: string[]) => {
        if (!projectId || Array.isArray(projectId)) return;
        const tabsWithTags = docTabs.map(t => ({ ...t, tags: t.tags ?? [] }));
        const newTabs = tabsWithTags.map(t => t.id === tabId ? { ...t, title: newTitle, tags: newTags ?? t.tags ?? [] } : t);
        setDocTabs(newTabs);
        await saveDocTabsToCivilMemory(projectId, newTabs);
    };

    const handleDeleteDoc = async (tabId: string) => {
        if (docTabs.length === 1) {
            showNotification({ title: 'Cannot delete', message: 'At least one document must exist.', color: 'red' });
            return;
        }
        if (!projectId || Array.isArray(projectId)) return;
        if (window.confirm('Delete this document and all its rows?')) {
            const newTabs = docTabs.filter(t => t.id !== tabId);
            setDocTabs(newTabs);
            await saveDocTabsToCivilMemory(projectId, newTabs);
            const newRows = { ...docRows };
            delete newRows[tabId];
            setDocRows(newRows);
            await saveDocRows(newRows);
            if (activeDocTab === tabId) {
                const nextTab = newTabs[0];
                if (nextTab) setActiveDocTab(nextTab.id);
            }
        }
    };

    // Add row handlers
    const handleAddRow = (docId: string) => {
        setAddingRowFor(docId);
        setNewRowValue("");
    };
    const handleSaveRow = async (docId: string) => {
        if (!newRowValue.trim()) return;
        setSavingRow(true);
        const updated = {
            ...docRows,
            [docId]: [...(docRows[docId] || []), newRowValue.trim()],
        };
        setDocRows(updated);
        setAddingRowFor(null);
        setNewRowValue("");
        await saveDocRows(updated);
        setSavingRow(false);
        showNotification({ title: "Row added", message: "Row saved to document.", color: "green" });
    };
    const handleCancelRow = () => {
        setAddingRowFor(null);
        setNewRowValue("");
    };

    const handleDeleteRow = async (docId: string, rowIdx: number) => {
        const updatedRows = {
            ...docRows,
            [docId]: (docRows[docId] || []).filter((_, idx) => idx !== rowIdx),
        };
        setDocRows(updatedRows);
        await saveDocRows(updatedRows);
        showNotification({ title: "Row deleted", message: "Row removed from document.", color: "red" });
    };

    // Edit row handlers
    const handleStartEditRow = (docId: string, idx: number, value: string) => {
        setEditingRow({ docId, idx });
        setEditRowValue(value);
    };
    const handleSaveEditRow = async () => {
        if (!editingRow) return;
        setSavingEdit(true);
        const { docId, idx } = editingRow;
        const updatedRows = {
            ...docRows,
            [docId]: (docRows[docId] || []).map((row, i) => (i === idx ? editRowValue : row)),
        };
        setDocRows(updatedRows);
        setEditingRow(null);
        setEditRowValue("");
        await saveDocRows(updatedRows);
        setSavingEdit(false);
        showNotification({ title: "Row updated", message: "Row changes saved.", color: "green" });
    };
    const handleCancelEditRow = () => {
        setEditingRow(null);
        setEditRowValue("");
    };

    // AI transform handler
    const handleAiTransformRow = async (docId: string, idx: number, value: string) => {
        setAiProcessing({ docId, idx });
        try {
            // Use Gemini to transform the text
            const gemini = getGeminiClient();
            const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(value);
            const aiText = result.response.text().trim();
            console.log("Gemini raw response:", result.response);
            console.log("Gemini aiText:", aiText);
            if (!aiText) throw new Error("No AI response");
            const updatedRows = {
                ...docRows,
                [docId]: (docRows[docId] || []).map((row, i) => (i === idx ? aiText : row)),
            };
            setDocRows(updatedRows);
            setEditingRow(null);
            setEditRowValue("");
            await saveDocRows(updatedRows);
            showNotification({ title: "AI updated row", message: `Row: ${aiText}`, color: "green" });
        } catch (err: any) {
            showNotification({ title: "Error", message: err.message || "AI transformation failed.", color: "red" });
        } finally {
            setAiProcessing(null);
        }
    };

    // Fetch chat messages for this project
    useEffect(() => {
        const fetchChat = async () => {
            if (!projectId) return;
            const pid = Array.isArray(projectId) ? projectId[0] : projectId;
            if (!pid) return;
            try {
                const userEmail = localStorage.getItem("user:username");
                if (!userEmail) return;
                let chatKey = '';
                if (chatContext === 'group') {
                    chatKey = pid;
                } else {
                    // Private chat: key is private:<sortedEmail1>:<sortedEmail2>:<projectId>
                    const emails = [userEmail, chatContext].sort();
                    chatKey = `private:${emails[0]}:${emails[1]}:${pid}`;
                }
                const res = await fetch(`http://localhost:3333/chat?mode=disk&key=${encodeURIComponent(chatKey)}`);
                if (res.ok) {
                    const data = await res.json();
                    setChatMessages(Array.isArray(data) ? data : []);
                } else {
                    setChatMessages([]);
                }
            } catch {
                setChatMessages([]);
            }
        };
        fetchChat();
        const interval = setInterval(fetchChat, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [projectId, chatContext]);

    // Scroll to bottom on new message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // Send chat message
    const sendMessage = async (content: string, type: string = "text", fileUrl?: string) => {
        if (!content.trim() && !fileUrl) return;
        setSending(true);
        const pid = Array.isArray(projectId) ? projectId[0] : projectId;
        if (!pid) { setSending(false); return; }
        try {
            const userEmail = localStorage.getItem("user:username");
            const user = localStorage.getItem("user");
            const senderName = user ? JSON.parse(user).name : userEmail;
            let chatKey = '';
            if (chatContext === 'group') {
                chatKey = pid;
            } else {
                const emails = [userEmail, chatContext].sort();
                chatKey = `private:${emails[0]}:${emails[1]}:${pid}`;
            }
            const newMsg = {
                id: Date.now(),
                sender: userEmail,
                senderName,
                timestamp: new Date().toISOString(),
                content,
                type,
                fileUrl,
                replyTo: replyToMsg ? { id: replyToMsg.id, content: replyToMsg.content } : undefined,
                reactions: []
            };
            const updated = [...chatMessages, newMsg];
            setChatMessages(updated);
            await fetch(`http://localhost:3333/chat?mode=disk&key=${encodeURIComponent(chatKey)}`,
                {
                method: "POST",
                body: JSON.stringify(updated),
            });
            setChatInput("");

            // Only notify all project members in group chat
            if (chatContext === 'group' && project && Array.isArray(project.members)) {
                const notificationPromises = project.members
                    .filter((memberEmail: string) => memberEmail !== userEmail)
                    .map(async (memberEmail: string) => {
                        try {
                            // Fetch existing notifications for the member
                            const res = await fetch(`http://localhost:3333/notifications?mode=disk&key=${encodeURIComponent(memberEmail)}`);
                            let existingNotifications = [];
                            if (res.ok) {
                                const data = await res.json();
                                if (Array.isArray(data)) {
                                    existingNotifications = data;
                                }
                            }

                            // Create new notification
                            const newNotification = {
                                id: Date.now(),
                                type: 'chat',
                                projectName: project.name,
                                projectId: projectId,
                                senderName,
                                message: content,
                                timestamp: new Date().toISOString(),
                                read: false
                            };

                            // Add to beginning of notifications array
                            const updatedNotifications = [newNotification, ...existingNotifications];

                            // Save updated notifications
                            await fetch(`http://localhost:3333/notifications?mode=disk&key=${encodeURIComponent(memberEmail)}`, {
                                method: "POST",
                                body: JSON.stringify(updatedNotifications)
                            });
                        } catch (error) {
                            console.error(`Failed to send notification to ${memberEmail}:`, error);
                        }
                    });

                // Wait for all notifications to be sent
                await Promise.all(notificationPromises);
            }

            // AI integration: if message starts with /ai or Ask AI button is used
            if (content.trim().toLowerCase().startsWith("/ai")) {
                setAiThinking(true);
                const aiPrompt = content.replace(/^\/ai\s*/i, "").trim();
                try {
                    const gemini = getGeminiClient();
                    const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
                    const result = await model.generateContent(aiPrompt);
                    const aiText = result.response.text().trim();
                    const aiMsg = {
                        id: Date.now() + 1,
                        sender: "ai",
                        senderName: "AI Assistant",
                        timestamp: new Date().toISOString(),
                        content: aiText,
                        type: "ai",
                        reactions: []
                    };
                    const updatedWithAI = [...chatMessages, aiMsg];
                    setChatMessages(updatedWithAI);
                    await fetch(`http://localhost:3333/chat?mode=disk&key=${encodeURIComponent(chatKey)}`, {
                        method: "POST",
                        body: JSON.stringify(updatedWithAI),
                    });
                } catch {
                    showNotification({ title: "AI Error", message: "AI could not respond.", color: "red" });
                } finally {
                    setAiThinking(false);
                }
            }
        } catch {
            showNotification({ title: "Error", message: "Failed to send message.", color: "red" });
        } finally {
            setSending(false);
        }
        setReplyToMsg(null);
    };

    // File upload handler (stub, implement as needed)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // TODO: Implement file upload logic (to server or cloud storage), then call sendMessage with fileUrl
        // For now, just show a notification
        showNotification({ title: "File Upload", message: "File upload coming soon!", color: "blue" });
    };

    // Add reaction to a message
    const addReaction = async (msgId: number, emoji: string) => {
        const updated = chatMessages.map(msg =>
            msg.id === msgId ? { ...msg, reactions: [...(msg.reactions || []), emoji] } : msg
        );
        setChatMessages(updated);
        const pid = Array.isArray(projectId) ? projectId[0] : projectId;
        if (!pid) return;
        await fetch(`http://localhost:3333/chat?mode=disk&key=${encodeURIComponent(pid)}`, {
            method: "POST",
            body: JSON.stringify(updated),
        });
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/login");
    };

    const fetchResearchItems = async () => {
        if (!projectId) return;
        setResearchLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/research`);
            if (res.ok) {
                const data = await res.json();
                setResearchItems(data);
            }
        } finally {
            setResearchLoading(false);
        }
    };

    useEffect(() => {
        fetchResearchItems();
    // eslint-disable-next-line
    }, [projectId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (f: File | null) => void) => {
        const file = e.target.files?.[0] || null;
        setFile(file);
    };

    const handleAddResearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newResearch.title.trim() || !newResearch.content.trim()) return;

        let fileUrl = undefined;
        if (newResearchFile) {
            fileUrl = await fileToDataUrl(newResearchFile);
        }

        const res = await fetch(`/api/projects/${projectId}/research`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...newResearch,
                fileUrl,
                createdBy: userName || 'anonymous',
            }),
        });

        if (res.ok) {
            setNewResearch({ title: '', type: 'web', content: '', tags: [] });
            setNewResearchFile(null);
            fetchResearchItems();
        }
    };

    const handleEditResearch = (item: any) => setEditResearch(item);
    const handleCancelEditResearch = () => setEditResearch(null);

    const handleSaveEditResearch = async () => {
        if (!editResearch) return;
        setEditResearchLoading(true);

        let fileUrl = editResearch.fileUrl;
        if (editResearchFile) {
            fileUrl = await fileToDataUrl(editResearchFile);
        }

        const res = await fetch(`/api/projects/${projectId}/research?id=${editResearch.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...editResearch, fileUrl }),
        });
        setEditResearchLoading(false);
        if (res.ok) {
            setEditResearch(null);
            setEditResearchFile(null);
            fetchResearchItems();
            showNotification({ title: 'Updated', message: 'Research item updated.', color: 'green' });
        }
    };

    const handleDeleteResearch = async (id: string) => {
        if (!window.confirm('Delete this research item?')) return;
        const res = await fetch(`/api/projects/${projectId}/research?id=${id}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            fetchResearchItems();
            showNotification({ title: 'Deleted', message: 'Research item deleted.', color: 'red' });
        }
    };

    const handleSummarizeResearch = async (item: any) => {
        setSummarizingId(item.id);
        try {
            const gemini = getGeminiClient();
            const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `Summarize the following research for a project team in 2-3 sentences.\n\nTitle: ${item.title}\nType: ${item.type}\nContent: ${item.content}`;
            const result = await model.generateContent(prompt);
            const summary = result.response.text().trim();
            if (!summary) throw new Error("No summary generated");

            // Save summary to item (send full item)
            const res = await fetch(`/api/projects/${projectId}/research?id=${item.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...item, summary }),
            });
            if (res.ok) {
                fetchResearchItems();
                showNotification({ title: 'AI Summary Added', message: 'Summary generated and saved.', color: 'green' });
            } else {
                showNotification({ title: 'Error', message: 'Failed to save summary.', color: 'red' });
            }
        } catch (err: any) {
            showNotification({ title: 'AI Error', message: err.message || 'Failed to generate summary.', color: 'red' });
        } finally {
            setSummarizingId(null);
        }
    };


    function fileToDataUrl(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    const handleAddComment = async (item: any) => {
        const comment = (commentInputs[item.id] || '').trim();
        if (!comment) return;

        setCommentLoading(l => ({ ...l, [item.id]: true }));

        const newComment = {
            id: Date.now().toString(),
            author: userName || 'anonymous',
            content: comment,
            createdAt: new Date().toISOString(),
        };

        const updatedComments = [...(item.annotations || []), newComment];

        const res = await fetch(`/api/projects/${projectId}/research?id=${item.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...item, annotations: updatedComments }),
        });
        setCommentLoading(l => ({ ...l, [item.id]: false }));
        if (res.ok) {
            setCommentInputs(inputs => ({ ...inputs, [item.id]: '' }));
            fetchResearchItems();
        }
    };

    const handleDeleteComment = async (item: any, commentId: string) => {
        const updatedComments = (item.annotations || []).filter((c: any) => c.id !== commentId);
        const res = await fetch(`/api/projects/${projectId}/research?id=${item.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...item, annotations: updatedComments }),
        });
        if (res.ok) fetchResearchItems();
    };

    const sortedResearchItems = [...(researchItems as any[])].sort((a: any, b: any) => {
        if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
        if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '');
        return 0;
    });

    const handleSuggestTags = async () => {
        setSuggestingTags(true);
        try {
            const gemini = getGeminiClient();
            const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `Suggest 3-5 concise, relevant tags (as a comma-separated list) for the following research item.\nTitle: ${newResearch.title}\nType: ${newResearch.type}\nContent: ${newResearch.content}`;
            const result = await model.generateContent(prompt);
            const tags = result.response.text().split(/,|\n/).map(t => t.trim()).filter(Boolean);
            setNewResearch((r: any) => ({ ...r, tags: Array.from(new Set([...(r.tags || []), ...tags])) }));
        } catch (err: any) {
            showNotification({ title: 'AI Error', message: err.message || 'Failed to suggest tags.', color: 'red' });
        } finally {
            setSuggestingTags(false);
        }
    };

    const handleEditSuggestTags = async () => {
        setEditSuggestingTags(true);
        try {
            const gemini = getGeminiClient();
            const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `Suggest 3-5 concise, relevant tags (as a comma-separated list) for the following research item.\nTitle: ${editResearch.title}\nType: ${editResearch.type}\nContent: ${editResearch.content}`;
            const result = await model.generateContent(prompt);
            const tags = result.response.text().split(/,|\n/).map(t => t.trim()).filter(Boolean);
            setEditResearch((r: any) => ({ ...r, tags: Array.from(new Set([...(r.tags || []), ...tags])) }));
        } catch (err: any) {
            showNotification({ title: 'AI Error', message: err.message || 'Failed to suggest tags.', color: 'red' });
        } finally {
            setEditSuggestingTags(false);
        }
    };

    // Q&A Functions
    const handleAskQuestion = async (isFollowupQuestion: boolean = false) => {
        if (!qaQuestion.trim()) {
            setQaError("Please enter a question.");
            return;
        }
        setQaLoading(true);
        setQaError("");

        try {
            const gemini = getGeminiClient();
            const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });

            // Combine all document rows into a single context string
            const contextRows = Object.values(docRows).flat();
            const context = contextRows.length > 0 ? `Context documents:\n${contextRows.join('\n')}\n\n` : "";

            // Prepare chat history for follow-up questions
            let historyPrompt = "";
            if (isFollowupQuestion && qaHistory.length > 0) {
                historyPrompt = qaHistory.map(entry => `User: ${entry.question}\nAI: ${entry.answer}`).join('\n') + '\n';
            }

            const prompt = `${context}${historyPrompt}Based on the provided context (if any), answer the following question: ${qaQuestion}`;
            const result = await model.generateContent(prompt);
            const answer = result.response.text().trim();

            if (answer) {
                setQaAnswer(answer);
                const newQAPair = {
                    id: Date.now().toString(),
                    question: qaQuestion,
                    answer: answer,
                    createdBy: userName || 'anonymous',
                    createdAt: new Date().toISOString()
                };
                setQaHistory(prev => [...prev, newQAPair]);
                setQaQuestion(""); // Clear question after answering
                setIsFollowup(true); // Enable follow-up questions
            } else {
                setQaError("Could not generate an answer. Please try rephrasing your question or provide more context.");
            }
        } catch (err: any) {
            console.error("Q&A AI Error:", err);
            setQaError(`Failed to get an answer from AI: ${err.message || 'Unknown error'}`);
        } finally {
            setQaLoading(false);
        }
    };

    const handleEditQAPair = (pair: any) => {
        setEditQAPair(pair);
        setQaQuestion(pair.question);
        setQaAnswer(pair.answer);
    };

    const handleSaveEditQAPair = async () => {
        if (!editQAPair || !qaQuestion.trim() || !qaAnswer.trim()) {
            showNotification({ title: 'Error', message: 'Question and Answer cannot be empty.', color: 'red' });
            return;
        }

        setEditQALoading(true);
        try {
            const updatedHistory = qaHistory.map(pair =>
                pair.id === editQAPair.id
                    ? { ...pair, question: qaQuestion.trim(), answer: qaAnswer.trim(), updatedAt: new Date().toISOString() }
                    : pair
            );
            setQaHistory(updatedHistory);
            showNotification({ title: 'Success', message: 'Q&A pair updated!', color: 'green' });
            setEditQAPair(null);
            setQaQuestion("");
            setQaAnswer("");
        } catch (error) {
            showNotification({ title: 'Error', message: 'Failed to save Q&A pair.', color: 'red' });
        } finally {
            setEditQALoading(false);
        }
    };

    const handleDeleteQAPair = (id: string) => {
        if (window.confirm('Are you sure you want to delete this Q&A pair?')) {
            setQaHistory(qaHistory.filter(pair => pair.id !== id));
            showNotification({ title: 'Deleted', message: 'Q&A pair deleted.', color: 'red' });
        }
    };

    const handleCancelEditQAPair = () => {
        setEditQAPair(null);
        setQaQuestion("");
        setQaAnswer("");
    };

    const filteredQaHistory = qaHistory.filter(pair =>
        pair.question.toLowerCase().includes(qaSearch.toLowerCase()) ||
        pair.answer.toLowerCase().includes(qaSearch.toLowerCase())
    );

    // Tasks handlers
    const saveTasks = async (updatedTasks: Task[]) => {
        if (!projectId || Array.isArray(projectId)) return;
        const userEmail = localStorage.getItem("user:username");
        if (!userEmail) {
            router.replace("/login");
            return;
        }
        try {
            const res = await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`);
            if (!res.ok) throw new Error("Failed to fetch projects");
            let projects = await res.json();
            const idx = projects.findIndex((p: any) => String(p.id).trim() === String(projectId).trim());
            if (idx === -1) throw new Error("Project not found");
            const updatedProject = { ...projects[idx], tasks: updatedTasks };
            projects[idx] = updatedProject;
            await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`, {
                method: "POST",
                body: JSON.stringify(projects),
            });
            setTasks(updatedTasks);
            setProject(updatedProject); // Update project context
        } catch (err: any) {
            showNotification({ title: "Error", message: err.message || "Failed to save tasks", color: "red" });
        }
    };

    const handleAddTask = async () => {
        if (!newTask.title) {
            showNotification({ title: 'Error', message: 'Task title is required.', color: 'red' });
            return;
        }
        setAddingTask(true);
        const now = new Date().toISOString();
        const fullNewTask: Task = {
            id: Date.now().toString(),
            title: newTask.title,
            description: newTask.description || '',
            assignee: newTask.assignee || '',
            status: newTask.status || 'todo',
            priority: newTask.priority || 'medium',
            dueDate: newTask.dueDate || '',
            createdAt: now,
            updatedAt: now,
        };
        await saveTasks([...tasks, fullNewTask]);
        setNewTask({ title: '', description: '', assignee: '', status: 'todo', priority: 'medium', dueDate: '' });
        setAddingTask(false);
        showNotification({ title: 'Task Added', message: `Task "${fullNewTask.title}" added.`, color: 'green' });
    };

    const handleEditTask = (task: Task) => {
        setEditingTaskId(task.id);
        setEditTask({ ...task });
    };

    const handleSaveTask = async () => {
        if (!editTask.id || !editTask.title) {
            showNotification({ title: 'Error', message: 'Task title is required.', color: 'red' });
            return;
        }
        const updatedTasks = tasks.map(task =>
            task.id === editTask.id ? { ...task, ...editTask, updatedAt: new Date().toISOString() } : task
        );
        await saveTasks(updatedTasks);
        setEditingTaskId(null);
        setEditTask({});
        showNotification({ title: 'Task Updated', message: `Task "${editTask.title}" updated.`, color: 'green' });
    };

    const handleDeleteTask = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            const updatedTasks = tasks.filter(task => task.id !== id);
            await saveTasks(updatedTasks);
            showNotification({ title: 'Task Deleted', message: 'Task removed.', color: 'red' });
        }
    };

    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;

        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return; // No change in position
        }

        const updatedTasks = Array.from(tasks);
        const [movedTask] = updatedTasks.splice(source.index, 1);
        updatedTasks.splice(destination.index, 0, movedTask);

        // Update status if moved to a different column in Kanban view
        if (taskView === 'board' && destination.droppableId !== source.droppableId) {
            const newStatus = destination.droppableId as Task['status'];
            movedTask.status = newStatus;
            movedTask.updatedAt = new Date().toISOString();
        }

        await saveTasks(updatedTasks);
    };

    // Files tab handlers
    const handleFileDownload = (file: any) => {
        try {
            const byteCharacters = atob(file.dataUrl.split(',')[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: file.mimeType });
            saveAs(blob, file.name);
            showNotification({ title: 'Download Successful', message: `Downloaded ${file.name}`, color: 'green' });
        } catch (error) {
            console.error("Error downloading file:", error);
            showNotification({ title: 'Download Failed', message: `Could not download ${file.name}.`, color: 'red' });
        }
    };

    const handleFileDelete = async (fileId: string) => {
        if (window.confirm('Are you sure you want to delete this file?')) {
            try {
                const updatedFiles = files.filter(f => f.id !== fileId);
                const userEmail = localStorage.getItem("user:username");
                if (!userEmail || !projectId || Array.isArray(projectId)) throw new Error("Authentication or project ID missing.");

                const res = await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`);
                if (!res.ok) throw new Error("Failed to fetch projects");
                let projects = await res.json();
                const idx = projects.findIndex((p: any) => String(p.id).trim() === String(projectId).trim());
                if (idx === -1) throw new Error("Project not found.");

                projects[idx] = { ...projects[idx], files: updatedFiles };

                await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`, {
                    method: "POST",
                    body: JSON.stringify(projects),
                });
                setFiles(updatedFiles);
                showNotification({ title: 'File Deleted', message: 'File removed successfully.', color: 'red' });
            } catch (error: any) {
                console.error("Error deleting file:", error);
                setUploadError(error.message || "Failed to delete file.");
                showNotification({ title: 'Deletion Failed', message: error.message || 'Failed to delete file.', color: 'red' });
            }
        }
    };

    const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadError(null);

        try {
            const dataUrl = await fileToDataUrl(file);
            const newFile = {
                id: Date.now().toString(),
                name: file.name,
                mimeType: file.type,
                size: file.size,
                dataUrl: dataUrl, // Store as base64 data URL
                uploadedAt: new Date().toISOString(),
                uploadedBy: userName || 'anonymous',
            };

            const updatedFiles = [...files, newFile];
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail || !projectId || Array.isArray(projectId)) throw new Error("Authentication or project ID missing.");

            const res = await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`);
            if (!res.ok) throw new Error("Failed to fetch projects");
            let projects = await res.json();
            const idx = projects.findIndex((p: any) => String(p.id).trim() === String(projectId).trim());
            if (idx === -1) throw new Error("Project not found.");

            projects[idx] = { ...projects[idx], files: updatedFiles };

            await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`, {
                method: "POST",
                body: JSON.stringify(projects),
            });
            setFiles(updatedFiles);
            showNotification({ title: 'Upload Successful', message: `${file.name} uploaded.`, color: 'green' });
        } catch (error: any) {
            console.error("Error uploading file:", error);
            setUploadError(error.message || "Failed to upload file.");
            showNotification({ title: 'Upload Failed', message: error.message || 'Failed to upload file.', color: 'red' });
        } finally {
            setUploading(false);
            e.target.value = ''; // Clear file input
        }
    };

    // Calendar Event handlers
    const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
        setCalendarModalMode('add');
        setCalendarSelectedDate(start);
        setCalendarTask({
            title: '',
            description: '',
            assignee: '',
            status: 'todo',
            priority: 'medium',
            dueDate: start.toISOString().split('T')[0], // Format YYYY-MM-DD
        });
        setCalendarModalOpen(true);
    };

    const handleSelectEvent = (event: any) => {
        setCalendarModalMode('edit');
        setCalendarTask(tasks.find(t => t.id === event.id) || {});
        setCalendarModalOpen(true);
    };

    const handleCalendarTaskSubmit = async () => {
        if (!calendarTask.title) {
            showNotification({ title: 'Error', message: 'Task title is required.', color: 'red' });
            return;
        }

        const now = new Date().toISOString();
        if (calendarModalMode === 'add') {
            const newTaskItem: Task = {
                id: Date.now().toString(),
                title: calendarTask.title,
                description: calendarTask.description || '',
                assignee: calendarTask.assignee || '',
                status: calendarTask.status || 'todo',
                priority: calendarTask.priority || 'medium',
                dueDate: calendarTask.dueDate || '',
                createdAt: now,
                updatedAt: now,
            };
            await saveTasks([...tasks, newTaskItem]);
            showNotification({ title: 'Task Added', message: `Calendar task "${newTaskItem.title}" added.`, color: 'green' });
        } else {
            // Edit mode
            if (!calendarTask.id) return;
            const updatedTasks = tasks.map(t =>
                t.id === calendarTask.id ? { ...t, ...calendarTask, updatedAt: now } : t
            );
            await saveTasks(updatedTasks);
            showNotification({ title: 'Task Updated', message: `Calendar task "${calendarTask.title}" updated.`, color: 'green' });
        }
        setCalendarModalOpen(false);
        setCalendarTask({});
    };

    const handleDeleteCalendarTask = async () => {
        if (!calendarTask.id) return;
        if (window.confirm('Are you sure you want to delete this calendar task?')) {
            const updatedTasks = tasks.filter(t => t.id !== calendarTask.id);
            await saveTasks(updatedTasks);
            showNotification({ title: 'Task Deleted', message: 'Calendar task removed.', color: 'red' });
            setCalendarModalOpen(false);
            setCalendarTask({});
        }
    };

    const calendarEvents = tasks
        .filter(t => t.dueDate)
        .map(t => ({
            id: t.id,
            title: t.title,
            start: new Date(t.dueDate),
            end: new Date(t.dueDate), // For full-day events
            allDay: true,
            resource: t, // Keep a reference to the original task object
        }));

    // Finance Tab handlers
    const saveFinance = async (updatedFinance: { budget: number, currency: string, expenses: Expense[] }) => {
        if (!projectId || Array.isArray(projectId)) return;
        const userEmail = localStorage.getItem("user:username");
        if (!userEmail) {
            router.replace("/login");
            return;
        }
        try {
            const res = await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`);
            if (!res.ok) throw new Error("Failed to fetch projects");
            let projects = await res.json();
            const idx = projects.findIndex((p: any) => String(p.id).trim() === String(projectId).trim());
            if (idx === -1) throw new Error("Project not found");
            // Update project with new budget/currency/expenses
            const updatedProject = { ...projects[idx], ...updatedFinance };
            projects[idx] = updatedProject;
            await fetch(`http://localhost:3333/?mode=disk&key=projects:${encodeURIComponent(userEmail)}`, {
                method: "POST",
                body: JSON.stringify(projects),
            });
            setFinanceBudget(updatedFinance.budget);
            setFinanceCurrency(updatedFinance.currency);
            setFinanceExpenses(updatedFinance.expenses);
            setProject(updatedProject); // Update project context
        } catch (err: any) {
            showNotification({ title: "Error", message: err.message || "Failed to save finance data", color: "red" });
        }
    };

    const handleAddExpense = async () => {
        if (!newExpense.description || !newExpense.amount || !newExpense.date || !newExpense.category) {
            showNotification({ title: 'Error', message: 'All expense fields are required.', color: 'red' });
            return;
        }
        const fullNewExpense: Expense = {
            id: Date.now().toString(),
            description: newExpense.description,
            amount: parseFloat(newExpense.amount.toString()),
            date: newExpense.date,
            category: newExpense.category,
            linkedTaskId: newExpense.linkedTaskId,
            receiptUrl: newExpense.receiptUrl,
        };
        const updatedExpenses = [...financeExpenses, fullNewExpense];
        await saveFinance({ budget: financeBudget, currency: financeCurrency, expenses: updatedExpenses });
        setNewExpense({ amount: 0, date: '', description: '', category: '' });
        setAddExpenseModalOpen(false);
        showNotification({ title: 'Expense Added', message: `Expense "${fullNewExpense.description}" added.`, color: 'green' });
    };

    const handleDeleteExpense = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this expense?')) {
            const updatedExpenses = financeExpenses.filter(exp => exp.id !== id);
            await saveFinance({ budget: financeBudget, currency: financeCurrency, expenses: updatedExpenses });
            showNotification({ title: 'Expense Deleted', message: 'Expense removed.', color: 'red' });
        }
    };

    const handleAskFinanceAi = async () => {
        if (!financeAiQuestion.trim()) {
            showNotification({ title: 'Error', message: 'Please enter a question for AI.', color: 'red' });
            return;
        }
        setFinanceAiLoading(true);
        setFinanceAiError('');
        try {
            const gemini = getGeminiClient();
            const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });

            const financeContext = `Current Budget: ${financeBudget} ${financeCurrency}\nExpenses:\n${financeExpenses.map(e => `- ${e.description}: ${e.amount} ${financeCurrency} (${e.category} on ${e.date})`).join('\n')}\n`;

            const prompt = `Based on the following finance data, answer the question:\n\n${financeContext}\nQuestion: ${financeAiQuestion}`;
            const result = await model.generateContent(prompt);
            const answer = result.response.text().trim();
            setFinanceAiAnswer(answer);
        } catch (err: any) {
            setFinanceAiError(`Failed to get AI response: ${err.message || 'Unknown error'}`);
        } finally {
            setFinanceAiLoading(false);
        }
    };

    const handleSuggestCategory = async () => {
        if (!newExpense.description || !newExpense.amount) {
            showNotification({ title: 'Error', message: 'Please provide description and amount to suggest category.', color: 'red' });
            return;
        }
        setCategorySuggesting(true);
        setCategorySuggestError('');
        try {
            const gemini = getGeminiClient();
            const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `Suggest a single, concise category for the expense: "${newExpense.description}" with amount ${newExpense.amount}. Example categories: "Travel", "Software", "Marketing", "Utilities", "Salaries". Respond with only the category name.`;
            const result = await model.generateContent(prompt);
            const category = result.response.text().trim();
            setNewExpense(prev => ({ ...prev, category }));
            showNotification({ title: 'Category Suggested', message: `Suggested category: ${category}`, color: 'green' });
        } catch (err: any) {
            setCategorySuggestError(`Failed to suggest category: ${err.message || 'Unknown error'}`);
        } finally {
            setCategorySuggesting(false);
        }
    };

    const expenseCategories = Array.from(new Set(financeExpenses.map(e => e.category)));
    const totalExpenses = financeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remainingBudget = financeBudget - totalExpenses;

    // Chart data for expenses by category
    const categoryData: PieChartProps['data'] = expenseCategories.map(cat => ({
        name: cat,
        value: financeExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0),
        color: randomColor(), // Use a random color or a predefined palette
    }));

    // Chart data for expenses over time (bar chart by month/year)
    const monthlyExpenses = financeExpenses.reduce((acc, exp) => {
        const monthYear = new Date(exp.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        acc[monthYear] = (acc[monthYear] || 0) + exp.amount;
        return acc;
    }, {} as { [key: string]: number });

    const monthlyChartData: BarChartProps['data'] = Object.entries(monthlyExpenses).map(([monthYear, amount]) => ({
        monthYear,
        expenses: amount,
    }));

    const handleTranslateContent = async (docId: string, rowIdx: number, originalText: string, targetLang: string) => {
      setTranslating(true);
      try {
          const gemini = getGeminiClient();
          const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
          const prompt = `Translate the following English text to ${languageOptions.find(lang => lang.value === targetLang)?.label || targetLang}:\n\n${originalText}`;
          const result = await model.generateContent(prompt);
          const translatedText = result.response.text().trim();

          const updatedRows = {
              ...docRows,
              [docId]: (docRows[docId] || []).map((row, i) => (i === rowIdx ? translatedText : row)),
          };
          setDocRows(updatedRows);
          showNotification({ title: 'Translation Successful', message: 'Document content translated.', color: 'green' });
      } catch (err: any) {
          showNotification({ title: 'Translation Failed', message: err.message || 'Failed to translate content.', color: 'red' });
      } finally {
          setTranslating(false);
      }
    };

    // Sync finance state with project data
    useEffect(() => {
      if (project) {
        setFinanceBudget(project.budget || 0);
        setFinanceCurrency(project.currency || 'USD');
        setFinanceExpenses(project.expenses || []);
      }
    }, [project]);

    // Handler to open edit modal
    const handleEditExpense = (expense: Expense) => {
      setEditingExpense(expense);
      setEditExpenseData({ ...expense });
    };

    // Handler to save edited expense
    const handleSaveEditExpense = async () => {
      if (!editingExpense) return;
      const updatedExpenses = financeExpenses.map(exp =>
        exp.id === editingExpense.id ? { ...exp, ...editExpenseData } : exp
      );
      await saveFinance({ budget: financeBudget, currency: financeCurrency, expenses: updatedExpenses });
      setEditingExpense(null);
      setEditExpenseData({});
      showNotification({ title: 'Expense Updated', message: 'Expense updated successfully.', color: 'green' });
    };

    // Handler to close edit modal
    const handleCancelEditExpense = () => {
      setEditingExpense(null);
      setEditExpenseData({});
    };

    // Update unread counts when chat messages are fetched
    useEffect(() => {
        const userEmail = localStorage.getItem("user:username");
        const pid = Array.isArray(projectId) ? projectId[0] : projectId;
        if (!userEmail || !pid || !project?.members) return;
        // For each member, check unread count in localStorage
        const counts: { [email: string]: number } = {};
        project.members.forEach((member: string) => {
            if (member === userEmail) return;
            const key = `unread:${userEmail}:${member}:${pid}`;
            const val = parseInt(localStorage.getItem(key) || '0', 10);
            if (val > 0) counts[member] = val;
        });
        setUnreadCounts(counts);
    }, [projectId, project, chatMessages, chatContext]);

    // When switching to a private chat, reset unread count for that member
    useEffect(() => {
        const userEmail = localStorage.getItem("user:username");
        const pid = Array.isArray(projectId) ? projectId[0] : projectId;
        if (!userEmail || !pid) return;
        if (chatContext !== 'group' && typeof chatContext === 'string') {
            const key = `unread:${userEmail}:${chatContext}:${pid}`;
            localStorage.setItem(key, '0');
            setUnreadCounts((prev) => ({ ...prev, [chatContext]: 0 }));
        }
    }, [chatContext, projectId]);

    // When a new private message is received and the chat is not active, increment unread count
    useEffect(() => {
        const userEmail = localStorage.getItem("user:username");
        const pid = Array.isArray(projectId) ? projectId[0] : projectId;
        if (!userEmail || !pid || !project?.members) return;
        if (chatContext === 'group') return;
        // Only for private chats
        chatMessages.forEach((msg) => {
            if (msg.sender !== userEmail && chatContext !== msg.sender) {
                const key = `unread:${userEmail}:${msg.sender}:${pid}`;
                const current = parseInt(localStorage.getItem(key) || '0', 10);
                localStorage.setItem(key, String(current + 1));
                setUnreadCounts((prev) => ({ ...prev, [msg.sender]: current + 1 }));
            }
        });
    }, [chatMessages, chatContext, projectId]);

    // 5. Add handlers for edit and delete
    const handleSaveEditMsg = async (msgId: number) => {
        const pid = Array.isArray(projectId) ? projectId[0] : projectId;
        if (!pid) return;
        let chatKey = '';
        const userEmail = localStorage.getItem("user:username");
        if (chatContext === 'group') {
            chatKey = pid;
        } else {
            const emails = [userEmail, chatContext].sort();
            chatKey = `private:${emails[0]}:${emails[1]}:${pid}`;
        }
        const updated = chatMessages.map(msg =>
            msg.id === msgId ? { ...msg, content: editMsgValue, edited: true } : msg
        );
        setChatMessages(updated);
        setEditingMsgId(null);
        setEditMsgValue("");
        await fetch(`http://localhost:3333/chat?mode=disk&key=${encodeURIComponent(chatKey)}`,
            { method: "POST", body: JSON.stringify(updated) });
    };
    const handleDeleteMsg = async (msgId: number) => {
        const pid = Array.isArray(projectId) ? projectId[0] : projectId;
        if (!pid) return;
        let chatKey = '';
        const userEmail = localStorage.getItem("user:username");
        if (chatContext === 'group') {
            chatKey = pid;
        } else {
            const emails = [userEmail, chatContext].sort();
            chatKey = `private:${emails[0]}:${emails[1]}:${pid}`;
        }
        const updated = chatMessages.filter(msg => msg.id !== msgId);
        setChatMessages(updated);
        await fetch(`http://localhost:3333/chat?mode=disk&key=${encodeURIComponent(chatKey)}`,
            { method: "POST", body: JSON.stringify(updated) });
    };

    // Handler to start/stop recording
    const handleVoiceNote = async () => {
        if (!recording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mimeType = getSupportedAudioType();
                const recorder = mimeType ? new window.MediaRecorder(stream, { mimeType }) : new window.MediaRecorder(stream);
                setMediaRecorder(recorder);
                let localChunks: Blob[] = [];
                recorder.ondataavailable = (e: BlobEvent) => {
                    localChunks.push(e.data);
                };
                recorder.onstop = async () => {
                    clearInterval(recordingInterval!);
                    setRecordingTime(0);
                    const audioBlob = new Blob(localChunks, { type: mimeType || 'audio/webm' });
                    const userEmail = localStorage.getItem("user:username") || 'unknown';
                    const pid = Array.isArray(projectId) ? projectId[0] : projectId;
                    const audioKey = `audio:${Date.now()}:${userEmail}:${pid}`;
                    await uploadAudioToCivilMemory(audioKey, audioBlob);
                    sendMessage("[Voice Note]", "audio", audioKey);
                };
                recorder.start();
                setRecording(true);
                setRecordingTime(0);
                recordingInterval = setInterval(() => {
                    setRecordingTime(prev => {
                        if (prev + 1 >= MAX_RECORDING_TIME) {
                            recorder.stop();
                            setRecording(false);
                            setMediaRecorder(null);
                            clearInterval(recordingInterval!);
                            return 0;
                        }
                        return prev + 1;
                    });
                }, 1000);
            } catch (err) {
                showNotification({ title: 'Error', message: 'Could not access microphone.', color: 'red' });
            }
        } else {
            if (mediaRecorder) {
                mediaRecorder.stop();
                setRecording(false);
                setMediaRecorder(null);
                clearInterval(recordingInterval!);
                setRecordingTime(0);
            }
        }
    };

    // Helper to get supported audio MIME type
    function getSupportedAudioType() {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported) {
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return 'audio/ogg';
        }
        return '';
    }

    if (loading) {
        return (
            <Center style={{ height: '100vh' }}>
                <Loader />
            </Center>
        );
    }

    if (!project) {
        return (
            <Center style={{ height: '100vh' }}>
                <Stack align="center">
                    <Title order={3}>Project not found</Title>
                    <Button onClick={() => router.replace("/projects")}>Go to Projects</Button>
                </Stack>
            </Center>
        );
    }

    const currentDocRows = docRows[activeDocTab] || [];
    const startIndex = (docPage - 1) * DOCS_PER_PAGE;
    const endIndex = startIndex + DOCS_PER_PAGE;
    const paginatedDocRows = currentDocRows.slice(startIndex, endIndex);
    const totalDocPages = Math.ceil(currentDocRows.length / DOCS_PER_PAGE);

    return (
        <>
            <Box style={{ backgroundColor: styles.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Container fluid py="md" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Group justify="space-between" align="center" mb="md" mt="sm">
                        <Group>
                            <ActionIcon variant="transparent" onClick={() => router.back()} title="Back to projects">
                                <IconArrowLeft size={24} />
                            </ActionIcon>
                            <Title order={1} style={{ color: styles.textColor, fontSize: isMobile ? '1.5rem' : '2.2rem' }}>
                                {project.name}
                            </Title>
                            <Badge color="blue" size="lg" radius="sm">{project.status}</Badge>
                        </Group>
                        <Group>
                            <Button
                                leftSection={<IconSettings size={18} />}
                                variant="light"
                                onClick={() => setSettingsOpened(true)}
                                visibleFrom="sm"
                            >
                                Project Settings
                            </Button>
                            <ActionIcon
                                variant="light"
                                color="gray"
                                size={36}
                                onClick={() => setSettingsOpened(true)}
                                title="Project Settings"
                                hiddenFrom="sm"
                            >
                                <IconSettings size={22} />
                            </ActionIcon>
                            <Menu shadow="md" width={200}>
                                <Menu.Target>
                                    <ActionIcon variant="light" color="gray" size={36} title="More actions">
                                        <IconDots size={22} />
                                    </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Item
                                        leftSection={<IconTrash size={18} />}
                                        color="red"
                                        onClick={handleLogout}
                                    >
                                        Log Out
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </Group>
                    </Group>

                    <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'documents')} mt="md" keepMounted={false}>
                        <Tabs.List
                          grow
                          style={{
                            backgroundColor: styles.tabListBackground,
                            borderRadius: rem(8),
                            padding: isMobile ? rem(2) : rem(4),
                            flexDirection: isMobile ? 'column' : 'row',
                            gap: isMobile ? rem(2) : rem(0),
                            overflowX: isMobile ? 'auto' : 'unset',
                            minWidth: isMobile ? 0 : undefined,
                            width: isMobile ? '100%' : undefined,
                          }}
                        >
                          <Tabs.Tab value="documents" leftSection={<IconFile size={isMobile ? 18 : 20} />} style={{ fontSize: isMobile ? 14 : 16, minHeight: isMobile ? 40 : undefined }}>
                            Documents
                          </Tabs.Tab>
                          <Tabs.Tab value="directives_hub" leftSection={<IconWorld size={isMobile ? 18 : 20} />} style={{ fontSize: isMobile ? 14 : 16, minHeight: isMobile ? 40 : undefined }}>
                            Directives Hub
                          </Tabs.Tab>
                          <Tabs.Tab value="target_groups" leftSection={<IconUsersGroup size={isMobile ? 18 : 20} />} style={{ fontSize: isMobile ? 14 : 16, minHeight: isMobile ? 40 : undefined }}>
                            Target Groups
                          </Tabs.Tab>
                          <Tabs.Tab value="research" leftSection={<IconSearch size={isMobile ? 18 : 20} />} style={{ fontSize: isMobile ? 14 : 16, minHeight: isMobile ? 40 : undefined }}>
                            Research
                          </Tabs.Tab>
                          <Tabs.Tab value="chat" leftSection={<IconSend size={isMobile ? 18 : 20} />} style={{ fontSize: isMobile ? 14 : 16, minHeight: isMobile ? 40 : undefined }}>
                            Communications
                          </Tabs.Tab>
                          <Tabs.Tab value="tasks" leftSection={<IconSparkles size={isMobile ? 18 : 20} />} style={{ fontSize: isMobile ? 14 : 16, minHeight: isMobile ? 40 : undefined }}>
                            Tasks
                          </Tabs.Tab>
                          <Tabs.Tab value="finance" leftSection={<IconCurrencyDollar size={isMobile ? 18 : 20} />} style={{ fontSize: isMobile ? 14 : 16, minHeight: isMobile ? 40 : undefined }}>
                            Finance
                          </Tabs.Tab>
                          <Tabs.Tab value="calendar" leftSection={<IconCalendarEvent size={isMobile ? 18 : 20} />} style={{ fontSize: isMobile ? 14 : 16, minHeight: isMobile ? 40 : undefined }}>
                            Calendar
                          </Tabs.Tab>
                          <Tabs.Tab value="files" leftSection={<IconUpload size={isMobile ? 18 : 20} />} style={{ fontSize: isMobile ? 14 : 16, minHeight: isMobile ? 40 : undefined }}>
                            Files
                          </Tabs.Tab>
                          <Tabs.Tab value="ai_assistants" leftSection={<IconRobot size={isMobile ? 18 : 20} />} style={{ fontSize: isMobile ? 14 : 16, minHeight: isMobile ? 40 : undefined }}>
                            AI Assistants
                          </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="documents" style={{ backgroundColor: styles.tabPanelBackground, padding: rem(20), borderRadius: rem(8), marginTop: rem(20), border: styles.cardBorder, boxShadow: styles.cardShadow }}>
                            <ProjectDocumentsTab
                                projectId={projectId as string}
                                docTabs={filteredTabs}
                                setDocTabs={setDocTabs}
                                activeDocTab={activeDocTab}
                                setActiveDocTab={setActiveDocTab}
                                docRows={docRows || {}}
                                setDocRows={setDocRows}
                                addingRowFor={addingRowFor}
                                setAddingRowFor={setAddingRowFor}
                                newRowValue={newRowValue}
                                setNewRowValue={setNewRowValue}
                                savingRow={savingRow}
                                setSavingRow={setSavingRow}
                                editingRow={editingRow}
                                setEditingRow={setEditingRow}
                                editRowValue={editRowValue}
                                setEditRowValue={setEditRowValue}
                                savingEdit={savingEdit}
                                setSavingEdit={setSavingEdit}
                                aiProcessing={aiProcessing}
                                setAiProcessing={setAiProcessing}
                                addRowInputRef={addRowInputRef}
                                handleAddDocument={handleAddDocument}
                                handleRenameDoc={handleRenameDoc}
                                handleDeleteDoc={handleDeleteDoc}
                                handleAddRow={handleAddRow}
                                handleSaveRow={handleSaveRow}
                                handleCancelRow={handleCancelRow}
                                handleDeleteRow={handleDeleteRow}
                                handleStartEditRow={handleStartEditRow}
                                handleSaveEditRow={handleSaveEditRow}
                                handleCancelEditRow={handleCancelEditRow}
                                handleAiTransformRow={handleAiTransformRow}
                                docSearch={docSearch}
                                setDocSearch={setDocSearch}
                                docPage={docPage}
                                setDocPage={setDocPage}
                                DOCS_PER_PAGE={DOCS_PER_PAGE}
                                styles={styles || {}}
                                showNotification={showNotification}
                                tagFilter={tagFilter}
                                setTagFilter={setTagFilter}
                            />
                            {/* Document Transition AI Section */}
                            <Divider my="xl" />
                            <Title order={4} style={{ color: styles.textColor }} mb="md">Document Transition AI</Title>
                            <Text size="sm" color="dimmed" mb="md">
                                Use AI to help transition content from one document to another. Select a source document and a target document.
                            </Text>
                            <Group grow mb="md">
                                <Select
                                    label="Source Document"
                                    placeholder="Select source"
                                    data={docTabs.map(tab => ({ value: tab.id, label: tab.title }))}
                                    value={transitionSource}
                                    onChange={(value) => setTransitionSource(value)}
                                />
                                <Select
                                    label="Target Document"
                                    placeholder="Select target"
                                    data={docTabs.map(tab => ({ value: tab.id, label: tab.title }))}
                                    value={transitionTarget}
                                    onChange={(value) => setTransitionTarget(value)}
                                />
                            </Group>
                            <Button
                                onClick={async () => {
                                    if (!transitionSource || !transitionTarget) {
                                        showNotification({ title: 'Error', message: 'Please select both source and target documents.', color: 'red' });
                                        return;
                                    }
                                    setTransitionLoading(true);
                                    try {
                                        const sourceContent = (docRows[transitionSource] || []).join('\n');
                                        const targetContent = (docRows[transitionTarget] || []).join('\n');

                                        const gemini = getGeminiClient();
                                        const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
                                        const prompt = `Facilitate the transition of key information from the source document to the target document.\nSource Document Content:\n${sourceContent}\n\nTarget Document Content:\n${targetContent}\n\nIdentify what information is missing or needs to be adapted from the source to enrich or complete the target. Provide specific suggestions or direct content to add/modify in the target document.`;
                                        const result = await model.generateContent(prompt);
                                        const aiResult = result.response.text().trim();
                                        setTransitionResult(aiResult);
                                    } catch (err: any) {
                                        showNotification({ title: 'AI Error', message: err.message || 'Failed to generate transition guidance.', color: 'red' });
                                    } finally {
                                        setTransitionLoading(false);
                                    }
                                }}
                                loading={transitionLoading}
                                leftSection={<IconSparkles size={18} />}
                            >
                                Generate Transition Guidance
                            </Button>
                            {transitionResult && (
                                <Paper p="md" shadow="sm" withBorder mt="md" style={{ backgroundColor: styles.cardBackground }}>
                                    <Text fw={500} mb="xs">AI Transition Guidance:</Text>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{transitionResult}</ReactMarkdown>
                                </Paper>
                            )}
                        </Tabs.Panel>

                        <Tabs.Panel value="tasks" style={{ backgroundColor: styles.tabPanelBackground, padding: rem(20), borderRadius: rem(8), marginTop: rem(20), border: styles.cardBorder, boxShadow: styles.cardShadow }}>
                            <Group justify="space-between" mb="md">
                                <Title order={3} style={{ color: styles.textColor }}>Tasks</Title>
                                <Group>
                                    <Select
                                        value={taskView}
                                        onChange={(value) => setTaskView(value as 'list' | 'board')}
                                        data={[{ value: 'list', label: 'List View' }, { value: 'board', label: 'Kanban Board' }]}
                                        placeholder="Select view"
                                    />
                                    <Button onClick={() => setAddingTask(true)}>Add Task</Button>
                                </Group>
                            </Group>

                            <Modal opened={addingTask} onClose={() => setAddingTask(false)} title="Add New Task">
                                <Stack>
                                    <TextInput
                                        label="Title"
                                        placeholder="Task title"
                                        value={newTask.title}
                                        onChange={(event) => setNewTask({ ...newTask, title: event.currentTarget.value })}
                                        required
                                    />
                                    <Textarea
                                        label="Description"
                                        placeholder="Task description"
                                        value={newTask.description}
                                        onChange={(event) => setNewTask({ ...newTask, description: event.currentTarget.value })}
                                    />
                                    <TextInput
                                        label="Assignee"
                                        placeholder="Assignee email or name"
                                        value={newTask.assignee}
                                        onChange={(event) => setNewTask({ ...newTask, assignee: event.currentTarget.value })}
                                    />
                                    <Select
                                        label="Status"
                                        value={newTask.status}
                                        onChange={(value) => setNewTask({ ...newTask, status: value as Task['status'] })}
                                        data={['todo', 'in-progress', 'blocked', 'done']}
                                    />
                                    <Select
                                        label="Priority"
                                        value={newTask.priority}
                                        onChange={(value) => setNewTask({ ...newTask, priority: value as Task['priority'] })}
                                        data={['low', 'medium', 'high', 'critical']}
                                    />
                                    <TextInput
                                        label="Due Date"
                                        type="date"
                                        value={newTask.dueDate}
                                        onChange={(event) => setNewTask({ ...newTask, dueDate: event.currentTarget.value })}
                                    />
                                    <Button onClick={handleAddTask}>Create Task</Button>
                                </Stack>
                            </Modal>

                            <Modal opened={!!editingTaskId} onClose={() => setEditingTaskId(null)} title="Edit Task">
                                <Stack>
                                    <TextInput
                                        label="Title"
                                        placeholder="Task title"
                                        value={editTask.title}
                                        onChange={(event) => setEditTask({ ...editTask, title: event.currentTarget.value })}
                                        required
                                    />
                                    <Textarea
                                        label="Description"
                                        placeholder="Task description"
                                        value={editTask.description}
                                        onChange={(event) => setEditTask({ ...editTask, description: event.currentTarget.value })}
                                    />
                                    <TextInput
                                        label="Assignee"
                                        placeholder="Assignee email or name"
                                        value={editTask.assignee}
                                        onChange={(event) => setEditTask({ ...editTask, assignee: event.currentTarget.value })}
                                    />
                                    <Select
                                        label="Status"
                                        value={editTask.status}
                                        onChange={(value) => setEditTask({ ...editTask, status: value as Task['status'] })}
                                        data={['todo', 'in-progress', 'blocked', 'done']}
                                    />
                                    <Select
                                        label="Priority"
                                        value={editTask.priority}
                                        onChange={(value) => setEditTask({ ...editTask, priority: value as Task['priority'] })}
                                        data={['low', 'medium', 'high', 'critical']}
                                    />
                                    <TextInput
                                        label="Due Date"
                                        type="date"
                                        value={editTask.dueDate}
                                        onChange={(event) => setEditTask({ ...editTask, dueDate: event.currentTarget.value })}
                                    />
                                    <Button onClick={handleSaveTask}>Save Changes</Button>
                                </Stack>
                            </Modal>

                            {taskView === 'list' ? (
                                <Stack>
                                    {tasks.length === 0 ? (
                                        <Text color="dimmed">No tasks yet. Add one to get started!</Text>
                                    ) : (
                                        tasks.map((task) => (
                                            <Paper key={task.id} p="md" shadow="sm" withBorder style={{ borderColor: styles.cardBorder }}>
                                                <Group justify="space-between" align="center">
                                                    <Stack gap={4}>
                                                        <Text fw={600} style={{ color: styles.textColor }}>{task.title}</Text>
                                                        {task.description && <Text size="sm" color="dimmed">{task.description}</Text>}
                                                        <Group gap="xs">
                                                            {task.assignee && <Badge variant="light" color="cyan">{task.assignee}</Badge>}
                                                            <Badge variant="light" color={task.status === 'done' ? 'green' : 'blue'}>{task.status}</Badge>
                                                            <Badge variant="light" color={task.priority === 'high' ? 'red' : task.priority === 'critical' ? 'red' : 'orange'}>{task.priority}</Badge>
                                                            {task.dueDate && <Badge variant="light" color="grape">Due: {task.dueDate}</Badge>}
                                                        </Group>
                                                    </Stack>
                                                    <Group>
                                                        <ActionIcon variant="light" onClick={() => handleEditTask(task)} title="Edit Task">
                                                            <IconEdit size={18} />
                                                        </ActionIcon>
                                                        <ActionIcon variant="light" color="red" onClick={() => handleDeleteTask(task.id)} title="Delete Task">
                                                            <IconTrash size={18} />
                                                        </ActionIcon>
                                                    </Group>
                                                </Group>
                                            </Paper>
                                        ))
                                    )}
                                </Stack>
                            ) : (
                                <DragDropContext onDragEnd={handleDragEnd}>
                                    <Group align="flex-start" wrap="nowrap" style={{ overflowX: 'auto', paddingBottom: rem(10) }}>
                                        {['todo', 'in-progress', 'blocked', 'done'].map((status) => (
                                            <Droppable droppableId={status} key={status}>
                                                {(provided) => (
                                                    <Stack
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        style={{
                                                            minWidth: rem(280),
                                                            flexShrink: 0,
                                                            backgroundColor: styles.cardBackground,
                                                            borderRadius: rem(8),
                                                            padding: rem(15),
                                                            border: styles.cardBorder,
                                                            boxShadow: styles.cardShadow,
                                                            minHeight: rem(200),
                                                        }}
                                                    >
                                                        <Title order={5} style={{ textTransform: 'uppercase', color: 'dimmed', marginBottom: 'sm' }}>{status.replace('-', ' ')}</Title>
                                                        {tasks
                                                            .filter(task => task.status === status)
                                                            .map((task, index) => (
                                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                    {(provided, snapshot) => (
                                                                        <Paper
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            {...provided.dragHandleProps}
                                                                            p="md"
                                                                            shadow="sm"
                                                                            withBorder
                                                                            style={{
                                                                                borderColor: styles.cardBorder,
                                                                                backgroundColor: snapshot.isDragging ? styles.cardBackground : styles.cardBackground,
                                                                                ...provided.draggableProps.style,
                                                                            }}
                                                                        >
                                                                            <Stack gap={4}>
                                                                                <Text fw={600} style={{ color: styles.textColor }}>{task.title}</Text>
                                                                                {task.description && <Text size="sm" color="dimmed">{task.description}</Text>}
                                                                                <Group gap="xs">
                                                                                    {task.assignee && <Badge variant="light" color="cyan">{task.assignee}</Badge>}
                                                                                    <Badge variant="light" color={task.priority === 'high' ? 'red' : task.priority === 'critical' ? 'red' : 'orange'}>{task.priority}</Badge>
                                                                                    {task.dueDate && <Badge variant="light" color="grape">Due: {task.dueDate}</Badge>}
                                                                                </Group>
                                                                                <Group mt="xs" justify="flex-end">
                                                                                    <ActionIcon variant="light" onClick={() => handleEditTask(task)} title="Edit Task">
                                                                                        <IconEdit size={16} />
                                                                                    </ActionIcon>
                                                                                    <ActionIcon variant="light" color="red" onClick={() => handleDeleteTask(task.id)} title="Delete Task">
                                                                                        <IconTrash size={16} />
                                                                                    </ActionIcon>
                                                                                </Group>
                                                                            </Stack>
                                                                        </Paper>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                        {provided.placeholder}
                                                        {tasks.filter(task => task.status === status).length === 0 && (
                                                            <Text color="dimmed" size="sm" ta="center" mt="md">Drag tasks here or add a new one.</Text>
                                                        )}
                                                    </Stack>
                                                )}
                                            </Droppable>
                                        ))}
                                    </Group>
                                </DragDropContext>
                            )}
                        </Tabs.Panel>

                        <Tabs.Panel value="chat" style={{
                          backgroundColor: styles.tabPanelBackground,
                          padding: isMobile ? rem(8) : rem(20),
                          borderRadius: rem(8),
                          marginTop: rem(20),
                          border: styles.cardBorder,
                          boxShadow: styles.cardShadow,
                          display: 'flex',
                          flexDirection: isMobile ? 'column' : 'row',
                          height: '100%',
                          minHeight: rem(400),
                        }}>
                          {/* Sidebar for members */}
                          <Box style={{
                            minWidth: isMobile ? '100%' : 180,
                            maxWidth: isMobile ? '100%' : 220,
                            marginRight: isMobile ? 0 : 24,
                            marginBottom: isMobile ? 16 : 0,
                            width: isMobile ? '100%' : undefined,
                          }}>
                            <Text fw={600} mb="xs" size={isMobile ? 'md' : 'lg'}>Collaborators</Text>
                            <Text size="xs" color="dimmed" mb="xs">(Project chat is shared by default. Click a member for private chat.)</Text>
                            <Stack gap={8}>
                              <Group
                                key="group-chat"
                                gap={8}
                                align="center"
                                style={{
                                  background: chatContext === 'group' ? '#e3f2fd' : 'transparent',
                                  borderRadius: 8,
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => setChatContext('group')}
                              >
                                <Avatar size={28} radius="xl" color="gray">
                                  <IconUsersGroup size={18} />
                                </Avatar>
                                <Text size="sm" fw={chatContext === 'group' ? 700 : 400}>Boardroom</Text>
                              </Group>
                              {project.members && project.members.filter((member: string) => member !== localStorage.getItem("user:username")).map((member: string) => {
                                let online = false;
                                try {
                                  const lastActive = localStorage.getItem(`user:lastActive:${member}`);
                                  if (lastActive && Date.now() - parseInt(lastActive, 10) < 5 * 60 * 1000) online = true;
                                } catch { }
                                return (
                                  <Group
                                    key={member}
                                    gap={8}
                                    align="center"
                                    style={{
                                      background: chatContext === member ? '#e3f2fd' : 'transparent',
                                      borderRadius: 8,
                                      padding: '4px 8px',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => setChatContext(member)}
                                  >
                                    <Avatar size={28} radius="xl" color="blue">
                                      {getInitials(member)}
                                    </Avatar>
                                    <Box style={{ width: 8, height: 8, borderRadius: 4, background: '#4caf50', marginRight: 4 }} />
                                    <Text size="sm" fw={chatContext === member ? 700 : 400}>{getDisplayName(member)}</Text>
                                    {unreadCounts[member] > 0 && (
                                      <Badge color="red" size="sm" ml={4}>{unreadCounts[member]}</Badge>
                                    )}
                                  </Group>
                                );
                              })}
                            </Stack>
                          </Box>
                          {/* Chat area */}
                          <Box style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            width: isMobile ? '100%' : undefined,
                            minWidth: 0,
                          }}>
                            <Box style={{
                              flexGrow: 1,
                              overflowY: 'auto',
                              marginBottom: rem(15),
                              width: '100%',
                              maxHeight: isMobile ? rem(220) : rem(320),
                              minHeight: rem(120),
                              transition: 'max-height 0.2s',
                            }}>
                              {chatMessages.length === 0 ? (
                                <Center style={{ flexGrow: 1 }}>
                                  <Text color="dimmed">Start a conversation!</Text>
                                </Center>
                              ) : (
                                chatMessages.map((msg, index) => (
                                  <Group key={msg.id} gap="xs" wrap="nowrap" align="flex-end" style={{ justifyContent: msg.sender === userName || msg.sender === localStorage.getItem("user:username") ? 'flex-end' : 'flex-start', marginBottom: 4, position: 'relative' }}>
                                    {/* Show three-dots menu to the left of own message bubble */}
                                    {(msg.sender === userName || msg.sender === localStorage.getItem("user:username")) && (
                                      <Menu shadow="md" width={120} position="right-start">
                                        <Menu.Target>
                                          <ActionIcon variant="subtle" color="gray" size={22} style={{ marginRight: 2 }}>
                                            <IconDots size={18} />
                                          </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                          <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => { setEditingMsgId(msg.id); setEditMsgValue(msg.content); }}>Edit</Menu.Item>
                                          <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={() => handleDeleteMsg(msg.id)}>Delete</Menu.Item>
                                        </Menu.Dropdown>
                                      </Menu>
                                    )}
                                    {/* Avatar for others' messages */}
                                    {(msg.sender !== userName && msg.sender !== localStorage.getItem("user:username")) && (
                                      <Avatar size={24} radius="xl" color="blue" style={{ marginRight: 4 }}>
                                        {msg.sender === "ai" ? <IconRobot size={16} /> : getInitials(msg.senderName || msg.sender)}
                                      </Avatar>
                                    )}
                                    <Box style={{
                                      backgroundColor: msg.sender === userName || msg.sender === localStorage.getItem("user:username") ? '#1877f2' : '#f0f2f5',
                                      color: msg.sender === userName || msg.sender === localStorage.getItem("user:username") ? 'white' : '#050505',
                                      borderRadius: 18,
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.07)',
                                      padding: '6px 14px 10px 14px',
                                      maxWidth: '70%',
                                      minWidth: 60,
                                      position: 'relative',
                                      fontSize: 15,
                                      lineHeight: 1.4,
                                      wordBreak: 'break-word',
                                    }}>
                                      <Text size="xs" color={msg.sender === userName || msg.sender === localStorage.getItem("user:username") ? 'rgba(255,255,255,0.7)' : 'dimmed'} style={{ marginBottom: 2, fontWeight: 500 }}>
                                        {msg.senderName || msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </Text>
                                      {/* If editing this message */}
                                      {editingMsgId === msg.id ? (
                                        <Group>
                                          <TextInput
                                            value={editMsgValue}
                                            onChange={e => setEditMsgValue(e.currentTarget.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEditMsg(msg.id); }}
                                            autoFocus
                                          />
                                          <ActionIcon onClick={() => handleSaveEditMsg(msg.id)}><IconSend size={16} /></ActionIcon>
                                          <ActionIcon color="red" onClick={() => { setEditingMsgId(null); setEditMsgValue(""); }}><IconTrash size={16} /></ActionIcon>
                                        </Group>
                                      ) : (
                                        <>
                                          {/* If this message is a reply, show reference */}
                                          {msg.replyTo && (
                                            <Text size="xs" color="dimmed" style={{ marginBottom: 2, fontStyle: 'italic' }}>
                                              Replying to: {msg.replyTo.content?.slice(0, 40)}
                                            </Text>
                                          )}
                                          {/* Message content */}
                                          {msg.type === 'audio' && msg.fileUrl ? (
                                            <AudioPlayer audioKey={msg.fileUrl} audioURLs={audioURLs} setAudioURLs={setAudioURLs} />
                                          ) : (
                                            (msg.sender === 'ai' || msg.senderName === 'AI Assistant') ? (
                                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                            ) : (
                                              <Text style={{ fontSize: 15, marginBottom: 2 }}>{msg.content}</Text>
                                            )
                                          )}
                                        </>
                                      )}
                                      {msg.fileUrl && msg.type !== 'audio' && msg.content !== '[Voice Note]' && (
                                        <Box>
                                          <Text size="sm" style={{ fontStyle: 'italic' }}>File: {msg.content}</Text>
                                        </Box>
                                      )}
                                      {/* Reactions as Messenger-style pill badges at bottom right */}
                                      {msg.reactions && msg.reactions.length > 0 && (
                                        <Group gap={2} style={{ position: 'absolute', bottom: 2, right: 8, marginTop: 2 }}>
                                          {Array.from(new Set(msg.reactions)).map(emoji => (
                                            <Box key={emoji as string} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.08)', padding: '0 6px', fontSize: 13, display: 'flex', alignItems: 'center', border: '1px solid #e4e6eb' }}>
                                              {emoji as string} {msg.reactions.filter((r: string) => r === emoji).length > 1 ? msg.reactions.filter((r: string) => r === emoji).length : ''}
                                            </Box>
                                          ))}
                                        </Group>
                                      )}
                                    </Box>
                                    {/* Avatar for own messages */}
                                    {(msg.sender === userName || msg.sender === localStorage.getItem("user:username")) && (
                                      <Avatar size={24} radius="xl" color="teal" style={{ marginLeft: 4 }}>
                                        {getInitials(msg.senderName || msg.sender)}
                                      </Avatar>
                                    )}
                                  </Group>
                                ))
                              )}
                              {aiThinking && (
                                <Group gap="xs" wrap="nowrap" align="flex-start" justify="flex-start">
                                  <Avatar size={32} radius="xl" color="blue">
                                    <IconRobot size={20} />
                                  </Avatar>
                                  <Paper shadow="xs" p="sm" radius="md" miw={rem(120)} maw="70%" style={{ backgroundColor: styles.cardBackground }}>
                                    <Text size="xs" color="dimmed" mb={4}>AI Assistant • Thinking...</Text>
                                    <Loader size="xs" type="dots" />
                                  </Paper>
                                </Group>
                              )}
                              <div ref={chatEndRef} />
                            </Box>
                            {/* Chat input area refactored for better alignment */}
                            <Group align="flex-end" wrap="nowrap" mt="xs" style={{ width: '100%', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                              <TextInput
                                placeholder="Type a message or /ai for AI assistant..."
                                style={{ flexGrow: 1, width: isMobile ? '100%' : undefined }}
                                value={chatInput}
                                onChange={(event) => setChatInput(event.currentTarget.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    sendMessage(chatInput);
                                  }
                                }}
                                size={isMobile ? 'md' : 'sm'}
                              />
                              <ActionIcon variant="light" onClick={() => fileInputRef.current?.click()} title="Attach file" size={isMobile ? 44 : 36}>
                                <IconFile size={isMobile ? 28 : 20} />
                              </ActionIcon>
                              {/* Voice note button */}
                              <ActionIcon
                                variant={recording ? "filled" : "light"}
                                color={recording ? "red" : "blue"}
                                onClick={handleVoiceNote}
                                title={recording ? "Stop Recording" : "Record Voice Note"}
                                size={isMobile ? 44 : 36}
                                style={{ marginLeft: 4 }}
                              >
                                {recording ? <IconMicrophoneOff size={isMobile ? 28 : 20} /> : <IconMicrophone size={isMobile ? 28 : 20} />}
                              </ActionIcon>
                              <Group>
                                <ActionIcon variant="filled" color="blue" onClick={() => sendMessage(chatInput, "text")} title="Send message" size={isMobile ? 44 : 36}>
                                  {sending ? <Loader size="xs" /> : <IconSend size={isMobile ? 28 : 20} />}
                                </ActionIcon>
                              </Group>
                            </Group>
                            {/* Progress bar and timer for voice note recording */}
                            {recording && (
                              <Box style={{ width: '100%', marginTop: 4, marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ flex: 1, background: '#eee', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                                    <div style={{ width: `${(recordingTime / MAX_RECORDING_TIME) * 100}%`, height: 8, background: '#4caf50', borderRadius: 4, transition: 'width 0.2s' }} />
                                  </div>
                                  <Text size="xs" style={{ minWidth: 40, textAlign: 'right' }}>{recordingTime}s</Text>
                                </div>
                              </Box>
                            )}
                          </Box>
                          {/* Above chat input, show reply reference if replying */}
                          {replyToMsg && (
                            <Group gap={4} align="center" mb={4}>
                              <Text size="xs" color="dimmed">Replying to: {replyToMsg.content?.slice(0, 40)}</Text>
                              <ActionIcon size={18} variant="subtle" color="red" onClick={() => setReplyToMsg(null)}><IconTrash size={14} /></ActionIcon>
                            </Group>
                          )}
                        </Tabs.Panel>

                        <Tabs.Panel value="research" style={{ backgroundColor: styles.tabPanelBackground, padding: rem(20), borderRadius: rem(8), marginTop: rem(20), border: styles.cardBorder, boxShadow: styles.cardShadow }}>
                            <Title order={3} style={{ color: styles.textColor }} mb="md">Research Hub</Title>
                            <Group justify="space-between" mb="lg">
                                <Text style={{ color: styles.secondaryTextColor, maxWidth: '70%' }}>
                                    Collect, organize, and analyze your research materials. Add web links, upload files, or create notes.
                                </Text>
                                <Group>
                                    <Select
                                        value={sortBy}
                                        onChange={(value) => setSortBy(value as 'date' | 'title' | 'type')}
                                        data={[
                                            { value: 'date', label: 'Sort by Date' },
                                            { value: 'title', label: 'Sort by Title' },
                                            { value: 'type', label: 'Sort by Type' },
                                        ]}
                                        placeholder="Sort by"
                                        size="xs"
                                    />
                                    <Button onClick={() => setAddingResearch(!addingResearch)} size="xs">
                                        {addingResearch ? 'Cancel' : 'Add Research'}
                                        </Button>
                                </Group>
                            </Group>

                            {addingResearch && (
                                <Paper withBorder p="md" mb="lg" radius="md" style={{ borderColor: styles.cardBorder }}>
                                    <form onSubmit={handleAddResearch}>
                                        <Stack>
                                            <TextInput
                                                label="Title"
                                                placeholder="Research title"
                                                value={newResearch.title}
                                                onChange={(e) => setNewResearch((r: any) => ({ ...r, title: e.target.value }))}
                                                required
                                            />
                                            <Select
                                                label="Type"
                                                value={newResearch.type}
                                                onChange={(value) => setNewResearch((r: any) => ({ ...r, type: value || 'web' }))}
                                                data={[
                                                    { value: 'web', label: 'Web Link' },
                                                    { value: 'file', label: 'File' },
                                                    { value: 'note', label: 'Note' },
                                                ]}
                                                required
                                            />
                                            {newResearch.type === 'file' ? (
                                                <TextInput type="file" onChange={(e) => handleFileChange(e, setNewResearchFile)} />
                                            ) : (
                                            <Textarea
                                                label="Content"
                                                    placeholder={newResearch.type === 'web' ? "URL" : "Your note..."}
                                                value={newResearch.content}
                                                    onChange={(e) => setNewResearch((r: any) => ({ ...r, content: e.target.value }))}
                                                    required
                                                    autosize
                                                    minRows={2}
                                                />
                                            )}
                                            <Group>
                                                <MultiSelect
                                                    label="Tags"
                                                    placeholder="Add tags..."
                                                    data={allResearchTags}
                                                    value={newResearch.tags}
                                                    onChange={(values) => setNewResearch((r: any) => ({ ...r, tags: values }))}
                                                    searchable
                                                />
                                                <Button variant="light" size="xs" onClick={handleSuggestTags} loading={suggestingTags}>
                                                    Suggest Tags
                                                </Button>
                                            </Group>
                                            <Button type="submit" mt="sm">Add Research</Button>
                                        </Stack>
                                    </form>
                                </Paper>
                            )}

                            <Stack>
                                {sortedResearchItems.map((item: any) => (
                                    <Paper key={item.id} p="lg" shadow="sm" withBorder radius="md" style={{ borderColor: styles.cardBorder }}>
                                        {editResearch && editResearch.id === item.id ? (
                                            <Stack spacing="md">
                                                <TextInput
                                                    label="Title"
                                                    value={editResearch.title}
                                                    onChange={(e) => setEditResearch((r: any) => ({ ...r, title: e.currentTarget.value }))}
                                                />
                                                <Select
                                                    label="Type"
                                                    data={['web', 'document', 'interview', 'report']}
                                                    value={editResearch.type}
                                                    onChange={(value) => setEditResearch((r: any) => ({ ...r, type: value || 'web' }))}
                                                />
                                                <Textarea
                                                    label="Content"
                                                    minRows={6}
                                                    value={editResearch.content}
                                                    onChange={(e) => setEditResearch((r: any) => ({ ...r, content: e.currentTarget.value }))}
                                            />
                                            <MultiSelect
                                                label="Tags"
                                                data={allResearchTags}
                                                placeholder="Select or create tags"
                                                searchable
                                                value={editResearch.tags}
                                                onChange={(values) => setEditResearch((r: any) => ({ ...r, tags: values }))}
                                            />
                                                <Button variant="light" size="xs" onClick={handleEditSuggestTags} loading={suggestingTags}>
                                                    Suggest Tags
                                            </Button>
                                            <TextInput
                                                    label="Replace File (Optional)"
                                                type="file"
                                                    onChange={(e) => handleFileChange(e, setEditResearchFile)}
                                            />
                                                <Button onClick={handleSaveEditResearch} loading={editResearchLoading}>Save Changes</Button>
                                        </Stack>
                                        ) : (
                                            <Paper key={item.id} p="lg" shadow="sm" withBorder radius="md" style={{ borderColor: styles.cardBorder }}>
                                            <Group justify="space-between" align="flex-start">
                                                <Stack gap={4} style={{ flexGrow: 1 }}>
                                                    <Text fw={600} style={{ color: styles.textColor }}>{item.title}</Text>
                                                    <Group gap="xs">
                                                        <Badge variant="light" color="grape">{item.type}</Badge>
                                                        {item.tags && item.tags.map((tag: string) => (
                                                            <Badge key={tag} variant="light" color="cyan">{tag}</Badge>
                                                        ))}
                                                    </Group>
                                                    <Text size="sm" color="dimmed">Added by {item.createdBy} on {new Date(item.createdAt).toLocaleDateString()}</Text>
                                                    <Divider my="xs" />
                                                    {item.summary ? (
                                                        <Box>
                                                            <Text size="sm" fw={500} style={{ color: styles.textColor }}>Summary:</Text>
                                                            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{item.summary}</Text>
                                                            <Button
                                                                variant="light"
                                                                size="xs"
                                                                mt="xs"
                                                                onClick={() => setExpanded(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                            >
                                                                {expanded[item.id] ? 'Show Less' : 'Read More'}
                                                            </Button>
                                                        </Box>
                                                    ) : (
                                                        <Button
                                                            variant="light"
                                                            size="xs"
                                                            mt="xs"
                                                            onClick={() => handleSummarizeResearch(item)}
                                                            loading={summarizingId === item.id}
                                                            leftSection={<IconSparkles size={16} />}
                                                        >
                                                            Summarize with AI
                                                        </Button>
                                                    )}
                                                    {expanded[item.id] && (
                                                        <Box mt="xs">
                                                            <Text size="sm" fw={500} style={{ color: styles.textColor }}>Full Content:</Text>
                                                            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{item.content}</Text>
                                                            {item.fileUrl && (
                                                                <Text size="sm" mt="xs">
                                                                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">View Attached File</a>
                                                                </Text>
                                                            )}
                                                        </Box>
                                                    )}
                                                    <Divider my="xs" />
                                                    <Stack spacing="xs">
                                                        <Text fw={500} style={{ color: styles.textColor }}>Comments:</Text>
                                                        {item.annotations && item.annotations.length > 0 ? (
                                                            item.annotations.map((comment: any) => (
                                                                <Paper key={comment.id} p="xs" withBorder radius="sm" style={{ backgroundColor: styles.cardBackground }}>
                                                                    <Group justify="space-between" align="center">
                                                                        <Stack gap={2}>
                                                                            <Text size="xs" fw={500}>{comment.author}</Text>
                                                                            <Text size="sm">{comment.content}</Text>
                                                                            <Text size="xs" color="dimmed">{new Date(comment.createdAt).toLocaleString()}</Text>
                                                                        </Stack>
                                                                        <ActionIcon size="sm" variant="light" color="red" onClick={() => handleDeleteComment(item, comment.id)}>
                                                                            <IconTrash size={14} />
                                                                        </ActionIcon>
                                                                    </Group>
                                                                </Paper>
                                                            ))
                                                        ) : (
                                                            <Text size="sm" color="dimmed">No comments yet.</Text>
                                                        )}
                                                        <TextInput
                                                            placeholder="Add a comment..."
                                                            value={commentInputs[item.id] || ''}
                                                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [item.id]: e.currentTarget.value }))}
                                                            rightSection={commentLoading[item.id] ? <Loader size="xs" /> : <ActionIcon onClick={() => handleAddComment(item)}><IconSend size={18} /></ActionIcon>}
                                                        />
                                                    </Stack>
                                                </Stack>
                                                <Group wrap="nowrap">
                                                    <ActionIcon variant="light" onClick={() => handleEditResearch(item)} title="Edit Research">
                                                        <IconEdit size={18} />
                                                    </ActionIcon>
                                                    <ActionIcon variant="light" color="red" onClick={() => handleDeleteResearch(item.id)} title="Delete Research">
                                                        <IconTrash size={18} />
                                                    </ActionIcon>
                                                </Group>
                                            </Group>
                                            </Paper>
                                        )}
                                        </Paper>
                                    ))}
                                </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="files" style={{ backgroundColor: styles.tabPanelBackground, padding: rem(20), borderRadius: rem(8), marginTop: rem(20), border: styles.cardBorder, boxShadow: styles.cardShadow }}>
                            <Group justify="space-between" mb="md">
                                <Title order={3} style={{ color: styles.textColor }}>Project Files</Title>
                                <Button component="label" htmlFor="file-upload" leftSection={<IconUpload size={18} />} loading={uploading}>
                                    Upload File
                                    <input id="file-upload" type="file" style={{ display: 'none' }} onChange={handleFileUploadChange} />
                                </Button>
                            </Group>

                            {uploadError && <Text color="red" mb="md">{uploadError}</Text>}

                            {files.length === 0 ? (
                                <Text color="dimmed" mt="xl" ta="center">No files uploaded yet. Upload one to get started!</Text>
                            ) : (
                                <Stack>
                                    {files.map((file) => (
                                        <Paper key={file.id} p="md" shadow="sm" withBorder style={{ borderColor: styles.cardBorder }}>
                                            <Group justify="space-between" align="center">
                                                <Stack gap={4}>
                                                    <Text fw={600} style={{ color: styles.textColor }}>{file.name}</Text>
                                                    <Text size="sm" color="dimmed">{file.mimeType} • {(file.size / 1024).toFixed(2)} KB</Text>
                                                    <Text size="xs" color="dimmed">Uploaded by {file.uploadedBy} on {new Date(file.uploadedAt).toLocaleDateString()}</Text>
                                                </Stack>
                                                <Group>
                                                    <ActionIcon variant="light" onClick={() => handleFileDownload(file)} title="Download File">
                                                        <IconDownload size={18} />
                                                    </ActionIcon>
                                                    <ActionIcon variant="light" color="red" onClick={() => handleFileDelete(file.id)} title="Delete File">
                                                        <IconTrash size={18} />
                                                    </ActionIcon>
                                                </Group>
                                            </Group>
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                        </Tabs.Panel>

                        <Tabs.Panel value="calendar" style={{ backgroundColor: styles.tabPanelBackground, padding: rem(20), borderRadius: rem(8), marginTop: rem(20), border: styles.cardBorder, boxShadow: styles.cardShadow }}>
                            <Group justify="space-between" mb="md">
                                <Title order={3} style={{ color: styles.textColor }}>Project Calendar</Title>
                                <Button onClick={() => {
                                    setCalendarModalMode('add');
                                    setCalendarTask({
                                        title: '',
                                        description: '',
                                        assignee: '',
                                        status: 'todo',
                                        priority: 'medium',
                                        dueDate: '',
                                    });
                                    setCalendarModalOpen(true);
                                }}>Add Calendar Event</Button>
                                <Button
                                    leftSection={<IconDownload size={18} />}
                                    variant="light"
                                    onClick={() => saveAs(new Blob([generateICS(tasks, project.name)], { type: "text/calendar;charset=utf-8" }), `${project.name}-tasks.ics`)}
                                >
                                    Export Tasks to ICS
                                </Button>
                            </Group>

                            <Box style={{ height: rem(600) }}>
                                <BigCalendar
                                    localizer={localizer}
                                    events={calendarEvents}
                                    startAccessor="start"
                                    endAccessor="end"
                                    selectable
                                    onSelectSlot={handleSelectSlot}
                                    onSelectEvent={handleSelectEvent}
                                    style={{ height: '100%' }}
                                />
                            </Box>

                            {/* Calendar Event Modal */}
                            <Modal opened={calendarModalOpen} onClose={() => setCalendarModalOpen(false)} title={calendarModalMode === 'add' ? 'Add Calendar Task' : 'Edit Calendar Task'}>
                                <Stack>
                                    <TextInput
                                        label="Title"
                                        placeholder="Event title"
                                        value={calendarTask.title}
                                        onChange={(event) => setCalendarTask((r: any) => ({ ...r, title: event.currentTarget.value }))}
                                        required
                                    />
                                    <Textarea
                                        label="Description"
                                        placeholder="Event description"
                                        value={calendarTask.description}
                                        onChange={(event) => setCalendarTask((r: any) => ({ ...r, description: event.currentTarget.value }))}
                                    />
                                    <TextInput
                                        label="Assignee"
                                        placeholder="Assignee email or name"
                                        value={calendarTask.assignee}
                                        onChange={(event) => setCalendarTask((r: any) => ({ ...r, assignee: event.currentTarget.value }))}
                                    />
                                    <Select
                                        label="Status"
                                        value={calendarTask.status}
                                        onChange={(value) => setCalendarTask((r: any) => ({ ...r, status: value as Task['status'] }))}
                                        data={['todo', 'in-progress', 'blocked', 'done']}
                                    />
                                    <Select
                                        label="Priority"
                                        value={calendarTask.priority}
                                        onChange={(value) => setCalendarTask((r: any) => ({ ...r, priority: value as Task['priority'] }))}
                                        data={['low', 'medium', 'high', 'critical']}
                                    />
                                    <TextInput
                                        label="Due Date"
                                        type="date"
                                        value={calendarTask.dueDate}
                                        onChange={(event) => setCalendarTask((r: any) => ({ ...r, dueDate: event.currentTarget.value }))}
                                    />
                                    <Button onClick={handleCalendarTaskSubmit}>
                                        {calendarModalMode === 'add' ? 'Add Task to Calendar' : 'Save Changes'}
                                    </Button>
                                    {calendarModalMode === 'edit' && (
                                        <Button color="red" onClick={handleDeleteCalendarTask}>Delete Task</Button>
                                    )}
                                </Stack>
                            </Modal>
                        </Tabs.Panel>

                        <Tabs.Panel value="finance" style={{ backgroundColor: styles.tabPanelBackground, padding: rem(20), borderRadius: rem(8), marginTop: rem(20), border: styles.cardBorder, boxShadow: styles.cardShadow }}>
                            <Title order={3} style={{ color: styles.textColor }} mb="md">Project Finance</Title>

                            <Group mb="md" justify="space-between">
                                <TextInput
                                    label="Project Budget"
                                    type="number"
                                    value={financeBudget}
                                    onChange={(e) => saveFinance({ ...{ budget: financeBudget, currency: financeCurrency, expenses: financeExpenses }, budget: parseFloat(e.currentTarget.value) || 0 })}
                                    leftSection={<Text size="sm">{financeCurrency}</Text>}
                                    rightSection={<Select data={['BTC', 'USD', 'EUR', 'GBP', 'JPY', 'ZMW', 'MWK']} value={financeCurrency} onChange={(value) => saveFinance({ ...{ budget: financeBudget, currency: financeCurrency, expenses: financeExpenses }, currency: value || 'BTC' })} style={{ minWidth: 80, height: 36, fontWeight: 500, fontSize: 14, borderRadius: 8 }} />}
                                    style={{ width: 180 }}
                                />
                                <Button onClick={() => setAddExpenseModalOpen(true)}>Add New Expense</Button>
                            </Group>

                            <Text size="lg" fw={600} mb="md">Total Expenses: {financeCurrency} {totalExpenses.toFixed(2)}</Text>
                            <Text size="lg" fw={600} mb="md" color={remainingBudget < 0 ? 'red' : 'green'}>Remaining Budget: {financeCurrency} {remainingBudget.toFixed(2)}</Text>

                            <Modal opened={addExpenseModalOpen} onClose={() => setAddExpenseModalOpen(false)} title="Add New Expense">
                                <Stack>
                                    <TextInput
                                        label="Description"
                                        placeholder="Expense description"
                                        value={newExpense.description}
                                        onChange={(e) => setNewExpense({ ...newExpense, description: e.currentTarget.value })}
                                        required
                                    />
                                    <TextInput
                                        label="Amount"
                                        type="number"
                                        placeholder="0.00"
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.currentTarget.value) || 0 })}
                                        required
                                    />
                                    <TextInput
                                        label="Date"
                                        type="date"
                                        value={newExpense.date}
                                        onChange={(e) => setNewExpense({ ...newExpense, date: e.currentTarget.value })}
                                        required
                                    />
                                    <Group grow>
                                        <TextInput
                                            label="Category"
                                            placeholder="e.g., Travel, Software"
                                            value={newExpense.category}
                                            onChange={(e) => setNewExpense({ ...newExpense, category: e.currentTarget.value })}
                                            required
                                        />
                                        <Button size="xs" onClick={handleSuggestCategory} loading={categorySuggesting} leftSection={<IconSparkles size={16} />}>Suggest Category</Button>
                                    </Group>
                                    {categorySuggestError && <Text color="red">{categorySuggestError}</Text>}
                                    <Select
                                        label="Link to Task (Optional)"
                                        data={tasks.map(t => ({ value: t.id, label: t.title }))}
                                        value={newExpense.linkedTaskId}
                                        onChange={(value) => setNewExpense({ ...newExpense, linkedTaskId: value || undefined })}
                                        clearable
                                    />
                                    <TextInput
                                        label="Receipt URL (Optional)"
                                        placeholder="URL to receipt image or document"
                                        value={newExpense.receiptUrl}
                                        onChange={(e) => setNewExpense({ ...newExpense, receiptUrl: e.currentTarget.value })}
                                    />
                                    <Button onClick={handleAddExpense}>Add Expense</Button>
                                </Stack>
                            </Modal>

                            <Divider my="md" />

                            <Title order={4} mb="md">Expense Breakdown by Category</Title>
                            <Box style={{ background: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                            {categoryData.length > 0 ? (
                                <Center>
                                    <PieChart
                                        data={categoryData}
                                        withLabels
                                        labelsType="value"
                                        size={isMobile ? 200 : 280}
                                        valueFormatter={(value: number) => `${financeCurrency} ${value.toFixed(2)}`}
                                    />
                                </Center>
                            ) : (
                                <Center>
                                  <PieChart
                                    data={[{ name: 'No Data', value: 1, color: '#dee2e6' }]}
                                    withLabels
                                    labelsType="value"
                                    size={isMobile ? 200 : 280}
                                    valueFormatter={() => ''}
                                  />
                                </Center>
                              )}
                              {categoryData.length === 0 && (
                                <Text color="dimmed" ta="center" mt="sm">No expenses to categorize yet.</Text>
                            )}
                            </Box>

                            <Divider my="md" />

                            <Title order={4} mb="md">Expenses Over Time</Title>
                            <Box style={{ background: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                            {monthlyChartData.length > 0 ? (
                                <Box h={isMobile ? 200 : 300}>
                                    <BarChart
                                        data={monthlyChartData}
                                        dataKey="monthYear"
                                        series={[{ name: 'expenses', color: 'blue.6' }]}
                                        yAxisLabel={`Amount (${financeCurrency})`}
                                        orientation="vertical"
                                    />
                                </Box>
                            ) : (
                                <Box h={isMobile ? 200 : 300} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <BarChart
                                    data={[{ monthYear: 'No Data', expenses: 1 }]}
                                    dataKey="monthYear"
                                    series={[{ name: 'expenses', color: '#dee2e6' }]}
                                    yAxisLabel={`Amount (${financeCurrency})`}
                                    orientation="vertical"
                                  />
                                </Box>
                              )}
                              {monthlyChartData.length === 0 && (
                                <Text color="dimmed" ta="center" mt="sm">No historical expense data yet.</Text>
                            )}
                            </Box>

                            <Divider my="md" />

                            <Title order={4} mb="md">All Expenses</Title>
                            {financeExpenses.length === 0 ? (
                                <Text color="dimmed">No expenses recorded yet.</Text>
                            ) : (
                                <Stack>
                                    {financeExpenses.map(exp => (
                                        <Paper key={exp.id} p="sm" shadow="xs" withBorder style={{ borderColor: styles.cardBorder }}>
                                            <Group justify="space-between" align="center">
                                                <Stack gap={2}>
                                                    <Text fw={500}>{exp.description}</Text>
                                                    <Group gap={4}>
                                                      <Text size="sm">{financeCurrency} {exp.amount.toFixed(2)} • {exp.date}</Text>
                                                      <Badge variant="light">{exp.category}</Badge>
                                                    </Group>
                                                    {exp.linkedTaskId && <Text size="xs" color="dimmed">Linked to: {tasks.find(t => t.id === exp.linkedTaskId)?.title || 'Unknown Task'}</Text>}
                                                    {exp.receiptUrl && <Text size="xs"><a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer">View Receipt</a></Text>}
                                                </Stack>
                                                <ActionIcon variant="light" color="red" onClick={() => handleDeleteExpense(exp.id)}>
                                                    <IconTrash size={18} />
                                                </ActionIcon>
                                                <ActionIcon variant="light" color="blue" onClick={() => handleEditExpense(exp)} title="Edit Expense">
                                                    <IconEdit size={18} />
                                                </ActionIcon>
                                            </Group>
                                        </Paper>
                                    ))}
                                </Stack>
                            )}

                            <Divider my="md" />

                            <Title order={4} mb="md">AI Finance Assistant</Title>
                            <Textarea
                                placeholder="Ask a question about your project's finances (e.g., 'What are my total expenses for marketing?', 'How much budget is left?')"
                                value={financeAiQuestion}
                                onChange={(e) => setFinanceAiQuestion(e.currentTarget.value)}
                                minRows={3}
                                mb="sm"
                            />
                            <Button onClick={handleAskFinanceAi} loading={financeAiLoading} leftSection={<IconRobot size={18} />}>Ask AI</Button>
                            {financeAiError && <Text color="red" mt="sm">{financeAiError}</Text>}
                            {financeAiAnswer && (
                                <Paper p="md" shadow="sm" withBorder mt="md" style={{ backgroundColor: styles.cardBackground }}>
                                    <Text fw={500} mb="xs">AI Answer:</Text>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{financeAiAnswer}</ReactMarkdown>
                                </Paper>
                            )}
                        </Tabs.Panel>

                        <Tabs.Panel value="ai_assistants" style={{ backgroundColor: styles.tabPanelBackground, padding: rem(20), borderRadius: rem(8), marginTop: rem(20), border: styles.cardBorder, boxShadow: styles.cardShadow }}>
                            <Title order={3} style={{ color: styles.textColor }} mb="md">AI Assistants</Title>
                            <Stack>
                                <AskAI />
                                <AIInsightsPanel />
                                <AISentimentInsights />
                                <AIWorkflowAutomation />
                                <AIRiskAlerts />
                            </Stack>
                            <Divider my="md" />
                            <Title order={4} style={{ color: styles.textColor }} mb="md">Document Transition AI</Title>
                            <Text size="sm" color="dimmed" mb="md">
                                Use AI to help transition content from one document to another. Select a source document and a target document.
                            </Text>
                            <Group grow mb="md">
                                <Select
                                    label="Source Document"
                                    placeholder="Select source"
                                    data={docTabs.map(tab => ({ value: tab.id, label: tab.title }))}
                                    value={transitionSource}
                                    onChange={(value) => setTransitionSource(value)}
                                />
                                <Select
                                    label="Target Document"
                                    placeholder="Select target"
                                    data={docTabs.map(tab => ({ value: tab.id, label: tab.title }))}
                                    value={transitionTarget}
                                    onChange={(value) => setTransitionTarget(value)}
                                />
                            </Group>
                            <Button
                                onClick={async () => {
                                    if (!transitionSource || !transitionTarget) {
                                        showNotification({ title: 'Error', message: 'Please select both source and target documents.', color: 'red' });
                                        return;
                                    }
                                    setTransitionLoading(true);
                                    try {
                                        const sourceContent = (docRows[transitionSource] || []).join('\n');
                                        const targetContent = (docRows[transitionTarget] || []).join('\n');

                                        const gemini = getGeminiClient();
                                        const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
                                        const prompt = `Facilitate the transition of key information from the source document to the target document.
                                        Source Document Content:\n${sourceContent}\n\n
                                        Target Document Content:\n${targetContent}\n\n
                                        Identify what information is missing or needs to be adapted from the source to enrich or complete the target. Provide specific suggestions or direct content to add/modify in the target document.`;
                                        const result = await model.generateContent(prompt);
                                        const aiResult = result.response.text().trim();
                                        setTransitionResult(aiResult);
                                    } catch (err: any) {
                                        showNotification({ title: 'AI Error', message: err.message || 'Failed to generate transition guidance.', color: 'red' });
                                    } finally {
                                        setTransitionLoading(false);
                                    }
                                }}
                                loading={transitionLoading}
                                leftSection={<IconSparkles size={18} />}
                            >
                                Generate Transition Guidance
                            </Button>
                            {transitionResult && (
                                <Paper p="md" shadow="sm" withBorder mt="md" style={{ backgroundColor: styles.cardBackground }}>
                                    <Text fw={500} mb="xs">AI Transition Guidance:</Text>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{transitionResult}</ReactMarkdown>
                                </Paper>
                            )}
                        </Tabs.Panel>
                        <Tabs.Panel value="directives_hub" style={{ backgroundColor: styles.tabPanelBackground, padding: rem(20), borderRadius: rem(8), marginTop: rem(20), border: styles.cardBorder, boxShadow: styles.cardShadow }}>
                            <DirectivesHubPage />
                        </Tabs.Panel>
                        <Tabs.Panel value="target_groups" style={{ backgroundColor: styles.tabPanelBackground, padding: rem(20), borderRadius: rem(8), marginTop: rem(20), border: styles.cardBorder, boxShadow: styles.cardShadow }}>
                            <TargetGroupsPage />
                        </Tabs.Panel>
                    </Tabs>
                </Container>
                <Container fluid py="sm" style={{ backgroundColor: styles.cardBackground, borderTop: styles.cardBorder, boxShadow: '0 -2px 8px rgba(0,0,0,0.03)' }}>
                    <Text size="sm" color="dimmed" ta="center">&copy; {new Date().getFullYear()} SparkPad. All rights reserved.</Text>
                </Container>
                <ActionIcon
                    variant="light"
                    color="gray"
                    size={36}
                    onClick={() => setSettingsOpened(true)}
                    title="Project Settings"
                    style={{ marginLeft: rem(12) }}
                >
                    <IconSettings size={22} />
                </ActionIcon>
                <FloatingAssistant
                    currentTab={activeTab}
                    userName={userName}
                    onAddTask={(title: string) => {
                        const now = new Date().toISOString();
                        const newTask = {
                            id: Date.now().toString(),
                            title,
                            description: 'Added from AI action item',
                            assignee: '',
                            status: 'todo' as Task['status'],
                            priority: 'medium' as Task['priority'],
                            dueDate: '',
                            createdAt: now,
                            updatedAt: now,
                        };
                        saveTasks([...tasks, newTask]);
                        showNotification({ title: 'Task Added', message: `Task "${title}" added from AI action item.`, color: 'green' });
                    }}
                />
            </Box>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
            <Modal opened={!!editingExpense} onClose={handleCancelEditExpense} title="Edit Expense">
              <Stack>
                <TextInput
                  label="Description"
                  value={editExpenseData.description || ''}
                  onChange={e => setEditExpenseData({ ...editExpenseData, description: e.currentTarget.value })}
                  required
                />
                <TextInput
                  label="Amount"
                  type="number"
                  value={editExpenseData.amount || ''}
                  onChange={e => setEditExpenseData({ ...editExpenseData, amount: parseFloat(e.currentTarget.value) || 0 })}
                  required
                />
                <TextInput
                  label="Date"
                  type="date"
                  value={editExpenseData.date || ''}
                  onChange={e => setEditExpenseData({ ...editExpenseData, date: e.currentTarget.value })}
                  required
                />
                <TextInput
                  label="Category"
                  value={editExpenseData.category || ''}
                  onChange={e => setEditExpenseData({ ...editExpenseData, category: e.currentTarget.value })}
                  required
                />
                <TextInput
                  label="Receipt URL (Optional)"
                  value={editExpenseData.receiptUrl || ''}
                  onChange={e => setEditExpenseData({ ...editExpenseData, receiptUrl: e.currentTarget.value })}
                />
                <Button onClick={handleSaveEditExpense}>Save Changes</Button>
                <Button variant="light" color="red" onClick={handleCancelEditExpense}>Cancel</Button>
              </Stack>
            </Modal>
            <Modal opened={settingsOpened} onClose={() => setSettingsOpened(false)} title="Project Settings" centered>
              <Stack>
                <Title order={4}>Add Member</Title>
                <TextInput
                  label="Username or Email"
                  placeholder="Enter username or email"
                  value={newMemberEmail}
                  onChange={e => setNewMemberEmail(e.currentTarget.value)}
                  disabled={adding}
                />
                <Button onClick={handleAddMember} loading={adding} disabled={!newMemberEmail.trim()}>
                  Add Member
                </Button>
                <Divider my="md" />
                <Title order={5} mb="xs">Current Members</Title>
                <Stack gap={4}>
                  {project?.members?.map((member: string) => (
                    <Group key={member} justify="space-between">
                      <Text>{member}</Text>
                      {project.members.length > 1 && member !== localStorage.getItem("user:username") && (
                        <ActionIcon color="red" variant="light" onClick={() => handleRemoveMember(member)} size={24}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  ))}
                </Stack>
              </Stack>
            </Modal>
        </>
    );
}

// Move AudioPlayer definition above ProjectViewPage and ensure it returns JSX
function AudioPlayer({ audioKey, audioURLs, setAudioURLs }: { audioKey: string, audioURLs: { [key: string]: string }, setAudioURLs: React.Dispatch<React.SetStateAction<{ [key: string]: string }>> }) {
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        let url = audioURLs[audioKey];
        let revoked = false;
        async function loadAudio() {
            if (!url) {
                setLoading(true);
                // If audioKey looks like a URL, use it directly
                if (audioKey.startsWith('http')) {
                    setAudioURLs(prev => ({ ...prev, [audioKey]: audioKey }));
                    setLoading(false);
                    return;
                }
                // Otherwise, fetch from Civil Memory
                const blob = await fetchAudioFromCivilMemory(audioKey);
                if (blob && !revoked) {
                    url = URL.createObjectURL(blob);
                    setAudioURLs(prev => ({ ...prev, [audioKey]: url }));
                }
                setLoading(false);
            }
        }
        loadAudio();
        return () => {
            if (url) URL.revokeObjectURL(url);
            revoked = true;
        };
    }, [audioKey]);
    if (loading) return <Text size="xs" color="dimmed">Loading audio...</Text>;
    if (!audioURLs[audioKey]) return <Text size="xs" color="dimmed">Audio not found.</Text>;
    return (
        <audio controls src={audioURLs[audioKey]} style={{ width: '100%', marginTop: 4 }}>
            Your browser does not support the audio element.
        </audio>
    );
}