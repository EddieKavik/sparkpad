"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Container, Title, Tabs, Box, Text, Loader, Center, Group, TextInput, Button, Stack, Modal, ActionIcon, rem, Menu, Avatar, Paper, MultiSelect, Textarea, Badge, Divider, Select, Accordion, Popover } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconSettings, IconDots, IconTrash, IconArrowLeft, IconSend, IconFile, IconMoodSmile, IconRobot, IconEdit, IconSparkles, IconChevronDown, IconChevronUp, IconDownload, IconUpload, IconWorld, IconSearch } from "@tabler/icons-react";
import { getGeminiClient } from "@/utils/gemini";
import { useTheme } from '@/contexts/ThemeContext';
import { useDisclosure } from '@mantine/hooks';
import ReactMarkdown from 'react-markdown';
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
    let ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:Sparkpad\nCALSCALE:GREGORIAN\n`;
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
    const [docTabs, setDocTabs] = useState<DocTab[]>([{ id: "default", title: "Documents" }]);
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
    const styles = themeStyles['executive'];
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
    const DOCS_PER_PAGE = 5;

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
    const [tagFilter, setTagFilter] = useState<string[]>([]);
    const allTags = Array.from(new Set(docTabs.flatMap(tab => tab.tags || [])));
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
            const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
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
                const res = await fetch(`http://localhost:3333/chat?mode=disk&key=${encodeURIComponent(pid)}`);
                if (res.ok) {
                    const data = await res.json();
                    setChatMessages(Array.isArray(data) ? data : []);
                }
            } catch { }
        };
        fetchChat();
        const interval = setInterval(fetchChat, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [projectId]);

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
            const newMsg = {
                id: Date.now(),
                sender: userEmail,
                senderName,
                timestamp: new Date().toISOString(),
                content,
                type,
                fileUrl,
                reactions: []
            };
            const updated = [...chatMessages, newMsg];
            setChatMessages(updated);
            await fetch(`http://localhost:3333/chat?mode=disk&key=${encodeURIComponent(pid)}`, {
                method: "POST",
                body: JSON.stringify(updated),
            });
            setChatInput("");

            // Notify all project members except the sender
            if (project && Array.isArray(project.members)) {
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
                    const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
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
                    await fetch(`http://localhost:3333/chat?mode=disk&key=${encodeURIComponent(pid)}`, {
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
            headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
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
        const res = await fetch(`/api/projects/${projectId}/research?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchResearchItems();
            showNotification({ title: 'Deleted', message: 'Research item deleted.', color: 'red' });
        }
    };

    const handleSummarizeResearch = async (item: any) => {
        setSummarizingId(item.id);
        try {
            const gemini = getGeminiClient();
            const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Summarize the following research for a project team in 2-3 sentences.\n\nTitle: ${item.title}\nType: ${item.type}\nContent: ${item.content}`;
            const result = await model.generateContent(prompt);
            const summary = result.response.text().trim();
            if (!summary) throw new Error("No summary generated");
            // Save summary to item (send full item)
            const res = await fetch(`/api/projects/${projectId}/research?id=${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
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

    // Helper to get all unique tags from researchItems
    const allResearchTags = Array.from(new Set(researchItems.flatMap((item: any) => item.tags || [])));

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
        const newComment = { id: Date.now().toString(), author: userName || 'anonymous', content: comment, createdAt: new Date().toISOString(), };
        const updatedComments = [...(item.annotations || []), newComment];
        const res = await fetch(`/api/projects/${projectId}/research?id=${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
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
            const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Suggest 3-5 concise, relevant tags (as a comma-separated list) for the following research item.\nTitle: ${newResearch.title}\nType: ${newResearch.type}\nContent: ${newResearch.content}`;
            const result = await model.generateContent(prompt);
            const tags = result.response.text().split(/,|\n/).map(t => t.trim()).filter(Boolean);
            setNewResearch(r => ({ ...r, tags: Array.from(new Set([...(r.tags || []), ...tags])) }));
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
            const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
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

    // Fetch Q&A pairs from backend
    useEffect(() => {
        if (!projectId) return;
        const fetchQA = async () => {
            try {
                const res = await fetch(`/api/projects/${projectId}/research/qa`);
                if (res.ok) {
                    const data = await res.json();
                    setQaHistory(Array.isArray(data) ? data : []);
                }
            } catch { }
        };
        fetchQA();
    }, [projectId]);

    // Handler for AI Q&A (with history and follow-up)
    const handleAskResearchAI = async () => {
        if (!qaQuestion.trim()) return;
        setQaLoading(true);
        setQaError("");
        setQaAnswer("");
        try {
            const gemini = getGeminiClient();
            const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });

            // Compose context from all research items
            const context = researchItems.map((item: any) => `Title: ${item.title}\nType: ${item.type}\nContent: ${item.content}\nTags: ${(item.tags || []).join(", ")}\n`).join("\n---\n");

            // Compose Q&A history for context
            const historyText = qaHistory.map((pair, i) => `Q${i + 1}: ${pair.question}\nA${i + 1}: ${pair.answer}`).join("\n");

            // Improved prompt
            let prompt = `You are an expert research assistant. Given the following project research items, answer the user's question concisely and helpfully.\n\nResearch Items:\n${context}`;
            if (historyText) {
                prompt += `\n\nPrevious Q&A:\n${historyText}`;
            }
            if (isFollowup && qaHistory.length > 0) {
                prompt += `\n\nThe next question is a follow-up to the previous answer.`;
            }
            prompt += `\n\nQuestion: ${qaQuestion}`;

            const result = await model.generateContent(prompt);
            const answer = result.response.text().trim();
            setQaAnswer(answer);

            // Save to backend
            const user = localStorage.getItem("user");
            const userName = user ? JSON.parse(user).name : "anonymous";
            const res = await fetch(`/api/projects/${projectId}/research/qa`, {
                method: "POST",
                headers: { "Content-Type": "application/json", user: userName },
                body: JSON.stringify({ question: qaQuestion, answer, createdBy: userName }),
            });

            if (res.status === 401 || res.status === 403) {
                showNotification({ title: "Unauthorized", message: "You are not allowed to add Q&A.", color: "red" });
                setQaLoading(false);
                return;
            }

            if (res.ok) {
                const newPair = await res.json();
                setQaHistory(h => [...h, newPair]);
            }
            setIsFollowup(false);
        } catch (err: any) {
            setQaError(err.message || "AI failed to answer.");
        } finally {
            setQaLoading(false);
        }
    };

    // Handler to start a follow-up
    const handleFollowup = () => {
        if (qaHistory.length === 0) return;
        setQaQuestion("");
        setIsFollowup(true);
    };

    // Handler to delete a Q&A pair
    const handleDeleteQAPair = async (id: string) => {
        if (!window.confirm("Delete this Q&A pair?")) return;
        const user = localStorage.getItem("user");
        const userName = user ? JSON.parse(user).name : "anonymous";
        const res = await fetch(`/api/projects/${projectId}/research/qa?id=${id}`, { method: "DELETE", headers: { user: userName } });
        if (res.ok) {
            setQaHistory(h => h.filter(pair => pair.id !== id));
        }
    };

    const handleStartEditQAPair = (pair: any) => setEditQAPair(pair);
    const handleCancelEditQAPair = () => setEditQAPair(null);
    const handleSaveEditQAPair = async () => {
        if (!editQAPair) return;
        setEditQALoading(true);
        try {
        const user = localStorage.getItem("user");
        const userName = user ? JSON.parse(user).name : "anonymous";
        const res = await fetch(`/api/projects/${projectId}/research/qa?id=${editQAPair.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", user: userName },
                body: JSON.stringify(editQAPair),
            });
        if (res.ok) {
                setQaHistory(h => h.map(pair => pair.id === editQAPair.id ? editQAPair : pair));
            setEditQAPair(null);
                showNotification({ title: "Updated", message: "Q&A pair updated.", color: "green" });
            } else {
                showNotification({ title: "Error", message: "Failed to update Q&A pair.", color: "red" });
            }
        } catch (err: any) {
            showNotification({ title: "Error", message: err.message || "Failed to update Q&A pair.", color: "red" });
        } finally {
            setEditQALoading(false);
        }
    };

    const filteredQaHistory = qaHistory.filter(
        (pair) =>
            pair.question.toLowerCase().includes(qaSearch.toLowerCase()) ||
            pair.answer.toLowerCase().includes(qaSearch.toLowerCase())
    );

    // Save tasks to Civil Memory
    const saveTasks = async (updatedTasks: Task[]) => {
        if (!projectId || Array.isArray(projectId)) return;
            const userEmail = localStorage.getItem("user:username");
        if (!userEmail) return;
        try {
            await fetch(`http://localhost:3333/tasks?mode=disk&key=${encodeURIComponent(userEmail)}:${encodeURIComponent(projectId)}`, {
                    method: "POST",
                body: JSON.stringify(updatedTasks),
            });
        } catch {
            showNotification({ title: "Error", message: "Failed to save tasks.", color: "red" });
        }
    };

    // Load tasks from Civil Memory on mount
    useEffect(() => {
        const fetchTasks = async () => {
            if (!projectId || Array.isArray(projectId)) return;
            try {
                const userEmail = localStorage.getItem("user:username");
                if (!userEmail) return;
                const res = await fetch(`http://localhost:3333/tasks?mode=disk&key=${encodeURIComponent(userEmail)}:${encodeURIComponent(projectId)}`);
                if (res.ok) {
                    const data = await res.json();
                    setTasks(Array.isArray(data) ? data : []);
                }
            } catch { }
        };
        fetchTasks();
    }, [projectId]);

    const handleAddTask = async () => {
        if (!newTask.title) return;
        setAddingTask(true);
        const now = new Date().toISOString();
        const taskToAdd: Task = {
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
        const updatedTasks = [...tasks, taskToAdd];
        setTasks(updatedTasks);
        await saveTasks(updatedTasks);
        setNewTask({ title: '', description: '', assignee: '', status: 'todo', priority: 'medium', dueDate: '' });
        setAddingTask(false);
        showNotification({ title: 'Task Added', message: `Task "${taskToAdd.title}" has been added.`, color: 'green' });
    };

    const handleEditTask = (task: Task) => {
        setEditingTaskId(task.id);
        setEditTask({ ...task });
    };

    const handleSaveTask = async () => {
        if (!editingTaskId || !editTask.title) return;
        const now = new Date().toISOString();
        const updatedTasks = tasks.map(t =>
            t.id === editingTaskId ? { ...t, ...editTask, updatedAt: now } : t
        ) as Task[];
        setTasks(updatedTasks);
        await saveTasks(updatedTasks);
        setEditingTaskId(null);
        setEditTask({});
        showNotification({ title: 'Task Updated', message: `Task "${editTask.title}" has been updated.`, color: 'green' });
    };

    const handleDeleteTask = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        const updatedTasks = tasks.filter(t => t.id !== id);
        setTasks(updatedTasks);
        await saveTasks(updatedTasks);
        showNotification({ title: 'Task Deleted', message: 'Task has been deleted.', color: 'red' });
    };

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) {
            return;
        }

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        const updatedTasks = Array.from(tasks);
        const movedTaskIndex = updatedTasks.findIndex(task => task.id === draggableId);
        if (movedTaskIndex === -1) return;

        const [movedTask] = updatedTasks.splice(movedTaskIndex, 1);

        if (source.droppableId === destination.droppableId) {
            updatedTasks.splice(destination.index, 0, movedTask);
        } else {
            // Moving between columns (statuses)
            movedTask.status = destination.droppableId as Task['status'];
            updatedTasks.splice(destination.index, 0, movedTask);
        }

        setTasks(updatedTasks);
        saveTasks(updatedTasks);
    };

    const statuses: Task['status'][] = ['todo', 'in-progress', 'blocked', 'done'];
    const priorities: Task['priority'][] = ['low', 'medium', 'high', 'critical'];

    const getStatusColor = (status: Task['status']) => {
        switch (status) {
            case 'todo': return 'gray';
            case 'in-progress': return 'blue';
            case 'blocked': return 'red';
            case 'done': return 'green';
            default: return 'gray';
        }
    };

    const getPriorityColor = (priority: Task['priority']) => {
        switch (priority) {
            case 'low': return 'lime';
            case 'medium': return 'orange';
            case 'high': return 'red';
            case 'critical': return 'purple';
            default: return 'gray';
        }
    };

    // File handling
    const saveFiles = async (updatedFiles: any[]) => {
        if (!projectId || Array.isArray(projectId)) return;
        const userEmail = localStorage.getItem("user:username");
        if (!userEmail) return;
        try {
            await fetch(`http://localhost:3333/files?mode=disk&key=${encodeURIComponent(userEmail)}:${encodeURIComponent(projectId)}`, {
                method: "POST",
                body: JSON.stringify(updatedFiles),
            });
        } catch {
            showNotification({ title: "Error", message: "Failed to save files.", color: "red" });
        }
    };

    useEffect(() => {
        const fetchFiles = async () => {
            if (!projectId || Array.isArray(projectId)) return;
            try {
                const userEmail = localStorage.getItem("user:username");
                if (!userEmail) return;
                const res = await fetch(`http://localhost:3333/files?mode=disk&key=${encodeURIComponent(userEmail)}:${encodeURIComponent(projectId)}`);
                if (res.ok) {
                    const data = await res.json();
                    setFiles(Array.isArray(data) ? data : []);
                }
            } catch { }
        };
        fetchFiles();
    }, [projectId]);

    const handleFileDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setUploading(true);
        setUploadError(null);

        const droppedFiles = Array.from(event.dataTransfer.files);
        if (droppedFiles.length === 0) {
            setUploading(false);
            return;
        }

        const newFiles = await Promise.all(droppedFiles.map(async (file) => {
            const dataUrl = await fileToDataUrl(file);
            return {
                    id: Date.now().toString(),
                    name: file.name,
                type: file.type,
                    size: file.size,
                dataUrl: dataUrl,
                uploadedAt: new Date().toISOString(),
            };
        }));

        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        await saveFiles(updatedFiles);

        setUploading(false);
                    showNotification({
            title: 'Files Uploaded',
            message: `${newFiles.length} file(s) uploaded successfully.`,
            color: 'green',
        });
    };

    const handleFileDelete = async (fileId: string) => {
        if (!window.confirm("Are you sure you want to delete this file?")) return;
        const updatedFiles = files.filter(f => f.id !== fileId);
        setFiles(updatedFiles);
        await saveFiles(updatedFiles);
        showNotification({ title: 'File Deleted', message: 'File has been deleted.', color: 'red' });
    };

    const handleFileDownload = (file: any) => {
        try {
            saveAs(file.dataUrl, file.name);
            showNotification({ title: 'Download Started', message: `Downloading ${file.name}`, color: 'green' });
        } catch (error) {
            showNotification({ title: 'Download Failed', message: `Could not download ${file.name}`, color: 'red' });
            console.error('Download error:', error);
        }
    };

    // Calendar events
    const calendarEvents = tasks
        .filter(task => task.dueDate)
        .map(task => ({
            id: task.id,
            title: task.title,
            start: new Date(task.dueDate),
            end: new Date(task.dueDate), // For full-day events, start and end are the same
            allDay: true,
            resource: task,
        }));

    const handleSelectEvent = (event: any) => {
        const task = event.resource as Task;
        setCalendarTask({ ...task });
        setCalendarSelectedDate(new Date(task.dueDate));
        setCalendarModalMode('edit');
        setCalendarModalOpen(true);
    };

    const handleSelectSlot = ({ start }: { start: Date }) => {
        setCalendarSelectedDate(start);
        setCalendarTask({
            title: '',
            description: '',
            assignee: '',
            status: 'todo',
            priority: 'medium',
            dueDate: start.toISOString().split('T')[0], // Format for date input
        });
        setCalendarModalMode('add');
        setCalendarModalOpen(true);
    };

    const handleCalendarModalSave = async () => {
        if (!calendarTask.title || !calendarSelectedDate) {
            showNotification({ title: 'Error', message: 'Task title and due date are required.', color: 'red' });
            return;
        }

        const now = new Date().toISOString();
        if (calendarModalMode === 'add') {
            const newTaskToAdd: Task = {
                id: Date.now().toString(),
                title: calendarTask.title,
                description: calendarTask.description || '',
                assignee: calendarTask.assignee || '',
                status: calendarTask.status || 'todo',
                priority: calendarTask.priority || 'medium',
                dueDate: calendarSelectedDate.toISOString(),
                createdAt: now,
                updatedAt: now,
            };
            const updatedTasks = [...tasks, newTaskToAdd];
            setTasks(updatedTasks);
            await saveTasks(updatedTasks);
            showNotification({ title: 'Task Added', message: `Task "${newTaskToAdd.title}" added to calendar.`, color: 'green' });
        } else if (calendarModalMode === 'edit' && calendarTask.id) {
            const updatedTasks = tasks.map(t =>
                t.id === calendarTask.id ? { ...t, ...calendarTask, dueDate: calendarSelectedDate.toISOString(), updatedAt: now } : t
            ) as Task[];
            setTasks(updatedTasks);
            await saveTasks(updatedTasks);
            showNotification({ title: 'Task Updated', message: `Task "${calendarTask.title}" updated.`, color: 'green' });
        }
        setCalendarModalOpen(false);
        setCalendarTask({});
        setCalendarSelectedDate(null);
    };

    const handleCalendarModalDelete = async () => {
        if (!calendarTask.id) return;
        if (!window.confirm("Are you sure you want to delete this task from the calendar?")) return;
        const updatedTasks = tasks.filter(t => t.id !== calendarTask.id);
        setTasks(updatedTasks);
        await saveTasks(updatedTasks);
        showNotification({ title: 'Task Deleted', message: 'Task removed from calendar.', color: 'red' });
        setCalendarModalOpen(false);
        setCalendarTask({});
        setCalendarSelectedDate(null);
    };

    const projectContext = {
        name: project?.name,
        members: project?.members,
        docTabs: docTabs,
        docRows: docRows,
        researchItems: researchItems,
        tasks: tasks,
        files: files,
        chatMessages: chatMessages,
        qaHistory: qaHistory,
        currentTab: activeTab,
        activeDocTab: activeDocTab,
    };

    const aiContext = `Project: ${project?.name}\nMembers: ${(project?.members || []).join(', ')}\nTasks: ${tasks.length} total\nFiles: ${files.length} uploaded`;

    // Handler for AI finance Q&A
    async function handleAskFinanceAI() {
      if (!financeAiQuestion.trim()) return;
      setFinanceAiLoading(true);
      setFinanceAiError('');
      setFinanceAiAnswer('');
      try {
        const gemini = getGeminiClient();
        const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
        // Compose context from budget and expenses
        const context = `Project Budget: ${financeCurrency} ${financeBudget}\nExpenses:\n` +
          financeExpenses.map(e => `- ${e.description} (${e.category}): ${financeCurrency} ${e.amount} on ${e.date}`).join("\n");
        const prompt = `${context}\n\nQuestion: ${financeAiQuestion}`;
        const result = await model.generateContent(prompt);
        const answer = result.response.text().trim();
        setFinanceAiAnswer(answer);
      } catch (err: any) {
        setFinanceAiError(err.message || 'AI failed to answer.');
      } finally {
        setFinanceAiLoading(false);
      }
    }

    // Handler for AI category suggestion
    async function handleSuggestCategory() {
      if (!newExpense.description) return;
      setCategorySuggesting(true);
      setCategorySuggestError('');
      try {
        const gemini = getGeminiClient();
        const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Suggest a concise expense category for: "${newExpense.description}". Only return the category name, e.g. Travel, Software, Supplies, Meals, etc.`;
        const result = await model.generateContent(prompt);
        const suggestion = result.response.text().trim().split(/\n|\r/)[0];
        setNewExpense(exp => ({ ...exp, category: suggestion }));
      } catch (err: any) {
        setCategorySuggestError(err.message || 'AI failed to suggest category.');
      } finally {
        setCategorySuggesting(false);
      }
    }

    // --- Add handler for AI transition calculation ---
    async function handleCalculateTransition() {
      if (!transitionSource || !transitionTarget) return;
      setTransitionLoading(true);
      setTransitionResult(null);
      try {
        const sourceTitle = docTabs.find(t => t.id === transitionSource)?.title || 'Source';
        const targetTitle = docTabs.find(t => t.id === transitionTarget)?.title || 'Target';
        const sourceRows = (docRows[transitionSource] || []).join('\n');
        const targetRows = (docRows[transitionTarget] || []).join('\n');
        const prompt = `Given the following two documents in a project management system, analyze the transition from the first (source) to the second (target).\n\nSource document: ${sourceTitle}\nRows:\n${sourceRows}\n\nTarget document: ${targetTitle}\nRows:\n${targetRows}\n\nPlease provide a detailed report on what is required to transition from the source to the target. For example, if the source lists available ingredients and the target lists recipe steps, check if all required ingredients are available, and report any missing or insufficient items. Suggest what actions are needed to complete the transition.`;
        const gemini = getGeminiClient();
        const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const aiText = result.response.text().trim();
        setTransitionResult(aiText);
      } catch (err: any) {
        setTransitionResult('AI analysis failed.');
        showNotification({ color: 'red', message: 'AI analysis failed.' });
      }
      setTransitionLoading(false);
    }
    // ... existing code ...

    if (loading || !project) {
        return (
            <Center style={{ height: "100vh" }}>
                <Loader />
            </Center>
        );
    }

    const filteredDocRows = (docRows[activeDocTab] || []).filter(row =>
        typeof row === "string" && row.toLowerCase().includes(docSearch.toLowerCase())
    );
    const totalDocPages = Math.ceil(filteredDocRows.length / DOCS_PER_PAGE);
    const paginatedDocRows = filteredDocRows.slice((docPage - 1) * DOCS_PER_PAGE, docPage * DOCS_PER_PAGE);

    // Inside the Finance tab, above the budget/expense form ...
    const pieColors = [
      'blue', 'cyan', 'teal', 'green', 'yellow', 'orange', 'red', 'grape', 'violet', 'indigo', 'pink', 'lime', 'gray',
    ];
    const pieData = Object.entries(
      financeExpenses.reduce((acc, e) => {
        acc[e.category || 'Uncategorized'] = (acc[e.category || 'Uncategorized'] || 0) + (e.amount || 0);
        return acc;
      }, {} as Record<string, number>)
    ).map(([category, value], i) => ({ name: category, value, color: pieColors[i % pieColors.length] }));

    // Handler for translating a document's title and rows
    const handleTranslateDocument = async (docId: string, lang: string) => {
      try {
        const userEmail = localStorage.getItem("user:username");
        if (!userEmail) return;

        // Get the document tab and rows
        const docTab = docTabs.find(tab => tab.id === docId);
        if (!docTab) return;

        const rows = docRows[docId] || [];
        if (rows.length === 0) {
          showNotification({ title: "Translation", message: "No content to translate", color: "blue" });
          return;
        }

        setTranslating(true);

        // First translate the document title
        const gemini = getGeminiClient();
        const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });

        try {
          const titlePrompt = `Translate the following text to ${languageOptions.find(l => l.value === lang)?.label || lang}. Only return the translated text.\n\nText: ${docTab.title}`;
          const titleResult = await model.generateContent(titlePrompt);
          const translatedTitle = titleResult.response.text().trim();

          // Update the document title
          await fetch(`http://localhost:3333/doctabs?mode=disk&key=${encodeURIComponent(userEmail)}:${encodeURIComponent(projectId)}`, {
            method: "POST",
            body: JSON.stringify(docTabs.map(tab =>
              tab.id === docId ? { ...tab, title: translatedTitle } : tab
            ))
          });

          // Update local state
          setDocTabs(docTabs.map(tab =>
            tab.id === docId ? { ...tab, title: translatedTitle } : tab
          ));

          showNotification({ title: "Translation", message: "Document title translated", color: "green" });
        } catch (err) {
          showNotification({ title: "Error", message: "Failed to translate title", color: "red" });
        }

        // Then translate all rows
        try {
          const translatedRows = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (typeof row !== 'string') {
              translatedRows.push(row);
              continue;
            }

            const prompt = `Translate the following text to ${languageOptions.find(l => l.value === lang)?.label || lang}. Only return the translated text.\n\nText: ${row}`;
            const result = await model.generateContent(prompt);
            const translatedRow = result.response.text().trim();
            translatedRows.push(translatedRow);
          }

          // Update the rows in storage
          const updatedRows = { ...docRows, [docId]: translatedRows };
          await fetch(`http://localhost:3333/docs?mode=disk&key=${encodeURIComponent(userEmail)}`, {
            method: "POST",
            body: JSON.stringify(updatedRows)
          });

          // Update local state
          setDocRows(updatedRows);

          showNotification({ title: "Translation", message: "Document content translated", color: "green" });
        } catch (err) {
          showNotification({ title: "Error", message: "Failed to translate content", color: "red" });
        }
      } catch (err) {
        showNotification({ title: "Error", message: "Translation failed", color: "red" });
      } finally {
        setTranslating(false);
      }
    };

    return (
        <>
            <Modal opened={settingsOpened} onClose={() => setSettingsOpened(false)} title="Project Settings" overlayProps={{ backgroundOpacity: 0.55, blur: styles.overlay.filter || 3 }}>
                <Stack>
                    <Title order={4}>Rename Project</Title>
                    <TextInput
                        placeholder="New project name"
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.currentTarget.value)}
                        rightSection={renaming ? <Loader size="xs" /> : null}
                    />
                    <Button onClick={handleRename} loading={renaming}>Rename</Button>

                    <Divider my="sm" />

                    <Title order={4}>Members</Title>
                    {project.members && project.members.map((email: string) => (
                        <Group key={email} justify="space-between">
                            <Text>{email}</Text>
                            {email !== localStorage.getItem("user:username") && ( // Don't allow owner to remove self
                                <ActionIcon color="red" onClick={() => handleRemoveMember(email)}>
                                    <IconTrash size={16} />
                                </ActionIcon>
                            )}
                                                    </Group>
                    ))}
                    <TextInput
                        placeholder="Add member by email"
                        value={newMemberEmail}
                        onChange={(event) => setNewMemberEmail(event.currentTarget.value)}
                        rightSection={adding ? <Loader size="xs" /> : null}
                    />
                    <Button onClick={handleAddMember} loading={adding}>Add Member</Button>
                                                </Stack>
            </Modal>

            {/* Calendar Event Modal */}
            <Modal opened={calendarModalOpen} onClose={() => setCalendarModalOpen(false)} title={calendarModalMode === 'add' ? 'Add Calendar Task' : 'Edit Calendar Task'}>
                <Stack>
                    <TextInput
                        label="Task Title"
                        placeholder="Enter task title"
                        value={calendarTask.title || ''}
                        onChange={(event) => setCalendarTask({ ...calendarTask, title: event.currentTarget.value })}
                        required
                    />
                    <Textarea
                        label="Description"
                        placeholder="Enter task description"
                        value={calendarTask.description || ''}
                        onChange={(event) => setCalendarTask({ ...calendarTask, description: event.currentTarget.value })}
                    />
                    <TextInput
                        label="Assignee"
                        placeholder="Enter assignee email or name"
                        value={calendarTask.assignee || ''}
                        onChange={(event) => setCalendarTask({ ...calendarTask, assignee: event.currentTarget.value })}
                    />
                    <Select
                        label="Status"
                        placeholder="Select status"
                        value={calendarTask.status || 'todo'}
                        onChange={(value) => setCalendarTask({ ...calendarTask, status: value as Task['status'] })}
                        data={statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                    />
                    <Select
                        label="Priority"
                        placeholder="Select priority"
                        value={calendarTask.priority || 'medium'}
                        onChange={(value) => setCalendarTask({ ...calendarTask, priority: value as Task['priority'] })}
                        data={priorities.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
                    />
                    <TextInput
                        label="Due Date"
                        type="date"
                        value={calendarSelectedDate ? calendarSelectedDate.toISOString().split('T')[0] : ''}
                        onChange={(event) => setCalendarSelectedDate(new Date(event.currentTarget.value))}
                        required
                    />
                    <Group justify="flex-end">
                        {calendarModalMode === 'edit' && (
                            <Button variant="outline" color="red" onClick={handleCalendarModalDelete}>Delete</Button>
                        )}
                        <Button onClick={handleCalendarModalSave}>Save</Button>
                                                            </Group>
                </Stack>
            </Modal>

            {/* Edit Q&A Modal */}
            <Modal opened={!!editQAPair} onClose={handleCancelEditQAPair} title="Edit Q&A Pair" overlayProps={{ backgroundOpacity: 0.55, blur: styles.overlay.filter || 3 }}>
                {editQAPair && (
                    <Stack>
                        <Textarea
                            label="Question"
                            value={editQAPair.question}
                            onChange={(event) => setEditQAPair({ ...editQAPair, question: event.currentTarget.value })}
                            minRows={2}
                            autosize
                        />
                        <Textarea
                            label="Answer"
                            value={editQAPair.answer}
                            onChange={(event) => setEditQAPair({ ...editQAPair, answer: event.currentTarget.value })}
                            minRows={4}
                            autosize
                        />
                        <Group justify="flex-end">
                            <Button variant="default" onClick={handleCancelEditQAPair}>Cancel</Button>
                            <Button onClick={handleSaveEditQAPair} loading={editQALoading}>Save Changes</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* Main Layout */}
            <Box style={{ width: '100vw', minHeight: '100vh', backgroundColor: styles.background, color: styles.textColor, display: 'flex', flexDirection: 'column' }}>
                <Group justify="space-between" align="center" p="md" style={{ borderBottom: `1px solid ${styles.cardBorder}` }}>
                    <Group>
                        <ActionIcon variant="light" onClick={() => router.push("/projects")} title="Back to Projects">
                            <IconArrowLeft size={22} />
                        </ActionIcon>
                        <Title order={3} style={{ color: styles.textColor }}>{project.name}</Title>
                    </Group>
                    <Menu shadow="md" width={200}>
                        <Menu.Target>
                            <ActionIcon variant="light" color="gray" size="lg">
                                <IconDots size={22} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item onClick={() => setSettingsOpened(true)}>
                                <IconSettings size={14} style={{ marginRight: rem(9) }} /> Project Settings
                            </Menu.Item>
                            <Menu.Item color="red" onClick={handleLogout}>
                                Logout
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
                <Tabs
                  value={activeTab}
                  onChange={(value) => value && setActiveTab(value)}
                  style={{ flexGrow: 1, display: "flex", flexDirection: "column", width: '100%' }}
                    styles={{
                    tab: (theme: any, params: { active: boolean }) => ({
                      borderColor: params.active ? theme.colors.blue[6] : 'transparent',
                      color: params.active ? theme.colors.blue[6] : theme.colors.gray[7],
                      fontWeight: params.active ? 700 : 500,
                      background: params.active ? theme.colors.blue[0] : 'transparent',
                      transition: 'background 0.2s, color 0.2s',
                      '&:hover': {
                        background: theme.colors.blue[1],
                        color: theme.colors.blue[7],
                        borderColor: theme.colors.blue[6],
                      },
                    }),
                        panel: { flexGrow: 1, display: "flex", flexDirection: "column", padding: 'lg', backgroundColor: styles.tabPanelBackground, borderRadius: rem(8), maxWidth: 1200, margin: '0 auto' },
                    }}
                >
                    <Tabs.List grow>
                        <Tabs.Tab value="documents">Documents</Tabs.Tab>
                        <Tabs.Tab value="research">Research</Tabs.Tab>
                        <Tabs.Tab value="files">Files</Tabs.Tab>
                        <Tabs.Tab value="tasks">Tasks</Tabs.Tab>
                        <Tabs.Tab value="calendar">Calendar</Tabs.Tab>
                        <Tabs.Tab value="chat">SparkComms</Tabs.Tab>
                        <Tabs.Tab value="finance">Project Budget</Tabs.Tab>
                        <Tabs.Tab value="ai">SparkAI</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="chat">
                        <Box style={{ flexGrow: 1, overflowY: 'auto', paddingRight: 'xs', marginBottom: 'md' }}>
                            {chatMessages.map((msg, index) => (
                                <Group key={msg.id} gap="xs" wrap="nowrap" align="flex-start" style={{ marginBottom: 'sm', justifyContent: msg.sender === localStorage.getItem("user:username") ? 'flex-end' : 'flex-start' }}>
                                    {msg.sender !== localStorage.getItem("user:username") && msg.sender !== "ai" && (
                                        <Avatar color="blue" radius="xl">{getInitials(msg.senderName || msg.sender)}</Avatar>
                                    )}
                                    {msg.sender === "ai" && null}
                                    <Paper
                                        shadow="xs"
                                        radius="md"
                                        p="sm"
                                        style={{
                                            backgroundColor: msg.sender === localStorage.getItem("user:username") ? styles.accentColor : styles.cardBackground,
                                            color: msg.sender === localStorage.getItem("user:username") ? '#fff' : styles.textColor,
                                            maxWidth: '70%',
                                            wordBreak: 'break-word',
                                            position: 'relative',
                                        }}
                                    >
                                        <Text size="xs" style={{ fontWeight: 'bold', color: msg.sender === localStorage.getItem("user:username") ? 'rgba(255,255,255,0.8)' : styles.secondaryTextColor }}>
                                            {msg.senderName || msg.sender}
                                        </Text>
                                        {msg.type === "text" ? (
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        ) : (
                                            msg.type === "ai" ? (
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            ) : (
                                                msg.type === "image" && msg.fileUrl && <img src={msg.fileUrl} alt="uploaded" style={{ maxWidth: '100%', borderRadius: '4px' }} />
                                            )
                                        )}
                                        <Text size="xs" style={{ color: msg.sender === localStorage.getItem("user:username") ? 'rgba(255,255,255,0.6)' : styles.secondaryTextColor, marginTop: 'xs', textAlign: 'right' }}>
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </Text>
                                        <Group gap={4} style={{ position: 'absolute', bottom: 5, right: 5 }}>
                                            {(msg.reactions || []).map((reaction: string, rIdx: number) => (
                                                <Badge key={rIdx} size="sm" radius="sm" variant="filled">
                                                    {reaction}
                                                </Badge>
                                            ))}
                                            <Menu shadow="md" width={100}>
                                                <Menu.Target>
                                                    <ActionIcon size="xs" variant="transparent" color={msg.sender === localStorage.getItem("user:username") ? 'white' : 'gray'}>
                                                        <IconMoodSmile size={14} />
                                                    </ActionIcon>
                                                </Menu.Target>
                                                <Menu.Dropdown>
                                                    {['👍', '❤️', '😂', '🔥'].map(emoji => (
                                                        <Menu.Item key={emoji} onClick={() => addReaction(msg.id, emoji)}>
                                                            {emoji}
                                                        </Menu.Item>
                                                    ))}
                                                </Menu.Dropdown>
                                            </Menu>
                                        </Group>
                                                        </Paper>
                                </Group>
                            ))}
                            {aiThinking && (
                                <Group gap="xs" wrap="nowrap" align="flex-start" style={{ marginBottom: 'sm' }}>
                                    <Paper shadow="xs" radius="md" p="sm" style={{ backgroundColor: styles.cardBackground, color: styles.textColor, maxWidth: '70%', wordBreak: 'break-word' }}>
                                        <Text size="xs" style={{ fontWeight: 'bold', color: styles.secondaryTextColor }}>AI Assistant</Text>
                                        <Loader size="xs" />
                                    </Paper>
                                </Group>
                            )}
                            <div ref={chatEndRef} />
                        </Box>

                        <Group wrap="nowrap" style={{ borderTop: `1px solid ${styles.cardBorder}`, paddingTop: 'md' }}>
                            <TextInput
                                style={{ flexGrow: 1 }}
                                placeholder="Type a message, or /ai for AI help..."
                                value={chatInput}
                                onChange={(event) => setChatInput(event.currentTarget.value)}
                                onKeyPress={(event) => {
                                    if (event.key === 'Enter' && !event.shiftKey) {
                                        event.preventDefault();
                                        sendMessage(chatInput);
                                    }
                                }}
                                rightSection={sending ? <Loader size="xs" /> : null}
                            />
                            <ActionIcon variant="filled" size="lg" aria-label="Send message" onClick={() => sendMessage(chatInput)} loading={sending}>
                                <IconSend size={20} />
                            </ActionIcon>
                            <input
                                type="file"
                                id="file-upload"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                            <label htmlFor="file-upload">
                                <ActionIcon component="span" variant="filled" size="lg" aria-label="Attach file" loading={uploading}>
                                    <IconFile size={20} />
                                </ActionIcon>
                            </label>
                            <AskAI />
                                                            </Group>
                    </Tabs.Panel>

                    <Tabs.Panel value="documents">
                        <Box style={{ flexGrow: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', maxWidth: 900, margin: '0 auto', padding: '2rem', boxSizing: 'border-box' }}>
                            {/* Sidebar with search, filter, and document list */}
                            <Box style={{ width: isMobile ? '100%' : rem(320), minWidth: isMobile ? '100%' : 320, maxWidth: 400, background: styles.cardBackground, borderRight: isMobile ? 'none' : styles.cardBorder, borderBottom: isMobile ? styles.cardBorder : 'none', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
                              {/* Search bar with icon */}
                              <TextInput
                                placeholder="Search documents..."
                                value={docSearch}
                                onChange={e => setDocSearch(e.currentTarget.value)}
                                size="sm"
                                leftSection={<IconSearch size={16} />}
                                style={{ width: '100%', marginBottom: 8 }}
                              />
                              {/* Tag filter below search bar */}
                              <MultiSelect
                                data={allTags.map(tag => ({ value: tag, label: tag }))}
                                value={tagFilter}
                                onChange={setTagFilter}
                                placeholder="Filter by tag"
                                clearable
                                searchable
                                size="sm"
                                style={{ width: '100%', marginBottom: 12 }}
                              />
                              {/* Document list */}
                              <Stack style={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
                                {filteredTabs
                                  .slice((docPage - 1) * DOCS_PER_PAGE, docPage * DOCS_PER_PAGE)
                                  .map(tab => (
                                  <Box key={tab.id} style={{ position: 'relative' }}>
                                    <Group wrap="nowrap" justify="space-between" align="center"
                                            style={{
                                                backgroundColor: activeDocTab === tab.id ? styles.accentColor + '15' : 'transparent',
                                                borderRadius: rem(4),
                                                padding: rem(8),
                                                cursor: 'pointer',
                                        border: activeDocTab === tab.id ? `1px solid ${styles.accentColor}` : 'none',
                                        transition: 'background 0.2s',
                                            }}
                                            onClick={() => {
                                                if (activeDocTab === tab.id && renamingDocId !== tab.id) {
                                                    setRenamingDocId(tab.id);
                                                    setRenameDocValue(tab.title);
                                                } else {
                                                    setActiveDocTab(tab.id);
                                          setRenamingDocId(null);
                                                }
                                            }}
                                        >
                                            {renamingDocId === tab.id ? (
                                                <TextInput
                                                    value={renameDocValue}
                                                    onChange={(e) => setRenameDocValue(e.currentTarget.value)}
                                                    onBlur={() => {
                                                        handleRenameDoc(tab.id, renameDocValue.trim() || tab.title);
                                                        setRenamingDocId(null);
                                                    }}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleRenameDoc(tab.id, renameDocValue.trim() || tab.title);
                                                            setRenamingDocId(null);
                                                        }
                                                    }}
                                                    size="xs"
                                                    style={{ flexGrow: 1 }}
                                                    autoFocus
                                                />
                                            ) : (
                                        <Text style={{ flexGrow: 1, color: styles.textColor, fontWeight: activeDocTab === tab.id ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {tab.title}
                                                </Text>
                                            )}
                                      <Group gap={4}>
                                        {/* Globe icon for translation */}
                                        <Popover
                                          opened={showLangSelect === tab.id}
                                          onChange={(opened: boolean | undefined) => setShowLangSelect(opened ? tab.id : null)}
                                          position="bottom-start"
                                          withinPortal
                                          shadow="md"
                                        >
                                          <Popover.Target>
                                            <ActionIcon
                                              variant="light"
                                              color="blue"
                                              size="sm"
                                              onClick={e => {
                                                e.stopPropagation();
                                                setShowLangSelect(showLangSelect === tab.id ? null : tab.id);
                                              }}
                                              title="Translate document"
                                            >
                                              <IconWorld size={16} />
                                            </ActionIcon>
                                          </Popover.Target>
                                          <Popover.Dropdown>
                                            <Select
                                              data={languageOptions}
                                              value={translationLang}
                                              onChange={async value => {
                                                if (value) {
                                                  setTranslationLang(value);
                                                  await handleTranslateDocument(tab.id, value);
                                                  setShowLangSelect(null);
                                                }
                                              }}
                                              placeholder="Select language"
                                              searchable
                                              clearable
                                              size="xs"
                                              disabled={translating}
                                            />
                                          </Popover.Dropdown>
                                        </Popover>
                                        {/* Delete icon */}
                                        {tab.id !== "default" && (
                                          <ActionIcon variant="light" color="red" size="sm" onClick={e => { e.stopPropagation(); handleDeleteDoc(tab.id); }}>
                                                    <IconTrash size={14} />
                                                </ActionIcon>
                                            )}
                                        </Group>
                                    </Group>
                                  </Box>
                                ))}
                              </Stack>
                              {/* Add Document button at the bottom */}
                              <Button size="xs" mt={8} onClick={handleAddDocument} fullWidth>Add Document</Button>
                              
                              {/* Add pagination controls */}
                              {docTabs.length > DOCS_PER_PAGE && (
                                <Group justify="center" mt={12}>
                                  <ActionIcon 
                                    size="sm" 
                                    variant="light" 
                                    disabled={docPage === 1}
                                    onClick={() => setDocPage(p => Math.max(1, p - 1))}
                                  >
                                    &lt;
                                  </ActionIcon>
                                  <Text size="sm">
                                    {docPage} / {Math.ceil(docTabs.length / DOCS_PER_PAGE)}
                                  </Text>
                                  <ActionIcon 
                                    size="sm" 
                                    variant="light" 
                                    disabled={docPage >= Math.ceil(docTabs.length / DOCS_PER_PAGE)}
                                    onClick={() => setDocPage(p => Math.min(Math.ceil(docTabs.length / DOCS_PER_PAGE), p + 1))}
                                  >
                                    &gt;
                                  </ActionIcon>
                                </Group>
                              )}
                            </Box>
                            {/* Main document content area, ensure rows are visible and scrollable */}
                            <Box style={{ flexGrow: 1, paddingLeft: isMobile ? '0' : 'md', paddingTop: isMobile ? 'md' : '0', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                              {/* SparkTransition dropdown */}
                              <Accordion variant="contained" mb="md">
                                <Accordion.Item value="sparktransition">
                                  <Accordion.Control>SparkTransition</Accordion.Control>
                                  <Accordion.Panel>
                                {/* --- Transition Feature UI --- */}
                                <Paper p="md" mb="md" withBorder shadow="sm" style={{ background: styles.tabBackground }}>
                                    <Group align="flex-end" gap="md">
                                        <Select
                                            label="Source Document"
                                            data={docTabs.map(tab => ({ value: tab.id, label: tab.title }))}
                                            value={transitionSource}
                                            onChange={setTransitionSource}
                                            placeholder="Select source document"
                                            style={{ minWidth: 180 }}
                                        />
                                        <Select
                                            label="Target Document"
                                            data={docTabs.map(tab => ({ value: tab.id, label: tab.title }))}
                                            value={transitionTarget}
                                            onChange={setTransitionTarget}
                                            placeholder="Select target document"
                                            style={{ minWidth: 180 }}
                                        />
                                        <Button
                                            leftSection={<IconRobot size={16} />}
                                            onClick={handleCalculateTransition}
                                            loading={transitionLoading}
                                            disabled={!transitionSource || !transitionTarget || transitionSource === transitionTarget}
                                        >
                                            Calculate Transition
                                        </Button>
                                    </Group>
                                    {transitionLoading && (
                                        <Group mt="md"><Loader size="sm" /><Text>AI is analyzing the transition...</Text></Group>
                                    )}
                                    {transitionResult && (
                                        <Paper mt="md" p="md" withBorder shadow="xs" style={{ background: styles.cardBackground }}>
                                            <Text fw={700} mb="xs">AI Transition Report</Text>
                                            <ReactMarkdown>{transitionResult}</ReactMarkdown>
                                        </Paper>
                                    )}
                                </Paper>
                                  </Accordion.Panel>
                                </Accordion.Item>
                              </Accordion>
                              {/* AI Prompt dropdown */}
                              <Accordion variant="contained" mb="md">
                                <Accordion.Item value="aiprompt">
                                  <Accordion.Control>AI Prompt</Accordion.Control>
                                  <Accordion.Panel>
                                    {/* AI Prompt for each row UI here */}
                                    <Paper p="md" withBorder shadow="sm" style={{ marginBottom: 16 }}>
                                      <Text fw={500} mb="xs">AI Prompt (use ____ for row value)</Text>
                                      <Group align="flex-end" gap="sm">
                                        <TextInput
                                          placeholder="What are some foods that can be made with ____?"
                                          value={aiPrompt}
                                          onChange={e => setAiPrompt(e.currentTarget.value)}
                                          style={{ flexGrow: 1 }}
                                        />
                                        <Button onClick={runAiForEachRow} loading={aiPromptProcessing}>Run AI for Each Row</Button>
                                      </Group>
                                    </Paper>
                                  </Accordion.Panel>
                                </Accordion.Item>
                              </Accordion>
                              {/* ...rest of main content... */}
                                <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: styles.cardBackground, border: `1px solid ${styles.cardBorder}`, borderRadius: rem(8), boxShadow: styles.cardShadow, overflow: 'hidden' }}>
                                <ProjectDocumentsTab
                                  projectId={typeof projectId === 'string' ? projectId : Array.isArray(projectId) ? projectId[0] : undefined}
                                  docTabs={filteredTabs}
                                  setDocTabs={setDocTabs}
                                  activeDocTab={activeDocTab}
                                  setActiveDocTab={setActiveDocTab}
                                  docRows={docRows}
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
                                  styles={styles}
                                  showNotification={showNotification}
                                  translating={translating}
                                  setTranslating={setTranslating}
                                />
                                </Box>
                            </Box>
                        </Box>
                    </Tabs.Panel>

                    <Tabs.Panel value="research">
                        <Box style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', maxWidth: 900, margin: '0 auto', padding: '2rem', boxSizing: 'border-box' }}>
                            <Box style={{
                                backgroundColor: styles.cardBackground,
                                border: `1px solid ${styles.cardBorder}`,
                                borderRadius: rem(8),
                                boxShadow: styles.cardShadow,
                                padding: 'md',
                                marginBottom: 'md'
                            }}>
                                <Title order={5} mb="sm" style={{ color: styles.textColor }}>Add New Research Item</Title>
                                <form onSubmit={handleAddResearch}>
                                    <Stack>
                                        <TextInput
                                            placeholder="Title"
                                            value={newResearch.title}
                                            onChange={(e) => setNewResearch({ ...newResearch, title: e.currentTarget.value })}
                                            required
                                        />
                                        <Select
                                            placeholder="Type"
                                            value={newResearch.type}
                                            onChange={(value) => setNewResearch({ ...newResearch, type: value || 'web' })}
                                            data={[
                                                { value: 'web', label: 'Web Article' },
                                                { value: 'paper', label: 'Academic Paper' },
                                                { value: 'report', label: 'Internal Report' },
                                                { value: 'meeting', label: 'Meeting Notes' },
                                                { value: 'other', label: 'Other' },
                                            ]}
                                            required
                                        />
                                        <Textarea
                                            placeholder="Content / URL / Summary"
                                            value={newResearch.content}
                                            onChange={(e) => setNewResearch({ ...newResearch, content: e.currentTarget.value })}
                                            autosize
                                            minRows={3}
                                            required
                                        />
                                        <MultiSelect
                                            data={allResearchTags}
                                            placeholder="Add tags"
                                            searchable
                                            value={newResearch.tags}
                                            onChange={(value) => setNewResearch({ ...newResearch, tags: value })}
                                        />
                                        <Button
                                            onClick={handleSuggestTags}
                                            leftSection={<IconSparkles size={16} />}
                                            loading={suggestingTags}
                                            variant="light"
                                        >
                                            Suggest Tags with AI
                                        </Button>
                                                <Group>
                                            <input
                                                type="file"
                                                id="new-research-file-upload"
                                                style={{ display: 'none' }}
                                                onChange={(e) => handleFileChange(e, setNewResearchFile)}
                                            />
                                            <label htmlFor="new-research-file-upload">
                                                <Button component="span" leftSection={<IconUpload size={16} />} variant="light">
                                                    {newResearchFile ? newResearchFile.name : 'Upload File (Optional)'}
                                                </Button>
                                            </label>
                                            <Button type="submit">Add Research</Button>
                                        </Group>
                                    </Stack>
                                </form>
                            </Box>

                            <Box style={{
                                backgroundColor: styles.cardBackground,
                                border: `1px solid ${styles.cardBorder}`,
                                borderRadius: rem(8),
                                boxShadow: styles.cardShadow,
                                padding: 'md',
                                flexGrow: 1,
                                overflowY: 'auto'
                            }}>
                                <Group justify="space-between" mb="md">
                                    <Title order={5} style={{ color: styles.textColor }}>Existing Research Items</Title>
                                    <Select
                                        placeholder="Sort by"
                                        value={sortBy}
                                        onChange={(value) => setSortBy(value as 'date' | 'title' | 'type')}
                                        data={[
                                            { value: 'date', label: 'Date' },
                                            { value: 'title', label: 'Title' },
                                            { value: 'type', label: 'Type' },
                                        ]}
                                    />
                                </Group>
                                <Stack>
                                    {sortedResearchItems.length === 0 && <Text>No research items added yet.</Text>}
                                    {sortedResearchItems.map((item: any) => (
                                        <Paper key={item.id} p="md" shadow="sm" style={{ border: `1px solid ${styles.cardBorder}`, backgroundColor: styles.tabBackground }}>
                                            {editResearch && editResearch.id === item.id ? (
                                                <Stack>
                                                    <TextInput
                                                        label="Title"
                                                        value={editResearch.title}
                                                        onChange={(e) => setEditResearch({ ...editResearch, title: e.currentTarget.value })}
                                                    />
                                                    <Select
                                                        label="Type"
                                                        value={editResearch.type}
                                                        onChange={(value) => setEditResearch({ ...editResearch, type: value || 'web' })}
                                                        data={[
                                                            { value: 'web', label: 'Web Article' },
                                                            { value: 'paper', label: 'Academic Paper' },
                                                            { value: 'report', label: 'Internal Report' },
                                                            { value: 'meeting', label: 'Meeting Notes' },
                                                            { value: 'other', label: 'Other' },
                                                        ]}
                                                    />
                                                    <Textarea
                                                        label="Content / URL / Summary"
                                                        value={editResearch.content}
                                                        onChange={(e) => setEditResearch({ ...editResearch, content: e.currentTarget.value })}
                                                        autosize
                                                        minRows={3}
                                                    />
                                                    <MultiSelect
                                                        data={allResearchTags}
                                                        placeholder="Add tags"
                                                        searchable
                                                        value={editResearch.tags}
                                                        onChange={(value) => setEditResearch({ ...editResearch, tags: value })}
                                                    />
                                                    <Button
                                                        onClick={handleEditSuggestTags}
                                                        leftSection={<IconSparkles size={16} />}
                                                        loading={editSuggestingTags}
                                                        variant="light"
                                                    >
                                                        Suggest Tags with AI
                                                    </Button>
                                                    {editResearch.fileUrl && (
                                                        <Text size="sm" c="dimmed">Current file: {editResearch.fileUrl.substring(0, 50)}...</Text>
                                                    )}
                                                    <input
                                                        type="file"
                                                        id={`edit-research-file-upload-${item.id}`}
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => handleFileChange(e, setEditResearchFile)}
                                                    />
                                                    <label htmlFor={`edit-research-file-upload-${item.id}`}>
                                                        <Button component="span" leftSection={<IconUpload size={16} />} variant="light">
                                                            {editResearchFile ? editResearchFile.name : 'Change File (Optional)'}
                                                        </Button>
                                                    </label>
                                                    <Group justify="flex-end">
                                                        <Button variant="default" onClick={handleCancelEditResearch}>Cancel</Button>
                                                        <Button onClick={handleSaveEditResearch} loading={editResearchLoading}>Save</Button>
                                                    </Group>
                                                </Stack>
                                            ) : (
                                                <Stack>
                                                    <Group justify="space-between">
                                                        <Title order={6} style={{ color: styles.textColor }}>{item.title}</Title>
                                                        <Group gap={4}>
                                                            <Badge variant="filled" color="gray">{item.type}</Badge>
                                                            {item.tags && item.tags.map((tag: string) => (
                                                                <Badge key={tag} variant="outline" color={styles.badgeColor}>{tag}</Badge>
                                                            ))}
                                                        </Group>
                                                    </Group>
                                                    <Text size="sm" c="dimmed">Added by {item.createdBy} on {new Date(item.createdAt).toLocaleDateString()}</Text>
                                                    <Text>{item.summary || item.content}</Text>
                                                    {item.summary && (
                                                    <Button
                                                            variant="light"
                                                            size="xs"
                                                            onClick={() => setExpanded(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                            leftSection={expanded[item.id] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                                                        >
                                                            {expanded[item.id] ? 'Show Less' : 'Show More (Full Content)'}
                                                    </Button>
                                                    )}
                                                    {expanded[item.id] && item.summary && (
                                                        <Box mt="xs">
                                                            <Text size="sm" style={{ fontWeight: 'bold' }}>Full Content:</Text>
                                                            <Text>{item.content}</Text>
                                                        </Box>
                                                    )}
                                                    {item.fileUrl && (
                                                        <Button
                                                            variant="light"
                                                            size="xs"
                                                            leftSection={<IconDownload size={14} />}
                                                            onClick={() => saveAs(item.fileUrl, item.title + '_file')}
                                                        >
                                                            Download Attached File
                                                        </Button>
                                                    )}
                                                    <Group gap="xs" justify="flex-end">
                                                        <Button
                                                            size="xs"
                                                            variant="light"
                                                            onClick={() => handleSummarizeResearch(item)}
                                                            loading={summarizingId === item.id}
                                                            leftSection={<IconSparkles size={14} />}
                                                        >
                                                            {item.summary ? 'Re-summarize with AI' : 'Summarize with AI'}
                                                        </Button>
                                                        <ActionIcon size="sm" variant="light" color="blue" onClick={() => handleEditResearch(item)}><IconEdit size={16} /></ActionIcon>
                                                        <ActionIcon size="sm" variant="light" color="red" onClick={() => handleDeleteResearch(item.id)}><IconTrash size={16} /></ActionIcon>
                                                </Group>
                                                    <Divider my="xs" />
                                                    <Title order={6}>Comments</Title>
                                                    <Stack gap="xs">
                                                        {(item.annotations || []).map((comment: any) => (
                                                            <Group key={comment.id} wrap="nowrap" align="flex-start" justify="space-between" style={{ border: `1px solid ${styles.cardBorder}`, padding: rem(8), borderRadius: rem(4), backgroundColor: styles.tabPanelBackground }}>
                                                                <Box>
                                                                    <Text size="sm" style={{ fontWeight: 'bold', color: styles.accentColor }}>{comment.author}</Text>
                                                                    <Text size="sm">{comment.content}</Text>
                                                                    <Text size="xs" c="dimmed">{new Date(comment.createdAt).toLocaleString()}</Text>
                                                                </Box>
                                                                <ActionIcon size="xs" variant="light" color="red" onClick={() => handleDeleteComment(item, comment.id)}><IconTrash size={12} /></ActionIcon>
                                            </Group>
                                                        ))}
                                                            <TextInput
                                                            placeholder="Add a comment..."
                                                            value={commentInputs[item.id] || ''}
                                                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [item.id]: e.currentTarget.value }))}
                                                            rightSection={commentLoading[item.id] ? <Loader size="xs" /> : null}
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') handleAddComment(item);
                                                            }}
                                                        />
                                                    </Stack>
                                                </Stack>
                                            )}
                                        </Paper>
                                    ))}
                                </Stack>
                            </Box>
                        </Box>
                    </Tabs.Panel>

                    <Tabs.Panel value="tasks">
                        <Box style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', maxWidth: 900, margin: '0 auto', padding: '2rem', boxSizing: 'border-box' }}>
                            <Box style={{
                                backgroundColor: styles.cardBackground,
                                border: `1px solid ${styles.cardBorder}`,
                                borderRadius: rem(8),
                                boxShadow: styles.cardShadow,
                                padding: '2rem',
                                marginBottom: '2rem'
                            }}>
                                <Title order={5} mb="sm" style={{ color: styles.textColor }}>Add New Task</Title>
                                <Stack>
                                    <TextInput
                                        placeholder="Task Title"
                                        value={newTask.title}
                                        onChange={(e) => setNewTask({ ...newTask, title: e.currentTarget.value })}
                                                                required
                                    />
                                    <Textarea
                                        placeholder="Description (optional)"
                                        value={newTask.description}
                                        onChange={(e) => setNewTask({ ...newTask, description: e.currentTarget.value })}
                                        autosize
                                        minRows={2}
                                                            />
                                                            <TextInput
                                        placeholder="Assignee Email/Name (optional)"
                                                                value={newTask.assignee}
                                        onChange={(e) => setNewTask({ ...newTask, assignee: e.currentTarget.value })}
                                    />
                                    <Select
                                        placeholder="Status"
                                        value={newTask.status}
                                        onChange={(value) => setNewTask({ ...newTask, status: value as Task['status'] })}
                                        data={statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                                    />
                                    <Select
                                        placeholder="Priority"
                                        value={newTask.priority}
                                        onChange={(value) => setNewTask({ ...newTask, priority: value as Task['priority'] })}
                                        data={priorities.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
                                                            />
                                                            <TextInput
                                        label="Due Date (optional)"
                                                                type="date"
                                                                value={newTask.dueDate}
                                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.currentTarget.value })}
                                    />
                                    <Button onClick={handleAddTask} loading={addingTask}>Add Task</Button>
                                </Stack>
                            </Box>

                            <Box style={{
                                backgroundColor: styles.cardBackground,
                                border: `1px solid ${styles.cardBorder}`,
                                borderRadius: rem(8),
                                boxShadow: styles.cardShadow,
                                padding: '2rem',
                                flexGrow: 1,
                                overflowY: 'auto'
                            }}>
                                <Group justify="space-between" mb="md">
                                    <Title order={5} style={{ color: styles.textColor }}>Project Tasks</Title>
                                                            <Select
                                        placeholder="View as"
                                        value={taskView}
                                        onChange={(value) => setTaskView(value as 'list' | 'board')}
                                                                data={[
                                            { value: 'list', label: 'List View' },
                                            { value: 'board', label: 'Kanban Board' },
                                        ]}
                                    />
                                                        </Group>

                                {taskView === 'list' && (
                                    <Stack>
                                        {tasks.length === 0 && <Text>No tasks added yet.</Text>}
                                                        {tasks.map(task => (
                                            <Paper key={task.id} p="md" shadow="sm" style={{ border: `1px solid ${styles.cardBorder}`, backgroundColor: styles.tabBackground }}>
                                                                {editingTaskId === task.id ? (
                                                    <Stack>
                                                                            <TextInput
                                                            label="Title"
                                                                                value={editTask.title}
                                                            onChange={(e) => setEditTask({ ...editTask, title: e.currentTarget.value })}
                                                        />
                                                        <Textarea
                                                            label="Description"
                                                            value={editTask.description}
                                                            onChange={(e) => setEditTask({ ...editTask, description: e.currentTarget.value })}
                                                            autosize
                                                            minRows={2}
                                                                            />
                                                                            <TextInput
                                                            label="Assignee"
                                                                                value={editTask.assignee}
                                                            onChange={(e) => setEditTask({ ...editTask, assignee: e.currentTarget.value })}
                                                        />
                                                        <Select
                                                            label="Status"
                                                            value={editTask.status}
                                                            onChange={(value) => setEditTask({ ...editTask, status: value as Task['status'] })}
                                                            data={statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                                                                            />
                                                                            <Select
                                                            label="Priority"
                                                                                value={editTask.priority}
                                                            onChange={(value) => setEditTask({ ...editTask, priority: value as Task['priority'] })}
                                                            data={priorities.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
                                                        />
                                                        <TextInput
                                                            label="Due Date"
                                                            type="date"
                                                            value={editTask.dueDate ? editTask.dueDate.split('T')[0] : ''} // Ensure YYYY-MM-DD for date input
                                                            onChange={(e) => setEditTask({ ...editTask, dueDate: e.currentTarget.value })}
                                                        />
                                                        <Group justify="flex-end">
                                                            <Button variant="default" onClick={() => setEditingTaskId(null)}>Cancel</Button>
                                                            <Button onClick={handleSaveTask}>Save</Button>
                                                                        </Group>
                                                                    </Stack>
                                                                ) : (
                                                    <Stack>
                                                        <Group justify="space-between" align="center">
                                                            <Title order={6} style={{ color: styles.textColor }}>{task.title}</Title>
                                                                            <Group gap="xs">
                                                                <Badge color={getStatusColor(task.status)}>{task.status}</Badge>
                                                                <Badge color={getPriorityColor(task.priority)}>{task.priority}</Badge>
                                                                            </Group>
                                                                                </Group>
                                                        {task.description && <Text size="sm">{task.description}</Text>}
                                                        {task.assignee && <Text size="sm" c="dimmed">Assignee: {task.assignee}</Text>}
                                                        {task.dueDate && <Text size="sm" c="dimmed">Due: {new Date(task.dueDate).toLocaleDateString()}</Text>}
                                                        <Text size="xs" c="dimmed">Created: {new Date(task.createdAt).toLocaleString()}</Text>
                                                        <Text size="xs" c="dimmed">Last Updated: {new Date(task.updatedAt).toLocaleString()}</Text>
                                                        <Group gap="xs" justify="flex-end">
                                                            <ActionIcon size="sm" variant="light" color="blue" onClick={() => handleEditTask(task)}><IconEdit size={16} /></ActionIcon>
                                                            <ActionIcon size="sm" variant="light" color="red" onClick={() => handleDeleteTask(task.id)}><IconTrash size={16} /></ActionIcon>
                                                                        </Group>
                                                    </Stack>
                                                                )}
                                                            </Paper>
                                                        ))}
                                                    </Stack>
                                )}

                                {taskView === 'board' && (
                                                <DragDropContext onDragEnd={onDragEnd}>
                                        <Group wrap="nowrap" align="flex-start">
                                            {statuses.map(status => (
                                                <Droppable key={status} droppableId={status}>
                                                    {(provided) => (
                                                                    <Box
                                                                        ref={provided.innerRef}
                                                                        {...provided.droppableProps}
                                                                        style={{
                                                                flex: 1,
                                                                minWidth: rem(250),
                                                                backgroundColor: styles.tabBackground,
                                                                borderRadius: rem(8),
                                                                padding: 'md',
                                                                border: `1px solid ${styles.cardBorder}`,
                                                                            boxShadow: styles.cardShadow,
                                                                minHeight: rem(200)
                                                            }}
                                                        >
                                                            <Title order={6} mb="sm" style={{ textTransform: 'capitalize', color: styles.textColor }}>
                                                                {status.replace('-', ' ')} ({tasks.filter(t => t.status === status).length})
                                                            </Title>
                                                            <Stack>
                                                                {tasks.filter(t => t.status === status).map((task, index) => (
                                                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                                {(provided, snapshot) => (
                                                                                    <Paper
                                                                                        ref={provided.innerRef}
                                                                                        {...provided.draggableProps}
                                                                                        {...provided.dragHandleProps}
                                                                                p="sm"
                                                                                shadow="xs"
                                                                                        style={{
                                                                                            ...provided.draggableProps.style,
                                                                                    backgroundColor: snapshot.isDragging ? styles.accentColor + '20' : styles.cardBackground,
                                                                                    border: `1px solid ${styles.cardBorder}`,
                                                                                        }}
                                                                                    >
                                                                                <Stack gap="xs">
                                                                                    <Text size="sm" style={{ fontWeight: 'bold' }}>{task.title}</Text>
                                                                                    {task.assignee && <Text size="xs" c="dimmed">Assignee: {task.assignee}</Text>}
                                                                                    {task.dueDate && <Text size="xs" c="dimmed">Due: {new Date(task.dueDate).toLocaleDateString()}</Text>}
                                                                                        <Group gap="xs">
                                                                                        <Badge color={getPriorityColor(task.priority)} size="xs">{task.priority}</Badge>
                                                                                        <ActionIcon size="xs" variant="light" color="blue" onClick={() => handleEditTask(task)}><IconEdit size={12} /></ActionIcon>
                                                                                        <ActionIcon size="xs" variant="light" color="red" onClick={() => handleDeleteTask(task.id)}><IconTrash size={12} /></ActionIcon>
                                                                                        </Group>
                                                                                </Stack>
                                                                                    </Paper>
                                                                                )}
                                                                            </Draggable>
                                                                        ))}
                                                                        {provided.placeholder}
                                                            </Stack>
                                                                    </Box>
                                                                )}
                                                            </Droppable>
                                                        ))}
                                                    </Group>
                                                </DragDropContext>
                                            )}
                                        </Box>
                                    </Box>
                                </Tabs.Panel>

                    <Tabs.Panel value="files" onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop}>
                        <Box style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', maxWidth: 900, margin: '0 auto', padding: '2rem', boxSizing: 'border-box' }}>
                            <Box style={{
                                backgroundColor: styles.cardBackground,
                                border: `1px solid ${styles.cardBorder}`,
                                borderRadius: rem(8),
                                boxShadow: styles.cardShadow,
                                padding: 'md',
                                marginBottom: 'md',
                                minHeight: rem(100),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderStyle: 'dashed',
                                borderColor: styles.secondaryTextColor
                            }}>
                                {uploading ? (
                                    <Group>
                                        <Loader size="sm" />
                                        <Text>Uploading files...</Text>
                                            </Group>
                                ) : (
                                    <Text c="dimmed">Drag & drop files here to upload, or click to browse</Text>
                                )}
                                {uploadError && <Text color="red" size="sm">{uploadError}</Text>}
                                {/* Hidden file input for Browse */}
                                <input
                                    type="file"
                                    multiple
                                    style={{ display: 'none' }}
                                    id="file-browse-input"
                                    onChange={handleFileDrop as any} // Cast to any to satisfy type for now
                                />
                                <label htmlFor="file-browse-input" style={{ marginLeft: '10px' }}>
                                    <Button component="span" variant="light" size="xs">Browse</Button>
                                </label>
                            </Box>

                            <Box style={{
                                backgroundColor: styles.cardBackground,
                                border: `1px solid ${styles.cardBorder}`,
                                borderRadius: rem(8),
                                boxShadow: styles.cardShadow,
                                padding: 'md',
                                flexGrow: 1,
                                overflowY: 'auto'
                            }}>
                                <Title order={5} mb="md" style={{ color: styles.textColor }}>Uploaded Files</Title>
                                {files.length === 0 && <Text>No files uploaded yet.</Text>}
                                <Stack>
                                    {files.map((file) => (
                                        <Paper key={file.id} p="sm" shadow="xs" style={{ border: `1px solid ${styles.cardBorder}`, backgroundColor: styles.tabBackground }}>
                                            <Group justify="space-between" align="center">
                                                <Group gap="xs">
                                                    <IconFile size={18} />
                                                    <Text>{file.name}</Text>
                                                    <Text size="xs" c="dimmed">({(file.size / 1024).toFixed(2)} KB)</Text>
                                                                </Group>
                                                <Group gap="xs">
                                                    <ActionIcon variant="light" color="blue" onClick={() => handleFileDownload(file)} title="Download File">
                                                        <IconDownload size={16} />
                                                    </ActionIcon>
                                                    <ActionIcon variant="light" color="red" onClick={() => handleFileDelete(file.id)} title="Delete File">
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                            </Group>
                                                        </Group>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Box>
                        </Box>
                    </Tabs.Panel>

                    <Tabs.Panel value="calendar">
                        <Box style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', maxWidth: 900, margin: '0 auto', padding: '2rem', boxSizing: 'border-box' }}>
                            <Box style={{
                                backgroundColor: styles.cardBackground,
                                border: `1px solid ${styles.cardBorder}`,
                                borderRadius: rem(8),
                                boxShadow: styles.cardShadow,
                                padding: 'md',
                                flexGrow: 1,
                                overflow: 'hidden'
                            }}>
                                <Group justify="space-between" mb="md">
                                    <Title order={5} style={{ color: styles.textColor }}>Project Calendar</Title>
                                    <Button onClick={() => handleSelectSlot({ start: new Date() })} size="sm">Add Event</Button>
                                            </Group>
                                <BigCalendar
                                    localizer={localizer}
                                    events={calendarEvents}
                                    startAccessor="start"
                                    endAccessor="end"
                                    style={{ height: 'calc(100vh - 250px)' }}
                                    onSelectEvent={handleSelectEvent}
                                    onSelectSlot={handleSelectSlot}
                                    selectable
                                    eventPropGetter={(event: any, start: any, end: any, isSelected: any) => ({
                                        style: {
                                            backgroundColor: getStatusColor(event.resource.status),
                                            color: '#fff',
                                            borderRadius: '5px',
                                            border: 'none',
                                        },
                                    })}
                                />
                                        </Box>
                                    </Box>
                                </Tabs.Panel>

                    <Tabs.Panel value="ai">
                        <Box style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', maxWidth: 900, margin: '0 auto', padding: '2rem', boxSizing: 'border-box' }}>
                            <Title order={4} mb="md" style={{ color: styles.textColor }}>SparkAI</Title>

                            <Tabs defaultValue="insights" style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                                <Tabs.List grow>
                                    <Tabs.Tab value="insights">Insights</Tabs.Tab>
                                    <Tabs.Tab value="sentiment">Sentiment Analysis</Tabs.Tab>
                                    <Tabs.Tab value="automation">Workflow Automation</Tabs.Tab>
                                    <Tabs.Tab value="risk">Risk Alerts</Tabs.Tab>
                                    <Tabs.Tab value="qa">Q&A on Research</Tabs.Tab>
                                    <Tabs.Tab value="onboarding">Onboarding Assistant</Tabs.Tab>
                                </Tabs.List>

                                <Tabs.Panel value="insights" style={{ flexGrow: 1, padding: 'md', backgroundColor: styles.tabPanelBackground }}>
                                    <AIInsightsPanel />
                                </Tabs.Panel>
                                <Tabs.Panel value="sentiment" style={{ flexGrow: 1, padding: 'md', backgroundColor: styles.tabPanelBackground }}>
                                    <AISentimentInsights context={aiContext} />
                                </Tabs.Panel>
                                <Tabs.Panel value="automation" style={{ flexGrow: 1, padding: 'md', backgroundColor: styles.tabPanelBackground }}>
                                    <AIWorkflowAutomation context={aiContext} />
                                </Tabs.Panel>
                                <Tabs.Panel value="risk" style={{ flexGrow: 1, padding: 'md', backgroundColor: styles.tabPanelBackground }}>
                                    <AIRiskAlerts context={aiContext} />
                                </Tabs.Panel>
                                <Tabs.Panel value="qa" style={{ flexGrow: 1, padding: 'md', backgroundColor: styles.tabPanelBackground }}>
                                    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                        <Box style={{
                                            backgroundColor: styles.cardBackground,
                                            border: `1px solid ${styles.cardBorder}`,
                                            borderRadius: rem(8),
                                            boxShadow: styles.cardShadow,
                                            padding: 'md',
                                            marginBottom: 'md'
                                        }}>
                                            <Title order={5} mb="sm" style={{ color: styles.textColor }}>Ask SparkAI about your Research</Title>
                                            <Stack>
                                                <Textarea
                                                    placeholder={isFollowup ? "Ask a follow-up question..." : "Enter your question here..."}
                                                        value={qaQuestion}
                                                    onChange={(e) => setQaQuestion(e.currentTarget.value)}
                                                    autosize
                                                    minRows={2}
                                                />
                                                <Group>
                                                    <Button onClick={handleAskResearchAI} loading={qaLoading}>Ask SparkAI</Button>
                                                    {qaHistory.length > 0 && (
                                                        <Button variant="outline" onClick={handleFollowup} disabled={isFollowup}>Ask Follow-up</Button>
                                                    )}
                                                </Group>
                                                {qaError && <Text color="red">{qaError}</Text>}
                                                {qaAnswer && (
                                                    <Paper p="sm" shadow="xs" style={{ backgroundColor: styles.tabBackground, border: `1px solid ${styles.cardBorder}` }}>
                                                        <Text size="sm" style={{ fontWeight: 'bold' }}>SparkAI Answer:</Text>
                                                        <ReactMarkdown>{qaAnswer}</ReactMarkdown>
                                                    </Paper>
                                                )}
                                            </Stack>
                                        </Box>

                                        <Box style={{
                                            backgroundColor: styles.cardBackground,
                                            border: `1px solid ${styles.cardBorder}`,
                                            borderRadius: rem(8),
                                            boxShadow: styles.cardShadow,
                                            padding: 'md',
                                            flexGrow: 1,
                                            overflowY: 'auto'
                                        }}>
                                            <Group justify="space-between" mb="md">
                                                <Title order={5} style={{ color: styles.textColor }}>Q&A History</Title>
                                                                    <TextInput
                                                    placeholder="Search Q&A history"
                                                    value={qaSearch}
                                                    onChange={(event) => setQaSearch(event.currentTarget.value)}
                                                    style={{ width: rem(200) }}
                                                />
                                                                    </Group>
                                        <Stack>
                                                {filteredQaHistory.length === 0 && <Text>No Q&A history yet.</Text>}
                                                {filteredQaHistory.map((pair, index) => (
                                                    <Paper key={pair.id} p="md" shadow="sm" style={{ border: `1px solid ${styles.cardBorder}`, backgroundColor: styles.tabBackground }}>
                                                        <Group justify="space-between">
                                                            <Title order={6} style={{ color: styles.textColor }}>Question {filteredQaHistory.length - index}:</Title>
                                                                        <Group gap="xs">
                                                                <ActionIcon size="sm" variant="light" color="blue" onClick={() => handleStartEditQAPair(pair)}><IconEdit size={16} /></ActionIcon>
                                                                <ActionIcon size="sm" variant="light" color="red" onClick={() => handleDeleteQAPair(pair.id)}><IconTrash size={16} /></ActionIcon>
                                                                        </Group>
                                                                </Group>
                                                        <Text mb="xs">{pair.question}</Text>
                                                        <Title order={6} style={{ color: styles.textColor }}>Answer:</Title>
                                                        <ReactMarkdown>{pair.answer}</ReactMarkdown>
                                                        <Text size="xs" c="dimmed" mt="xs">Asked by {pair.createdBy} on {new Date(pair.createdAt).toLocaleString()}</Text>
                                                                                </Paper>
                                                                            ))}
                                                                        </Stack>
                                                                </Box>
                                    </Box>
                                </Tabs.Panel>
                                <Tabs.Panel value="onboarding" style={{ flexGrow: 1, padding: 'md', backgroundColor: styles.tabPanelBackground }}>
                                    <OnboardingAssistant />
                                </Tabs.Panel>
                            </Tabs>
                                    </Box>
                                </Tabs.Panel>

                    <Tabs.Panel value="finance">
                      <Box style={{ maxWidth: 600, margin: '0 auto', padding: '2rem', background: styles.cardBackground, border: `1px solid ${styles.cardBorder}`, borderRadius: rem(8), boxShadow: styles.cardShadow }}>
                        <Title order={5} mb="md" style={{ color: styles.textColor }}>Project Budget & Expenses</Title>
                        <Group mb="md">
                          <TextInput
                            label="Project Budget"
                            type="number"
                            value={financeBudget}
                            onChange={e => setFinanceBudget(Number(e.currentTarget.value))}
                            style={{ flex: 1 }}
                            min={0}
                          />
                          <Select
                            label="Currency"
                            value={financeCurrency}
                            onChange={value => setFinanceCurrency(value || 'USD')}
                            data={[{ value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' }, { value: 'KES', label: 'KES' }]}
                            style={{ width: 120 }}
                          />
                        </Group>
                        <Group mb="md">
                          <Text fw={700}>Total Spent:</Text>
                          <Text>{financeCurrency} {financeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2)}</Text>
                          <Text fw={700} ml="lg">Remaining:</Text>
                          <Text>{financeCurrency} {(financeBudget - financeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)).toFixed(2)}</Text>
                        </Group>
                        <Button onClick={() => setAddExpenseModalOpen(true)} mb="md">Add Expense</Button>
                        <Stack>
                          {financeExpenses.length === 0 ? (
                            <Text c="dimmed">No expenses recorded yet.</Text>
                          ) : (
                            financeExpenses.map(exp => (
                              <Group key={exp.id} justify="space-between" style={{ borderBottom: `1px solid ${styles.cardBorder}`, padding: '8px 0' }}>
                                <Text>{exp.description}</Text>
                                <Text>{exp.category}</Text>
                                <Text>{financeCurrency} {exp.amount?.toFixed(2)}</Text>
                                <Text>{exp.date}</Text>
                              </Group>
                            ))
                          )}
                        </Stack>
                        <Modal opened={addExpenseModalOpen} onClose={() => setAddExpenseModalOpen(false)} title="Add Expense">
                          <Stack>
                            <TextInput label="Description" value={newExpense.description || ''} onChange={e => setNewExpense({ ...newExpense, description: e.currentTarget.value })} required />
                            <TextInput label="Category" value={newExpense.category || ''} onChange={e => setNewExpense({ ...newExpense, category: e.currentTarget.value })} required />
                            <TextInput label="Amount" type="number" value={newExpense.amount || ''} onChange={e => setNewExpense({ ...newExpense, amount: Number(e.currentTarget.value) })} required min={0} />
                            <TextInput label="Date" type="date" value={newExpense.date || ''} onChange={e => setNewExpense({ ...newExpense, date: e.currentTarget.value })} required />
                            <Group align="flex-end" gap="xs">
                              <TextInput label="Category" value={newExpense.category || ''} onChange={e => setNewExpense({ ...newExpense, category: e.currentTarget.value })} required style={{ flex: 1 }} />
                              <Button variant="light" loading={categorySuggesting} onClick={handleSuggestCategory} disabled={!newExpense.description}>
                                Suggest Category
                              </Button>
                            </Group>
                            {categorySuggestError && <Text color="red" size="xs">{categorySuggestError}</Text>}
                            <Group justify="flex-end">
                              <Button onClick={() => {
                                if (!newExpense.description || !newExpense.category || !newExpense.amount || !newExpense.date) return;
                                const expense: Expense = {
                                  id: Date.now().toString(),
                                  description: newExpense.description,
                                  category: newExpense.category,
                                  amount: Number(newExpense.amount),
                                  date: newExpense.date,
                                };
                                setFinanceExpenses([...financeExpenses, expense]);
                                setAddExpenseModalOpen(false);
                                setNewExpense({ amount: 0, date: '', description: '', category: '' });
                              }}>Add</Button>
                            </Group>
                          </Stack>
                        </Modal>
                        <Paper withBorder p="md" mb="xl" radius="md" style={{ background: styles.tabPanelBackground, border: `1px solid ${styles.cardBorder}` }}>
                          <Title order={6} mb="md" style={{ color: styles.textColor }}>Finance Analytics</Title>
                          <Group align="flex-start" grow>
                            {/* Pie Chart: Expense by Category */}
                            <Stack style={{ flex: 1 }}>
                              <Text size="sm" fw={500} mb="xs">By Category</Text>
                              <PieChart
                                data={pieData}
                                withTooltip
                                h={180}
                              />
                            </Stack>
                            {/* Bar Chart: Spending over Time */}
                            <Stack style={{ flex: 1 }}>
                              <Text size="sm" fw={500} mb="xs">Spending Over Time</Text>
                              <BarChart
                                h={180}
                                data={Object.entries(
                                  financeExpenses.reduce((acc, e) => {
                                    const date = e.date || 'Unknown';
                                    acc[date] = (acc[date] || 0) + (e.amount || 0);
                                    return acc;
                                  }, {} as Record<string, number>)
                                ).map(([date, value]) => ({ date, value }))}
                                dataKey="date"
                                series={[{ name: 'value', color: 'blue' }]}
                                withTooltip
                              />
                            </Stack>
                            {/* Key Stats */}
                            <Stack style={{ flex: 1 }}>
                              <Text size="sm" fw={500} mb="xs">Key Stats</Text>
                              <Text size="xs">Largest Expense: {financeExpenses.length ? `${financeCurrency} ${Math.max(...financeExpenses.map(e => e.amount || 0)).toFixed(2)}` : 'N/A'}</Text>
                              <Text size="xs">Most Frequent Category: {(() => {
                                if (!financeExpenses.length) return 'N/A';
                                const freq = financeExpenses.reduce((acc, e) => { acc[e.category || 'Uncategorized'] = (acc[e.category || 'Uncategorized'] || 0) + 1; return acc; }, {} as Record<string, number>);
                                return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
                              })()}</Text>
                              <Text size="xs">Average Expense: {financeExpenses.length ? `${financeCurrency} ${(financeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) / financeExpenses.length).toFixed(2)}` : 'N/A'}</Text>
                            </Stack>
                          </Group>
                        </Paper>
                        <Box mt="xl" style={{ background: styles.tabPanelBackground, borderRadius: rem(8), padding: '1.5rem', border: `1px solid ${styles.cardBorder}` }}>
                          <Title order={6} mb="xs" style={{ color: styles.textColor }}>Ask SparkAI about your finances</Title>
                          <Stack>
                            <Textarea
                              placeholder="E.g. What is my biggest expense? Are we on track with the budget?"
                              value={financeAiQuestion}
                              onChange={e => setFinanceAiQuestion(e.currentTarget.value)}
                              minRows={2}
                              autosize
                            />
                            <Group>
                              <Button onClick={handleAskFinanceAI} loading={financeAiLoading}>Ask SparkAI</Button>
                            </Group>
                            {financeAiError && <Text color="red">{financeAiError}</Text>}
                            {financeAiAnswer && (
                              <Paper p="sm" shadow="xs" style={{ backgroundColor: styles.tabBackground, border: `1px solid ${styles.cardBorder}` }}>
                                <Text size="sm" style={{ fontWeight: 'bold' }}>SparkAI Answer:</Text>
                                <ReactMarkdown>{financeAiAnswer}</ReactMarkdown>
                              </Paper>
                            )}
                          </Stack>
                        </Box>
                      </Box>
                    </Tabs.Panel>
                        </Tabs>
                <Container fluid pt="md" pb="md" style={{ borderTop: `1px solid ${styles.cardBorder}`, width: '100%' }}>
                    <Text size="sm" c="dimmed" ta="center">&copy; {new Date().getFullYear()} Sparkpad. All rights reserved.</Text>
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
        </>
    );
}