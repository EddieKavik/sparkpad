"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Container, Title, Tabs, Box, Text, Loader, Center, Group, TextInput, Button, Stack, Modal, ActionIcon, rem, Menu, Avatar, Paper, MultiSelect, Textarea, Badge, Divider, Select } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconSettings, IconDots, IconTrash, IconArrowLeft, IconSend, IconFile, IconMoodSmile, IconRobot, IconEdit, IconSparkles, IconChevronDown, IconChevronUp, IconDownload, IconUpload } from "@tabler/icons-react";
import { getGeminiClient } from "@/utils/gemini";
import { useTheme } from '@/contexts/ThemeContext';
import { useDisclosure } from '@mantine/hooks';
import ReactMarkdown from 'react-markdown';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import FloatingAssistant from '@/components/FloatingAssistant';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { saveAs } from 'file-saver';
import AskAI from '../../../components/AskAI';

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
}

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
    type DocTab = { id: string; title: string };
    const [docTabs, setDocTabs] = useState<DocTab[]>([
        { id: "default", title: "Documents" }
    ]);
    const [activeTab, setActiveTab] = useState("default");
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
    const [researchItems, setResearchItems] = useState([]);
    const [researchLoading, setResearchLoading] = useState(false);
    const [newResearch, setNewResearch] = useState({ title: '', type: 'web', content: '' });
    const [editResearch, setEditResearch] = useState<any | null>(null);
    const [editResearchLoading, setEditResearchLoading] = useState(false);
    const [summarizingId, setSummarizingId] = useState<string | null>(null);
    const [tagFilter, setTagFilter] = useState<string[]>([]);
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

    const locales = { 'en-US': enUS };
    const localizer = dateFnsLocalizer({
        format,
        parse,
        startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
        getDay,
        locales,
    });

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
        const fetchProject = async () => {
            setLoading(true);
            try {
                const userEmail = localStorage.getItem("user:username");
                if (!userEmail) {
                    router.replace("/login");
                    return;
                }
                const res = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`);
                if (!res.ok) throw new Error("Failed to fetch projects");
                let projects = await res.json();
                if (!Array.isArray(projects) || projects.length === 0) {
                    // Try to restore from localStorage
                    projects = loadProjectsFromLocal();
                    if (Array.isArray(projects) && projects.length > 0) {
                        // Restore to backend
                        await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`,
                            { method: "POST", body: JSON.stringify(projects) });
                        // Reload to pick up restored projects
                        window.location.reload();
                        return;
                    }
                }
                const project = projects.find((p: any) => String(p.id).trim() === String(projectId).trim());
                if (!project) {
                    console.error('Project not found. projectId:', projectId, 'projects:', projects.map((p: any) => p.id));
                    throw new Error("Project not found");
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
        };
        fetchProject();
    }, [projectId, router]);

    // Load document rows from Civil Memory on mount or when projectId changes
    useEffect(() => {
        const fetchDocRows = async () => {
            if (!projectId) return;
            try {
                const userEmail = localStorage.getItem("user:username");
                if (!userEmail) {
                    router.replace("/login");
                    return;
                }
                const res = await fetch(`http://localhost:3333/docs?mode=disk&key=${encodeURIComponent(userEmail)}`);
                if (res.ok) {
                    const data = await res.json();
                    setDocRows(typeof data === "object" && data ? data : {});
                }
            } catch { }
        };
        fetchDocRows();
    }, [projectId, router]);

    // Save document rows to Civil Memory
    const saveDocRows = async (updated: { [docId: string]: string[] }) => {
        if (!projectId) return;
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
            const res = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`);
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
            const saveRes = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`, {
                method: "POST",
                body: JSON.stringify(projects),
            });
            if (!saveRes.ok) throw new Error("Failed to add member");

            // Fetch and update new member's projects
            const newMemberRes = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(newMemberEmail)}`);
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
            const saveNewMemberRes = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(newMemberEmail)}`, {
                method: "POST",
                body: JSON.stringify(newMemberProjects),
            });
            if (!saveNewMemberRes.ok) throw new Error("Failed to update new member's projects");

            setNewMemberEmail("");
            showNotification({ title: "Success", message: "Member added!", color: "green" });
            // Refresh project data so UI updates
            await fetchProject();
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
            const res = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`);
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
            const saveRes = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`, {
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
            const res = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`);
            if (!res.ok) throw new Error("Failed to fetch projects");
            const projects = await res.json();
            const idx = projects.findIndex((p: any) => String(p.id) === String(projectId));
            if (idx === -1) throw new Error("Project not found");
            const updatedProject = { ...projects[idx] };
            updatedProject.members = updatedProject.members.filter((email: string) => email !== emailToRemove);
            projects[idx] = updatedProject;
            const saveRes = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`, {
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

    const handleAddDocument = () => {
        // Generate a unique id for the new document tab
        const newId = `doc-${Date.now()}`;
        setDocTabs((tabs) => [
            ...tabs,
            { id: newId, title: "Untitled Document" }
        ]);
        setActiveTab(newId);
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
            try {
                const userEmail = localStorage.getItem("user:username");
                if (!userEmail) return;
                const res = await fetch(`http://localhost:3333/chat?mode=disk&key=${encodeURIComponent(projectId)}`);
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
            await fetch(`http://localhost:3333/chat?mode=disk&key=${encodeURIComponent(projectId)}`, {
                method: "POST",
                body: JSON.stringify(updated),
            });
            setChatInput("");

            // Notify all project members except the sender
            if (project && Array.isArray(project.members)) {
                const notificationPromises = project.members
                    .filter(memberEmail => memberEmail !== userEmail)
                    .map(async memberEmail => {
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
                    const updatedWithAI = [...updated, aiMsg];
                    setChatMessages(updatedWithAI);
                    await fetch(`http://localhost:3333/chat?mode=disk&key=${encodeURIComponent(projectId)}`, {
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
        await fetch(`http://localhost:3333/chat?mode=disk&key=${encodeURIComponent(projectId)}`, {
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
    const allTags = Array.from(new Set(researchItems.flatMap((item: any) => item.tags || [])));

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

    const sortedResearchItems = [...researchItems].sort((a, b) => {
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
        const user = localStorage.getItem("user");
        const userName = user ? JSON.parse(user).name : "anonymous";
        const res = await fetch(`/api/projects/${projectId}/research/qa?id=${editQAPair.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', user: userName },
            body: JSON.stringify({ question: editQAPair.question, answer: editQAPair.answer, createdBy: editQAPair.createdBy }),
        });
        if (res.status === 401 || res.status === 403) {
            showNotification({ title: "Unauthorized", message: "You are not allowed to edit this Q&A.", color: "red" });
            setEditQALoading(false);
            return;
        }
        setEditQALoading(false);
        if (res.ok) {
            const updated = await res.json();
            setQaHistory(h => h.map(pair => pair.id === updated.id ? updated : pair));
            setEditQAPair(null);
        }
    };

    // Sync tasks with project
    useEffect(() => {
        if (project && Array.isArray(project.tasks)) {
            setTasks(project.tasks);
        }
    }, [project]);

    // Save tasks to backend/localStorage
    const saveTasks = async (updatedTasks: Task[]) => {
        setTasks(updatedTasks);
        if (project) {
            const updatedProject = { ...project, tasks: updatedTasks };
            setProject(updatedProject);
            // Save to backend
            const userEmail = localStorage.getItem("user:username");
            if (userEmail) {
                await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`, {
                    method: "POST",
                    body: JSON.stringify([
                        ...JSON.parse(localStorage.getItem('projects:backup') || '[]').filter((p: any) => p.id !== project.id),
                        updatedProject
                    ]),
                });
                localStorage.setItem('projects:backup', JSON.stringify([
                    ...JSON.parse(localStorage.getItem('projects:backup') || '[]').filter((p: any) => p.id !== project.id),
                    updatedProject
                ]));
            }
        }
    };

    // Add task handler
    const handleAddTask = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newTask.title?.trim()) return;
        setAddingTask(true);
        const now = new Date().toISOString();
        const task: Task = {
            id: Date.now().toString(),
            title: newTask.title!,
            description: newTask.description || '',
            assignee: newTask.assignee || '',
            status: newTask.status || 'todo',
            priority: newTask.priority || 'medium',
            dueDate: newTask.dueDate || '',
            createdAt: now,
            updatedAt: now,
        };
        const updatedTasks = [...tasks, task];
        await saveTasks(updatedTasks);
        setNewTask({ title: '', description: '', assignee: '', status: 'todo', priority: 'medium', dueDate: '' });
        setAddingTask(false);
    };

    // Edit task handler
    const handleEditTask = (task: Task) => {
        setEditingTaskId(task.id);
        setEditTask({ ...task });
    };
    const handleSaveEditTask = async () => {
        if (!editTask.title?.trim() || !editingTaskId) return;
        const updatedTasks = tasks.map(t => t.id === editingTaskId ? { ...t, ...editTask, updatedAt: new Date().toISOString() } : t);
        await saveTasks(updatedTasks);
        setEditingTaskId(null);
        setEditTask({});
    };
    const handleDeleteTask = async (id: string) => {
        const updatedTasks = tasks.filter(t => t.id !== id);
        await saveTasks(updatedTasks);
    };

    // Kanban columns
    const kanbanColumns = [
        { key: 'todo', label: 'To Do' },
        { key: 'in-progress', label: 'In Progress' },
        { key: 'blocked', label: 'Blocked' },
        { key: 'done', label: 'Done' },
    ];

    // Handle drag end
    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;
        const task = tasks.find(t => t.id === draggableId);
        if (!task) return;
        // Remove from old column
        let updatedTasks = tasks.filter(t => t.id !== draggableId);
        // Insert into new column with updated status
        const updatedTask = { ...task, status: destination.droppableId as Task['status'], updatedAt: new Date().toISOString() };
        // Insert at new index
        const destTasks = updatedTasks.filter(t => t.status === destination.droppableId);
        destTasks.splice(destination.index, 0, updatedTask);
        updatedTasks = [
            ...updatedTasks.filter(t => t.status !== destination.droppableId),
            ...destTasks
        ];
        await saveTasks(updatedTasks);
    };

    // Handle file upload (stub for now)
    const handleProjectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadError(null);
        // Simulate upload and add to state
        setTimeout(() => {
            setFiles(f => [
                ...f,
                {
                    id: Date.now().toString(),
                    name: file.name,
                    size: file.size,
                    uploader: userName || 'You',
                    date: new Date().toISOString(),
                    url: URL.createObjectURL(file),
                },
            ]);
            setUploading(false);
        }, 1000);
    };

    useEffect(() => {
        if (!userName) return;
        const checkTaskReminders = () => {
            const now = new Date();
            const todayStr = now.toISOString().slice(0, 10);
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const tomorrowStr = tomorrow.toISOString().slice(0, 10);
            tasks.forEach(task => {
                if (!task.dueDate || task.status === 'done') return;
                if (task.dueDate === todayStr) {
                    showNotification({
                        title: 'Task Due Today',
                        message: `"${task.title}" is due today!`,
                        color: 'blue',
                    });
                } else if (task.dueDate === tomorrowStr) {
                    showNotification({
                        title: 'Task Due Tomorrow',
                        message: `"${task.title}" is due tomorrow!`,
                        color: 'yellow',
                    });
                } else if (task.dueDate < todayStr) {
                    showNotification({
                        title: 'Task Overdue',
                        message: `"${task.title}" is overdue!`,
                        color: 'red',
                    });
                }
            });
        };
        checkTaskReminders();
        const interval = setInterval(checkTaskReminders, 10 * 60 * 1000); // every 10 minutes
        return () => clearInterval(interval);
    }, [tasks, userName]);

    if (loading) {
        return (
            <Center style={{ minHeight: 200 }}>
                <Loader />
            </Center>
        );
    }

    if (!project) {
        return (
            <Container size="md" mt={40}>
                <Title order={2} mb="lg" c="red">
                    Project not found
                </Title>
                <Text c="dimmed">The project you are looking for does not exist.</Text>
            </Container>
        );
    }

    // Build project context for AI
    const fileContext = files && files.length ? `Files: ${files.map(f => `${f.name} (by ${f.uploader}, ${f.date ? new Date(f.date).toLocaleDateString() : 'unknown'})`).join('; ')}` : '';
    const researchContext = researchItems && researchItems.length ? `Research: ${researchItems.map((r: any) => `${r.title} [${r.type}] (tags: ${(r.tags || []).join(', ')})`).join('; ')}` : '';
    const recentTaskActivity = tasks.length ? tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5).map(t => `${t.title} (${t.status}, updated: ${new Date(t.updatedAt).toLocaleString()})`).join('; ') : '';
    const recentFileActivity = files && files.length ? files.slice(-5).map(f => `${f.name} uploaded by ${f.uploader} on ${f.date ? new Date(f.date).toLocaleDateString() : 'unknown'}`).join('; ') : '';
    const recentActivity = [recentTaskActivity, recentFileActivity].filter(Boolean).join(' | ');
    const projectContext = project ? `Project: ${project.name}\nMembers: ${(project.members || []).join(', ')}\nTasks: ${tasks.map(t => `${t.title} (assignee: ${t.assignee}, due: ${t.dueDate || 'none'}, status: ${t.status})`).join('; ')}\nDeadlines: ${tasks.filter(t => t.dueDate).map(t => `${t.title}: ${t.dueDate}`).join('; ')}\n${fileContext}\n${researchContext}\nRecent Activity: ${recentActivity}` : '';

    return (
        <>
            <Box style={{ minHeight: '100vh', background: styles.background, position: 'relative', overflow: 'hidden' }}>
                {/* Futuristic Glow Overlay */}
                <div style={styles.overlay} />
                <Container size="md" mt={40}>
                    <Title order={2} mb="lg" style={{ color: styles.textColor, fontWeight: 800, letterSpacing: 1 }}>
                        Project: {project.name || projectId}
                    </Title>
                    <AskAI context={projectContext} />
                    <Modal opened={settingsOpened} onClose={() => setSettingsOpened(false)} title="Rename Project" centered
                        styles={{
                            content: {
                                background: 'rgba(24,28,43,0.92)',
                                border: '1.5px solid #3a2e5d44',
                                boxShadow: '0 2px 16px #232b4d22',
                                color: '#fff',
                                borderRadius: 24,
                                padding: 32,
                            },
                        }}
                    >
                        <form onSubmit={e => { e.preventDefault(); handleRename(); }}>
                            <TextInput
                                label="Project Name"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.currentTarget.value)}
                                mb="md"
                            />
                            <Button type="submit" loading={renaming} fullWidth disabled={!renameValue} variant={styles.buttonGradient} style={{ fontWeight: 700, color: '#fff', boxShadow: '0 2px 16px #232b4d44' }}>
                                Save
                            </Button>
                        </form>
                    </Modal>
                    <Box style={{ display: 'flex', gap: 0, alignItems: 'flex-start', minHeight: 600, width: '100%' }}>
                        <Tabs value={activeTab} onChange={value => setActiveTab(value || "default")}
                            orientation="vertical"
                            style={{ flex: 1, display: 'flex' }}
                            styles={{
                                tab: {
                                    background: 'none',
                                    color: styles.secondaryTextColor,
                                    borderRadius: 8,
                                    fontWeight: 700,
                                    marginBottom: 4,
                                    padding: '12px 20px',
                                    textAlign: 'left',
                                    fontSize: 16,
                                },
                                list: {
                                    background: styles.tabListBackground,
                                    borderRadius: 16,
                                    boxShadow: styles.cardShadow,
                                    padding: 8,
                                    minWidth: 180,
                                },
                                panel: {
                                    background: styles.tabPanelBackground,
                                    borderRadius: 24,
                                    color: styles.textColor,
                                },
                            }}
                        >
                            <Tabs.List style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, border: 'none', boxShadow: 'none', minWidth: 180 }}>
                                <Tabs.Tab value="dashboard" style={{ background: 'none', color: activeTab === 'dashboard' ? '#1769aa' : '#222', fontWeight: 600, fontSize: 16, border: 'none', borderBottom: activeTab === 'dashboard' ? '3px solid #1769aa' : '3px solid transparent', borderRadius: 0, minWidth: 110, minHeight: 48, margin: '0 2px', transition: 'color 0.18s, border-bottom 0.18s', boxShadow: 'none', outline: 'none' }} onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '3px solid #1769aa'; }} onMouseOut={e => { e.currentTarget.style.color = activeTab === 'dashboard' ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = activeTab === 'dashboard' ? '3px solid #1769aa' : '3px solid transparent'; }}>Dashboard</Tabs.Tab>
                                <Tabs.Tab value="tasks" style={{ background: 'none', color: activeTab === 'tasks' ? '#1769aa' : '#222', fontWeight: 600, fontSize: 16, border: 'none', borderBottom: activeTab === 'tasks' ? '3px solid #1769aa' : '3px solid transparent', borderRadius: 0, minWidth: 110, minHeight: 48, margin: '0 2px', transition: 'color 0.18s, border-bottom 0.18s', boxShadow: 'none', outline: 'none' }} onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '3px solid #1769aa'; }} onMouseOut={e => { e.currentTarget.style.color = activeTab === 'tasks' ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = activeTab === 'tasks' ? '3px solid #1769aa' : '3px solid transparent'; }}>Tasks</Tabs.Tab>
                                <Tabs.Tab value="calendar" style={{ background: 'none', color: activeTab === 'calendar' ? '#1769aa' : '#222', fontWeight: 600, fontSize: 16, border: 'none', borderBottom: activeTab === 'calendar' ? '3px solid #1769aa' : '3px solid transparent', borderRadius: 0, minWidth: 110, minHeight: 48, margin: '0 2px', transition: 'color 0.18s, border-bottom 0.18s', boxShadow: 'none', outline: 'none' }} onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '3px solid #1769aa'; }} onMouseOut={e => { e.currentTarget.style.color = activeTab === 'calendar' ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = activeTab === 'calendar' ? '3px solid #1769aa' : '3px solid transparent'; }}>Calendar</Tabs.Tab>
                                <Tabs.Tab value="files" style={{ background: 'none', color: activeTab === 'files' ? '#1769aa' : '#222', fontWeight: 600, fontSize: 16, border: 'none', borderBottom: activeTab === 'files' ? '3px solid #1769aa' : '3px solid transparent', borderRadius: 0, minWidth: 110, minHeight: 48, margin: '0 2px', transition: 'color 0.18s, border-bottom 0.18s', boxShadow: 'none', outline: 'none' }} onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '3px solid #1769aa'; }} onMouseOut={e => { e.currentTarget.style.color = activeTab === 'files' ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = activeTab === 'files' ? '3px solid #1769aa' : '3px solid transparent'; }}>Files</Tabs.Tab>
                                <Tabs.Tab value="research" style={{ background: 'none', color: activeTab === 'research' ? '#1769aa' : '#222', fontWeight: 600, fontSize: 16, border: 'none', borderBottom: activeTab === 'research' ? '3px solid #1769aa' : '3px solid transparent', borderRadius: 0, minWidth: 110, minHeight: 48, margin: '0 2px', transition: 'color 0.18s, border-bottom 0.18s', boxShadow: 'none', outline: 'none' }} onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '3px solid #1769aa'; }} onMouseOut={e => { e.currentTarget.style.color = activeTab === 'research' ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = activeTab === 'research' ? '3px solid #1769aa' : '3px solid transparent'; }}>Research</Tabs.Tab>
                                {docTabs.map(tab => (
                                    <Tabs.Tab key={tab.id} value={tab.id} style={{ background: 'none', color: activeTab === tab.id ? '#1769aa' : '#222', fontWeight: 600, fontSize: 16, border: 'none', borderBottom: activeTab === tab.id ? '3px solid #1769aa' : '3px solid transparent', borderRadius: 0, minWidth: 110, minHeight: 48, margin: '0 2px', transition: 'color 0.18s, border-bottom 0.18s', boxShadow: 'none', outline: 'none' }} onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '3px solid #1769aa'; }} onMouseOut={e => { e.currentTarget.style.color = activeTab === tab.id ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = activeTab === tab.id ? '3px solid #1769aa' : '3px solid transparent'; }}>{tab.title}</Tabs.Tab>
                                ))}
                                <Tabs.Tab value="templates" style={{ background: 'none', color: activeTab === 'templates' ? '#1769aa' : '#222', fontWeight: 600, fontSize: 16, border: 'none', borderBottom: activeTab === 'templates' ? '3px solid #1769aa' : '3px solid transparent', borderRadius: 0, minWidth: 110, minHeight: 48, margin: '0 2px', transition: 'color 0.18s, border-bottom 0.18s', boxShadow: 'none', outline: 'none' }} onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '3px solid #1769aa'; }} onMouseOut={e => { e.currentTarget.style.color = activeTab === 'templates' ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = activeTab === 'templates' ? '3px solid #1769aa' : '3px solid transparent'; }}>Templates</Tabs.Tab>
                                <Tabs.Tab value="chat" style={{ background: 'none', color: activeTab === 'chat' ? '#1769aa' : '#222', fontWeight: 600, fontSize: 16, border: 'none', borderBottom: activeTab === 'chat' ? '3px solid #1769aa' : '3px solid transparent', borderRadius: 0, minWidth: 110, minHeight: 48, margin: '0 2px', transition: 'color 0.18s, border-bottom 0.18s', boxShadow: 'none', outline: 'none' }} onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '3px solid #1769aa'; }} onMouseOut={e => { e.currentTarget.style.color = activeTab === 'chat' ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = activeTab === 'chat' ? '3px solid #1769aa' : '3px solid transparent'; }}>SparkChat</Tabs.Tab>
                                <Tabs.Tab value="members" style={{ background: 'none', color: activeTab === 'members' ? '#1769aa' : '#222', fontWeight: 600, fontSize: 16, border: 'none', borderBottom: activeTab === 'members' ? '3px solid #1769aa' : '3px solid transparent', borderRadius: 0, minWidth: 110, minHeight: 48, margin: '0 2px', transition: 'color 0.18s, border-bottom 0.18s', boxShadow: 'none', outline: 'none' }} onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '3px solid #1769aa'; }} onMouseOut={e => { e.currentTarget.style.color = activeTab === 'members' ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = activeTab === 'members' ? '3px solid #1769aa' : '3px solid transparent'; }}>Members</Tabs.Tab>
                            </Tabs.List>
                            <Tabs.Panel value="dashboard" pt="md">
                                <Box style={{ flex: 1, minWidth: 0, marginLeft: 32 }}>
                                    <Box p="md" style={{ background: styles.cardBackground, border: styles.cardBorder, borderRadius: 16, boxShadow: styles.cardShadow, minHeight: 400 }}>
                                        <Title order={3} style={{ color: styles.accentColor, marginBottom: 16 }}>Executive Dashboard</Title>
                                        <Group align="flex-start" gap={32}>
                                            {/* Project Stats */}
                                            <Stack style={{ minWidth: 220 }}>
                                                <Title order={5} style={{ color: styles.secondaryTextColor }}>Project Stats</Title>
                                                <Group gap={12}>
                                                    <Paper p="md" radius={8} style={{ background: '#f5f7fa', minWidth: 90, textAlign: 'center' }}>
                                                        <Text size="lg" fw={700}>{tasks.length}</Text>
                                                        <Text size="xs" c="dimmed">Total Tasks</Text>
                                                    </Paper>
                                                    <Paper p="md" radius={8} style={{ background: '#e3fcec', minWidth: 90, textAlign: 'center' }}>
                                                        <Text size="lg" fw={700}>{tasks.filter(t => t.status === 'done').length}</Text>
                                                        <Text size="xs" c="dimmed">Completed</Text>
                                                    </Paper>
                                                    <Paper p="md" radius={8} style={{ background: '#ffeaea', minWidth: 90, textAlign: 'center' }}>
                                                        <Text size="lg" fw={700}>{tasks.filter(t => t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10) && t.status !== 'done').length}</Text>
                                                        <Text size="xs" c="dimmed">Overdue</Text>
                                                    </Paper>
                                                    <Paper p="md" radius={8} style={{ background: '#e3eaff', minWidth: 90, textAlign: 'center' }}>
                                                        <Text size="lg" fw={700}>{tasks.filter(t => t.dueDate && t.dueDate >= new Date().toISOString().slice(0, 10) && t.status !== 'done').length}</Text>
                                                        <Text size="xs" c="dimmed">Upcoming</Text>
                                                    </Paper>
                                                </Group>
                                            </Stack>
                                            {/* Upcoming Deadlines */}
                                            <Stack style={{ minWidth: 220, flex: 1 }}>
                                                <Title order={5} style={{ color: styles.secondaryTextColor }}>Upcoming Deadlines</Title>
                                                {tasks.filter(t => t.dueDate && t.status !== 'done' && t.dueDate >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5).map(task => (
                                                    <Paper key={task.id} p="sm" radius={8} style={{ background: '#fff', border: '1px solid #e3e8ee', marginBottom: 4 }}>
                                                        <Group justify="space-between">
                                                            <Text fw={600}>{task.title}</Text>
                                                            <Text size="xs" c="dimmed">{task.dueDate}</Text>
                                                        </Group>
                                                        <Text size="xs" c="dimmed">{task.description}</Text>
                                                    </Paper>
                                                ))}
                                                {tasks.filter(t => t.dueDate && t.status !== 'done' && t.dueDate >= new Date().toISOString().slice(0, 10)).length === 0 && (
                                                    <Text c="dimmed">No upcoming deadlines.</Text>
                                                )}
                                            </Stack>
                                            {/* Recent Activity */}
                                            <Stack style={{ minWidth: 220, flex: 1 }}>
                                                <Title order={5} style={{ color: styles.secondaryTextColor }}>Recent Activity</Title>
                                                {[...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5).map(task => (
                                                    <Paper key={task.id} p="sm" radius={8} style={{ background: '#fff', border: '1px solid #e3e8ee', marginBottom: 4 }}>
                                                        <Group justify="space-between">
                                                            <Text fw={600}>{task.title}</Text>
                                                            <Text size="xs" c="dimmed">{new Date(task.updatedAt).toLocaleString()}</Text>
                                                        </Group>
                                                        <Text size="xs" c="dimmed">{task.description}</Text>
                                                    </Paper>
                                                ))}
                                                {tasks.length === 0 && <Text c="dimmed">No recent activity.</Text>}
                                            </Stack>
                                        </Group>
                                    </Box>
                                </Box>
                            </Tabs.Panel>
                            <Tabs.Panel value="tasks" pt="md">
                                <Box style={{ flex: 1, minWidth: 0, marginLeft: 32 }}>
                                    <Box p="md" style={{ background: styles.cardBackground, border: styles.cardBorder, borderRadius: 16, boxShadow: styles.cardShadow }}>
                                        <Group justify="space-between" mb="md">
                                            <Title order={3} style={{ color: styles.accentColor, marginBottom: 0 }}>Tasks</Title>
                                            <Group>
                                                <Button
                                                    variant={taskView === 'list' ? 'filled' : 'light'}
                                                    color={taskView === 'list' ? styles.accentColor : 'gray'}
                                                    onClick={() => setTaskView('list')}
                                                >
                                                    List View
                                                </Button>
                                                <Button
                                                    variant={taskView === 'board' ? 'filled' : 'light'}
                                                    color={taskView === 'board' ? styles.accentColor : 'gray'}
                                                    onClick={() => setTaskView('board')}
                                                >
                                                    Board View
                                                </Button>
                                            </Group>
                                        </Group>
                                        {taskView === 'list' ? (
                                            <>
                                                <form onSubmit={handleAddTask} style={{ marginBottom: 16 }}>
                                                    <Group align="end" gap="xs">
                                                        <TextInput
                                                            label="Title"
                                                            value={newTask.title}
                                                            onChange={e => {
                                                                const value = e?.currentTarget?.value ?? '';
                                                                setNewTask(nt => ({ ...nt, title: value }));
                                                            }}
                                                            required
                                                            style={{ flex: 2 }}
                                                        />
                                                        <TextInput
                                                            label="Assignee"
                                                            value={newTask.assignee}
                                                            onChange={e => {
                                                                const value = e?.currentTarget?.value ?? '';
                                                                setNewTask(nt => ({ ...nt, assignee: value }));
                                                            }}
                                                            placeholder="Email or name"
                                                            style={{ flex: 1 }}
                                                        />
                                                        <TextInput
                                                            label="Due Date"
                                                            type="date"
                                                            value={newTask.dueDate}
                                                            onChange={e => {
                                                                const value = e?.currentTarget?.value ?? '';
                                                                setNewTask(nt => ({ ...nt, dueDate: value }));
                                                            }}
                                                            style={{ flex: 1 }}
                                                        />
                                                        <Select
                                                            label="Priority"
                                                            value={newTask.priority}
                                                            onChange={v => setNewTask(nt => ({ ...nt, priority: v as Task['priority'] }))}
                                                            data={[
                                                                { value: 'low', label: 'Low' },
                                                                { value: 'medium', label: 'Medium' },
                                                                { value: 'high', label: 'High' },
                                                                { value: 'critical', label: 'Critical' },
                                                            ]}
                                                            style={{ flex: 1 }}
                                                        />
                                                        <Button type="submit" loading={addingTask} style={{ flex: 1 }}>Add Task</Button>
                                                    </Group>
                                                    <Textarea
                                                        label="Description"
                                                        value={newTask.description}
                                                        onChange={e => {
                                                            const value = e?.currentTarget?.value ?? '';
                                                            setNewTask(nt => ({ ...nt, description: value }));
                                                        }}
                                                        minRows={2}
                                                        style={{ marginTop: 8 }}
                                                    />
                                                </form>
                                                <Stack gap="sm">
                                                    {tasks.length === 0 && <Text c="dimmed">No tasks yet. Add your first task!</Text>}
                                                    {tasks.map(task => (
                                                        <Paper key={task.id} withBorder p="md" radius="md" style={{ background: styles.tabPanelBackground, border: styles.cardBorder, color: styles.textColor, boxShadow: styles.cardShadow }}>
                                                            {editingTaskId === task.id ? (
                                                                <Stack gap="xs">
                                                                    <Group gap="xs">
                                                                        <TextInput
                                                                            value={editTask.title}
                                                                            onChange={e => {
                                                                                const value = e?.currentTarget?.value ?? '';
                                                                                setEditTask(et => ({ ...et, title: value }));
                                                                            }}
                                                                            required
                                                                            style={{ flex: 2 }}
                                                                        />
                                                                        <TextInput
                                                                            value={editTask.assignee}
                                                                            onChange={e => {
                                                                                const value = e?.currentTarget?.value ?? '';
                                                                                setEditTask(et => ({ ...et, assignee: value }));
                                                                            }}
                                                                            placeholder="Email or name"
                                                                            style={{ flex: 1 }}
                                                                        />
                                                                        <TextInput
                                                                            type="date"
                                                                            value={editTask.dueDate}
                                                                            onChange={e => {
                                                                                const value = e?.currentTarget?.value ?? '';
                                                                                setEditTask(et => ({ ...et, dueDate: value }));
                                                                            }}
                                                                            style={{ flex: 1 }}
                                                                        />
                                                                        <Select
                                                                            value={editTask.priority}
                                                                            onChange={v => setEditTask(et => ({ ...et, priority: v as Task['priority'] }))}
                                                                            data={[
                                                                                { value: 'low', label: 'Low' },
                                                                                { value: 'medium', label: 'Medium' },
                                                                                { value: 'high', label: 'High' },
                                                                                { value: 'critical', label: 'Critical' },
                                                                            ]}
                                                                            style={{ flex: 1 }}
                                                                        />
                                                                    </Group>
                                                                    <Textarea
                                                                        value={editTask.description}
                                                                        onChange={e => {
                                                                            const value = e?.currentTarget?.value ?? '';
                                                                            setEditTask(et => ({ ...et, description: value }));
                                                                        }}
                                                                        minRows={2}
                                                                    />
                                                                    <Group gap="xs">
                                                                        <Button onClick={handleSaveEditTask} style={{ flex: 1 }}>Save</Button>
                                                                        <Button variant="light" color="red" onClick={() => setEditingTaskId(null)} style={{ flex: 1 }}>Cancel</Button>
                                                                    </Group>
                                                                </Stack>
                                                            ) : (
                                                                <Group justify="space-between" align="flex-start">
                                                                    <div style={{ flex: 3 }}>
                                                                        <Group gap="xs">
                                                                            <Badge color={task.status === 'done' ? 'green' : task.status === 'in-progress' ? 'blue' : task.status === 'blocked' ? 'red' : 'gray'}>{task.status.replace(/-/g, ' ').toUpperCase()}</Badge>
                                                                            <Badge color={task.priority === 'critical' ? 'red' : task.priority === 'high' ? 'orange' : task.priority === 'medium' ? 'yellow' : 'gray'}>{task.priority.toUpperCase()}</Badge>
                                                                            {task.dueDate && <Badge color={new Date(task.dueDate) < new Date() ? 'red' : 'blue'}>{new Date(task.dueDate).toLocaleDateString()}</Badge>}
                                                                        </Group>
                                                                        <Title order={5} style={{ margin: '4px 0', color: styles.accentColor }}>{task.title}</Title>
                                                                        <Text size="sm" c={styles.secondaryTextColor}>{task.description}</Text>
                                                                        {task.assignee && (
                                                                            <Group gap={4} mt={4}>
                                                                                <Avatar size={24} color="blue" radius="xl">{getInitials(task.assignee)}</Avatar>
                                                                                <Text size="xs" c={styles.secondaryTextColor}>{task.assignee}</Text>
                                                                            </Group>
                                                                        )}
                                                                    </div>
                                                                    <Group gap="xs" style={{ flex: 1, justifyContent: 'flex-end' }}>
                                                                        <ActionIcon variant="subtle" color="blue" onClick={() => handleEditTask(task)}><IconEdit size={18} /></ActionIcon>
                                                                        <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteTask(task.id)}><IconTrash size={18} /></ActionIcon>
                                                                    </Group>
                                                                </Group>
                                                            )}
                                                        </Paper>
                                                    ))}
                                                </Stack>
                                            </>
                                        ) : (
                                            <DragDropContext onDragEnd={onDragEnd}>
                                                <Group align="flex-start" gap="md" style={{ overflowX: 'auto' }}>
                                                    {kanbanColumns.map(col => (
                                                        <Droppable droppableId={col.key} key={col.key}>
                                                            {(provided, snapshot) => (
                                                                <Box
                                                                    ref={provided.innerRef}
                                                                    {...provided.droppableProps}
                                                                    style={{
                                                                        background: snapshot.isDraggingOver ? '#e3e8ee' : styles.tabPanelBackground,
                                                                        border: styles.cardBorder,
                                                                        borderRadius: 12,
                                                                        minWidth: 260,
                                                                        minHeight: 400,
                                                                        padding: 16,
                                                                        boxShadow: styles.cardShadow,
                                                                        marginRight: 8,
                                                                    }}
                                                                >
                                                                    <Title order={5} style={{ color: styles.accentColor, marginBottom: 8 }}>{col.label}</Title>
                                                                    {tasks.filter(t => t.status === col.key).map((task, idx) => (
                                                                        <Draggable draggableId={task.id} index={idx} key={task.id}>
                                                                            {(provided, snapshot) => (
                                                                                <Paper
                                                                                    ref={provided.innerRef}
                                                                                    {...provided.draggableProps}
                                                                                    {...provided.dragHandleProps}
                                                                                    withBorder p="md" radius="md"
                                                                                    style={{
                                                                                        background: snapshot.isDragging ? '#e3e8ee' : styles.cardBackground,
                                                                                        border: styles.cardBorder,
                                                                                        color: styles.textColor,
                                                                                        boxShadow: styles.cardShadow,
                                                                                        marginBottom: 12,
                                                                                        ...provided.draggableProps.style,
                                                                                    }}
                                                                                >
                                                                                    <Group gap="xs">
                                                                                        <Badge color={task.priority === 'critical' ? 'red' : task.priority === 'high' ? 'orange' : task.priority === 'medium' ? 'yellow' : 'gray'}>{task.priority.toUpperCase()}</Badge>
                                                                                        {task.dueDate && <Badge color={new Date(task.dueDate) < new Date() ? 'red' : 'blue'}>{new Date(task.dueDate).toLocaleDateString()}</Badge>}
                                                                                    </Group>
                                                                                    <Title order={6} style={{ margin: '4px 0', color: styles.accentColor }}>{task.title}</Title>
                                                                                    <Text size="sm" c={styles.secondaryTextColor}>{task.description}</Text>
                                                                                    {task.assignee && (
                                                                                        <Group gap={4} mt={4}>
                                                                                            <Avatar size={24} color="blue" radius="xl">{getInitials(task.assignee)}</Avatar>
                                                                                            <Text size="xs" c={styles.secondaryTextColor}>{task.assignee}</Text>
                                                                                        </Group>
                                                                                    )}
                                                                                </Paper>
                                                                            )}
                                                                        </Draggable>
                                                                    ))}
                                                                    {provided.placeholder}
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
                            <Tabs.Panel value="calendar" pt="md">
                                <Box style={{ flex: 1, minWidth: 0, marginLeft: 32 }}>
                                    <Box p="md" style={{ background: styles.cardBackground, border: styles.cardBorder, borderRadius: 16, boxShadow: styles.cardShadow, minHeight: 400 }}>
                                        <Group justify="space-between" align="center" mb={16}>
                                            <Title order={3} style={{ color: styles.accentColor, marginBottom: 0 }}>Project Calendar</Title>
                                            <Button variant="light" color="blue" onClick={() => {
                                                const ics = generateICS(tasks, project?.name || 'Project');
                                                const blob = new Blob([ics.replace(/\n/g, '\r\n')], { type: 'text/calendar' });
                                                saveAs(blob, `${project?.name || 'project'}-tasks.ics`);
                                            }}>Export to Calendar</Button>
                                        </Group>
                                        <div style={{ height: 600, background: '#fff', borderRadius: 12, boxShadow: styles.cardShadow, padding: 8 }}>
                                            <BigCalendar
                                                localizer={localizer}
                                                events={tasks.filter(t => t.dueDate).map(task => ({
                                                    id: task.id,
                                                    title: task.title,
                                                    start: new Date(task.dueDate),
                                                    end: new Date(task.dueDate),
                                                    allDay: true,
                                                    resource: task,
                                                }))}
                                                startAccessor="start"
                                                endAccessor="end"
                                                style={{ height: 540, borderRadius: 12 }}
                                                eventPropGetter={(event) => {
                                                    const task = event.resource;
                                                    let backgroundColor = '#1769aa'; // upcoming
                                                    if (task.status === 'done') backgroundColor = '#b0b7ff'; // completed
                                                    else if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done') backgroundColor = '#e57373'; // overdue
                                                    return {
                                                        style: {
                                                            backgroundColor,
                                                            color: '#fff',
                                                            borderRadius: 8,
                                                            border: 'none',
                                                            fontWeight: 600,
                                                            fontSize: 15,
                                                            boxShadow: '0 2px 8px rgba(44,62,80,0.08)',
                                                        },
                                                    };
                                                }}
                                                onSelectEvent={event => {
                                                    setCalendarModalMode('edit');
                                                    setCalendarTask(event.resource);
                                                    setCalendarSelectedDate(new Date(event.resource.dueDate));
                                                    setCalendarModalOpen(true);
                                                }}
                                                onSelectSlot={slotInfo => {
                                                    setCalendarModalMode('add');
                                                    setCalendarTask({ title: '', description: '', assignee: '', status: 'todo', priority: 'medium', dueDate: slotInfo.start });
                                                    setCalendarSelectedDate(slotInfo.start);
                                                    setCalendarModalOpen(true);
                                                }}
                                                selectable
                                                views={['month', 'week', 'day']}
                                                popup
                                            />
                                        </div>
                                        <Modal opened={calendarModalOpen} onClose={() => setCalendarModalOpen(false)} title={calendarModalMode === 'add' ? 'Add Task' : 'Edit Task'} centered>
                                            <form onSubmit={async e => {
                                                e.preventDefault();
                                                if (!calendarTask.title?.trim()) return;
                                                if (calendarModalMode === 'add') {
                                                    const now = new Date().toISOString();
                                                    const newTask: Task = {
                                                        id: Date.now().toString(),
                                                        title: calendarTask.title!,
                                                        description: calendarTask.description || '',
                                                        assignee: calendarTask.assignee || '',
                                                        status: calendarTask.status || 'todo',
                                                        priority: calendarTask.priority || 'medium',
                                                        dueDate: calendarSelectedDate ? calendarSelectedDate.toISOString().slice(0, 10) : '',
                                                        createdAt: now,
                                                        updatedAt: now,
                                                    };
                                                    await saveTasks([...tasks, newTask]);
                                                } else if (calendarModalMode === 'edit' && calendarTask.id) {
                                                    const updatedTasks = tasks.map(t => t.id === calendarTask.id ? { ...t, ...calendarTask, dueDate: calendarSelectedDate ? calendarSelectedDate.toISOString().slice(0, 10) : t.dueDate, updatedAt: new Date().toISOString() } : t);
                                                    await saveTasks(updatedTasks);
                                                }
                                                setCalendarModalOpen(false);
                                            }}>
                                                <Stack gap={12}>
                                                    <TextInput label="Title" value={calendarTask.title} onChange={e => setCalendarTask(t => ({ ...t, title: e.target.value }))} required />
                                                    <Textarea label="Description" value={calendarTask.description} onChange={e => setCalendarTask(t => ({ ...t, description: e.target.value }))} minRows={2} />
                                                    <TextInput label="Assignee" value={calendarTask.assignee} onChange={e => setCalendarTask(t => ({ ...t, assignee: e.target.value }))} placeholder="Email or name" />
                                                    <Select label="Status" value={calendarTask.status} onChange={v => setCalendarTask(t => ({ ...t, status: v as Task['status'] }))} data={[{ value: 'todo', label: 'To Do' }, { value: 'in-progress', label: 'In Progress' }, { value: 'blocked', label: 'Blocked' }, { value: 'done', label: 'Done' }]} />
                                                    <Select label="Priority" value={calendarTask.priority} onChange={v => setCalendarTask(t => ({ ...t, priority: v as Task['priority'] }))} data={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]} />
                                                    <TextInput label="Due Date" type="date" value={calendarSelectedDate ? calendarSelectedDate.toISOString().slice(0, 10) : ''} onChange={e => setCalendarSelectedDate(new Date(e.target.value))} />
                                                    <Group justify="space-between" mt={8}>
                                                        {calendarModalMode === 'edit' && calendarTask.id && (
                                                            <Group gap={8}>
                                                                <Button color="green" variant="light" onClick={async e => {
                                                                    e.preventDefault();
                                                                    const updatedTasks = tasks.map(t => t.id === calendarTask.id ? { ...t, status: 'done', updatedAt: new Date().toISOString() } : t);
                                                                    await saveTasks(updatedTasks);
                                                                    setCalendarModalOpen(false);
                                                                }}>Mark as Done</Button>
                                                                <Button color="red" variant="light" onClick={async e => {
                                                                    e.preventDefault();
                                                                    if (window.confirm('Delete this task?')) {
                                                                        const updatedTasks = tasks.filter(t => t.id !== calendarTask.id);
                                                                        await saveTasks(updatedTasks);
                                                                        setCalendarModalOpen(false);
                                                                    }
                                                                }}>Delete</Button>
                                                            </Group>
                                                        )}
                                                        <Group gap={8}>
                                                            <Button variant="default" onClick={() => setCalendarModalOpen(false)}>Cancel</Button>
                                                            <Button type="submit">{calendarModalMode === 'add' ? 'Add Task' : 'Save Changes'}</Button>
                                                        </Group>
                                                    </Group>
                                                </Stack>
                                            </form>
                                        </Modal>
                                    </Box>
                                </Box>
                            </Tabs.Panel>
                            <Tabs.Panel value="files" pt="md">
                                <Box style={{ flex: 1, minWidth: 0, marginLeft: 32 }}>
                                    <Box p="md" style={{ background: styles.cardBackground, border: styles.cardBorder, borderRadius: 16, boxShadow: styles.cardShadow }}>
                                        <Title order={3} style={{ color: styles.accentColor, marginBottom: 12 }}>Files</Title>
                                        <Group mb="md">
                                            <input type="file" id="file-upload" style={{ display: 'none' }} onChange={handleProjectFileUpload} />
                                            <Button
                                                leftSection={<IconUpload size={18} />}
                                                onClick={() => document.getElementById('file-upload')?.click()}
                                                loading={uploading}
                                                style={{ fontWeight: 700, borderRadius: 12 }}
                                            >
                                                Upload File
                                            </Button>
                                            {uploadError && <Text c="red">{uploadError}</Text>}
                                        </Group>
                                        <Stack gap="sm">
                                            {files.length === 0 && <Text c="dimmed">No files uploaded yet.</Text>}
                                            {files.map(file => (
                                                <Paper key={file.id} withBorder p="md" radius="md" style={{ background: styles.tabPanelBackground, border: styles.cardBorder, color: styles.textColor, boxShadow: styles.cardShadow, display: 'flex', alignItems: 'center', gap: 16 }}>
                                                    <IconFile size={28} style={{ color: styles.accentColor }} />
                                                    <div style={{ flex: 1 }}>
                                                        <Text fw={600}>{file.name}</Text>
                                                        <Text size="xs" c={styles.secondaryTextColor}>{(file.size / 1024).toFixed(1)} KB • Uploaded by {file.uploader} • {new Date(file.date).toLocaleDateString()}</Text>
                                                    </div>
                                                    <Button
                                                        variant="light"
                                                        color={styles.accentColor}
                                                        leftSection={<IconDownload size={16} />}
                                                        component="a"
                                                        href={file.url}
                                                        download={file.name}
                                                        style={{ fontWeight: 600, borderRadius: 8 }}
                                                    >
                                                        Download
                                                    </Button>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    </Box>
                                </Box>
                            </Tabs.Panel>
                            <Tabs.Panel value="research" pt="md">
                                <Box style={{ flex: 1, minWidth: 0, marginLeft: 32 }}>
                                    {/* Ask AI/Q&A Section */}
                                    <Paper p="md" radius={12} withBorder style={{ background: '#fff', border: '1px solid #e3e8ee', marginBottom: 32, boxShadow: '0 2px 12px rgba(44,62,80,0.06)' }}>
                                        <Stack gap={16}>
                                            <Group align="flex-end" gap="md">
                                                <TextInput
                                                    label={isFollowup ? "Ask a follow-up question" : "Ask AI about your research"}
                                                    placeholder={isFollowup ? "Type your follow-up question..." : "Type your question..."}
                                                    value={qaQuestion}
                                                    onChange={e => setQaQuestion(e.target.value)}
                                                    style={{ flex: 1 }}
                                                    disabled={qaLoading}
                                                />
                                                <Button onClick={handleAskResearchAI} loading={qaLoading} disabled={!qaQuestion.trim()} style={{ height: 40 }}>
                                                    {isFollowup ? "Ask Follow-up" : "Ask AI"}
                                                </Button>
                                                {qaHistory.length > 0 && (
                                                    <Button variant="light" color="blue" onClick={handleFollowup} disabled={qaLoading} style={{ height: 40 }}>
                                                        Follow-up
                                                    </Button>
                                                )}
                                            </Group>
                                            <TextInput
                                                placeholder="Search Q&A..."
                                                value={qaSearch}
                                                onChange={e => setQaSearch(e.target.value)}
                                            />
                                            {qaError && <Text c="red">{qaError}</Text>}
                                            {qaAnswer && (
                                                <Paper p="md" radius="md" style={{ background: styles.cardBackground, color: styles.textColor }}>
                                                    <Text size="sm" style={{ whiteSpace: 'pre-line' }}>{qaAnswer}</Text>
                                                </Paper>
                                            )}
                                            {qaHistory.length > 0 && (
                                                <Stack mt={8}>
                                                    <Title order={5} mb={4} style={{ color: styles.secondaryTextColor }}>Q&A History</Title>
                                                    {qaHistory.filter(pair =>
                                                        !qaSearch.trim() ||
                                                        pair.question.toLowerCase().includes(qaSearch.toLowerCase()) ||
                                                        pair.answer.toLowerCase().includes(qaSearch.toLowerCase())
                                                    ).map((pair, idx) => (
                                                        <Paper key={pair.id} p="sm" radius="md" style={{ background: styles.tabBackground, color: styles.textColor, marginBottom: 8, position: 'relative' }}>
                                                            <Text size="sm" fw={600}>Q: {pair.question}</Text>
                                                            <Text size="sm" style={{ whiteSpace: 'pre-line', marginTop: 4 }}>A: {pair.answer}</Text>
                                                            <Button size="xs" color="red" variant="light" style={{ position: 'absolute', top: 8, right: 8 }} onClick={() => handleDeleteQAPair(pair.id)}>
                                                                Delete
                                                            </Button>
                                                            <Button size="xs" color="blue" variant="light" style={{ position: 'absolute', top: 8, right: 60 }} onClick={() => handleStartEditQAPair(pair)}>
                                                                Edit
                                                            </Button>
                                                        </Paper>
                                                    ))}
                                                    <Modal opened={!!editQAPair} onClose={handleCancelEditQAPair} title="Edit Q&A" centered>
                                                        {editQAPair && (
                                                            <Stack>
                                                                <TextInput
                                                                    label="Question"
                                                                    value={editQAPair.question}
                                                                    onChange={e => setEditQAPair((p: any) => ({ ...p, question: e.target.value }))}
                                                                    required
                                                                />
                                                                <TextInput
                                                                    label="Answer"
                                                                    value={editQAPair.answer}
                                                                    onChange={e => setEditQAPair((p: any) => ({ ...p, answer: e.target.value }))}
                                                                    required
                                                                />
                                                                <Group justify="flex-end">
                                                                    <Button variant="default" onClick={handleCancelEditQAPair}>Cancel</Button>
                                                                    <Button onClick={handleSaveEditQAPair} loading={editQALoading}>Save</Button>
                                                                </Group>
                                                            </Stack>
                                                        )}
                                                    </Modal>
                                                </Stack>
                                            )}
                                        </Stack>
                                    </Paper>
                                    {/* Research Add Form Section */}
                                    <Paper p="md" radius={12} withBorder style={{ background: '#fff', border: '1px solid #e3e8ee', marginBottom: 32, boxShadow: '0 2px 12px rgba(44,62,80,0.06)' }}>
                                        <form onSubmit={handleAddResearch}>
                                            <Stack gap={16}>
                                                <Group gap={16} align="flex-end">
                                                    <TextInput label="Title" value={newResearch.title} onChange={e => setNewResearch(r => ({ ...r, title: e.target.value }))} required style={{ flex: 2 }} />
                                                    <TextInput label="Type" value={newResearch.type} onChange={e => setNewResearch(r => ({ ...r, type: e.target.value }))} style={{ flex: 1 }} placeholder="web, note, pdf, ..." />
                                                    <TextInput label="Content" value={newResearch.content} onChange={e => setNewResearch(r => ({ ...r, content: e.target.value }))} required style={{ flex: 3 }} />
                                                    <MultiSelect label="Tags" data={allTags} value={newResearch.tags || []} onChange={tags => setNewResearch(r => ({ ...r, tags }))} searchable style={{ flex: 2 }} />
                                                </Group>
                                                <Group gap={16} align="center">
                                                    <input type="file" onChange={e => handleFileChange(e, setNewResearchFile)} style={{ flex: 2 }} />
                                                    <Button variant="outline" color="blue" onClick={handleSuggestTags} loading={suggestingTags} style={{ height: 40 }}>
                                                        Suggest Tags with AI
                                                    </Button>
                                                    <Button type="submit" loading={researchLoading} style={{ height: 40, minWidth: 100 }}>
                                                        Add
                                                    </Button>
                                                </Group>
                                            </Stack>
                                        </form>
                                    </Paper>
                                    {/* Filter/Sort Controls */}
                                    <Group mb={20} gap={12} align="center" style={{ background: 'none', padding: 0 }}>
                                        <MultiSelect label="Filter by tags" data={allTags} value={tagFilter} onChange={setTagFilter} placeholder="Select tags to filter" clearable style={{ minWidth: 220 }} />
                                        <Text size="sm" c="dimmed">Sort by:</Text>
                                        <Button size="xs" variant={sortBy === 'date' ? 'filled' : 'outline'} color="blue" onClick={() => setSortBy('date')}>Most Recent</Button>
                                        <Button size="xs" variant={sortBy === 'title' ? 'filled' : 'outline'} color="blue" onClick={() => setSortBy('title')}>Title</Button>
                                        <Button size="xs" variant={sortBy === 'type' ? 'filled' : 'outline'} color="blue" onClick={() => setSortBy('type')}>Type</Button>
                                    </Group>
                                    {/* Research Items List (unchanged) */}
                                    <Stack>
                                        {researchLoading ? (
                                            <Text>Loading research...</Text>
                                        ) : sortedResearchItems.filter((item: any) => tagFilter.length === 0 || (item.tags || []).some((tag: string) => tagFilter.includes(tag))).length === 0 ? (
                                            <Text c="dimmed">No research items match the selected tags.</Text>
                                        ) : (
                                            sortedResearchItems.filter((item: any) => tagFilter.length === 0 || (item.tags || []).some((tag: string) => tagFilter.includes(tag))).map((item: any) => {
                                                const isOpen = expanded[item.id];
                                                return (
                                                    <Paper key={item.id} withBorder p="md" radius={8} style={{ background: '#fff', border: '1px solid #e3e8ee', color: '#222', marginBottom: 8 }}>
                                                        <Group justify="space-between" align="center" style={{ cursor: 'pointer' }} onClick={() => setExpanded(e => ({ ...e, [item.id]: !e[item.id] }))}>
                                                            <Group align="center" gap={8} style={{ flex: 1 }}>
                                                                <Text fw={700}>{item.title}</Text>
                                                                <Text size="sm" c="#666">{item.type}</Text>
                                                                {item.tags && item.tags.length > 0 && (
                                                                    <Group gap="xs">
                                                                        {item.tags.map((tag: string) => (
                                                                            <Paper key={tag} p="xs" radius={16} style={{ background: '#f5f7fa', color: '#1769aa', fontWeight: 500, fontSize: 13, border: '1px solid #e3e8ee', boxShadow: 'none' }}>{tag}</Paper>
                                                                        ))}
                                                                    </Group>
                                                                )}
                                                            </Group>
                                                            <ActionIcon variant="subtle" color="blue" size={28}>
                                                                {isOpen ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                                                            </ActionIcon>
                                                        </Group>
                                                        {isOpen && (
                                                            <Box mt={12}>
                                                                <Title order={5} mb={4}>{item.title}</Title>
                                                                <Text size="sm" c="#666" mb={8}>{item.type}</Text>
                                                                <Group mb={8} gap={4}>
                                                                    {item.tags && item.tags.map(tag => (
                                                                        <Paper key={tag} p="xs" radius={16} style={{ background: '#f5f7fa', color: '#1769aa', fontWeight: 500, fontSize: 13, border: '1px solid #e3e8ee', boxShadow: 'none' }}>{tag}</Paper>
                                                                    ))}
                                                                </Group>
                                                                <Box mb={12}><ReactMarkdown>{item.content}</ReactMarkdown></Box>
                                                                {item.fileUrl && (
                                                                    <Box mb={8}>
                                                                        <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1769aa', textDecoration: 'underline', fontSize: 14 }}>📎 View Attachment</a>
                                                                    </Box>
                                                                )}
                                                                {item.summary && (
                                                                    <Paper p="md" mt="sm" radius={8} style={{ background: '#f5f7fa', borderLeft: '4px solid #1769aa', color: '#222', marginBottom: 12 }}>
                                                                        <Group gap={6} mb={4} align="center">
                                                                            <IconRobot size={16} color="#1769aa" />
                                                                            <Text size="xs" fw={700} c="#1769aa">AI Summary</Text>
                                                                        </Group>
                                                                        <ReactMarkdown>{item.summary}</ReactMarkdown>
                                                                    </Paper>
                                                                )}
                                                                {item.annotations && item.annotations.length > 0 && (
                                                                    <Stack mt={16} spacing={8}>
                                                                        <Text size="sm" fw={600} mb={4}>Comments</Text>
                                                                        {item.annotations.map((c: any) => (
                                                                            <Paper key={c.id} p="xs" radius={16} style={{ background: '#f5f7fa', border: '1px solid #e3e8ee', color: '#222', boxShadow: 'none', marginBottom: 4 }}>
                                                                                <Group align="center" gap={8}>
                                                                                    <Avatar radius="xl" size={20} color="blue">{getInitials(c.author)}</Avatar>
                                                                                    <Text size="xs" fw={600}>{c.author}</Text>
                                                                                    <Text size="xs" c="#888">{new Date(c.createdAt).toLocaleString()}</Text>
                                                                                    <Text size="sm" style={{ flex: 1 }}>{c.content}</Text>
                                                                                    {(c.author === userName || project?.createdBy === userName) && (
                                                                                        <ActionIcon size={18} color="red" variant="subtle" onClick={e => { e.stopPropagation(); handleDeleteComment(item, c.id); }}>
                                                                                            <IconTrash size={14} />
                                                                                        </ActionIcon>
                                                                                    )}
                                                                                </Group>
                                                                            </Paper>
                                                                        ))}
                                                                    </Stack>
                                                                )}
                                                                <Text size="xs" c="#888" mt={8}>{new Date(item.createdAt).toLocaleString()}</Text>
                                                            </Box>
                                                        )}
                                                    </Paper>
                                                );
                                            })
                                        )}
                                    </Stack>
                                </Box>
                            </Tabs.Panel>
                            {docTabs.map(tab => (
                                <Tabs.Panel key={tab.id} value={tab.id}>
                                    <Box style={{ flex: 1, minWidth: 0, marginLeft: 32 }}>
                                        <Box>
                                            <Title order={4}>{tab.title}</Title>
                                            <Stack mt="md">
                                                {(docRows[tab.id] || []).map((row, idx) => {
                                                    const isEditing = editingRow && editingRow.docId === tab.id && editingRow.idx === idx;
                                                    const isAI = aiProcessing && aiProcessing.docId === tab.id && aiProcessing.idx === idx;
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
                                                                        onClick={() => handleAiTransformRow(tab.id, idx, editRowValue)}
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
                                                                    onClick={() => handleStartEditRow(tab.id, idx, row)}
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
                                                                        onClick={() => handleDeleteRow(tab.id, idx)}
                                                                    >
                                                                        Delete
                                                                    </Menu.Item>
                                                                </Menu.Dropdown>
                                                            </Menu>
                                                        </Group>
                                                    );
                                                })}
                                                {addingRowFor === tab.id ? (
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
                                                                    handleSaveRow(tab.id);
                                                                }
                                                            }}
                                                        />
                                                        <Button size="xs" color={styles.accentColor} onClick={() => handleSaveRow(tab.id)} loading={savingRow} style={{ background: styles.buttonGradient, color: '#fff', fontWeight: 700, borderRadius: 12 }}>
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
                                                        onClick={() => handleAddRow(tab.id)}
                                                        style={{ background: styles.tabBackground, color: styles.secondaryTextColor, fontWeight: 600, borderRadius: 12 }}
                                                    >
                                                        + Add Row
                                                    </Button>
                                                )}
                                            </Stack>
                                        </Box>
                                    </Box>
                                </Tabs.Panel>
                            ))}
                            <Tabs.Panel value="templates" pt="md">
                                <Box style={{ flex: 1, minWidth: 0, marginLeft: 32 }}>
                                    <Text c="dimmed">Templates tab content coming soon!</Text>
                                </Box>
                            </Tabs.Panel>
                            <Tabs.Panel value="chat" pt="md">
                                <Box style={{ flex: 1, minWidth: 0, marginLeft: 32 }}>
                                    <Box style={{ width: '100%', background: '#fff', border: '1px solid #e3e8ee', borderRadius: 12, padding: 24 }}>
                                        <Title order={4} mb={8}>SparkChat</Title>
                                        <Stack spacing="xs" style={{ minHeight: 320, maxHeight: 400, overflowY: 'auto', background: '#f8fafc', borderRadius: 8, padding: 12, border: 'none' }}>
                                            {chatMessages.length === 0 ? (
                                                <Text c="dimmed" ta="center">No messages yet. Start the conversation!</Text>
                                            ) : (
                                                chatMessages.map((msg, idx) => (
                                                    <Group key={msg.id} align="flex-end" style={{ justifyContent: msg.sender === userName ? 'flex-end' : 'flex-start' }}>
                                                        <Avatar radius="xl" color={msg.sender === 'ai' ? 'blue' : 'gray'} size={28} style={{ fontWeight: 700 }}>{msg.sender === 'ai' ? <IconRobot size={16} /> : getInitials(msg.senderName)}</Avatar>
                                                        <Paper p="sm" radius={8} style={{ background: '#fff', color: '#222', minWidth: 80, maxWidth: 480, border: '1px solid #e3e8ee', boxShadow: 'none', fontSize: 15 }}>
                                                            {msg.sender === 'ai' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : <Text size="sm" fw={500} style={{ wordBreak: 'break-word' }}>{msg.content}</Text>}
                                                            <Group gap={4} mt={4} align="center">
                                                                <Text size="xs" c="dimmed">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                                                {msg.reactions && msg.reactions.length > 0 && (
                                                                    <Group gap={2}>{msg.reactions.map((emoji: string, i: number) => (<span key={i} style={{ fontSize: 16 }}>{emoji}</span>))}</Group>
                                                                )}
                                                                <ActionIcon size="xs" variant="subtle" color="blue" onClick={() => addReaction(msg.id, '👍')}>👍</ActionIcon>
                                                                <ActionIcon size="xs" variant="subtle" color="blue" onClick={() => addReaction(msg.id, '😂')}>😂</ActionIcon>
                                                                <ActionIcon size="xs" variant="subtle" color="blue" onClick={() => addReaction(msg.id, '🎉')}>🎉</ActionIcon>
                                                            </Group>
                                                        </Paper>
                                                    </Group>
                                                ))
                                            )}
                                            <div ref={chatEndRef} />
                                        </Stack>
                                        <Group mt="md" align="flex-end">
                                            <TextInput placeholder="Type a message... or use /ai to ask the AI assistant" value={chatInput} onChange={e => setChatInput(e.currentTarget.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { sendMessage(chatInput); } }} style={{ flex: 1, background: '#fff', border: '1px solid #e3e8ee', borderRadius: 8 }} disabled={sending || aiThinking} />
                                            <ActionIcon variant="filled" color="blue" size={36} onClick={() => sendMessage(chatInput)} loading={sending || aiThinking} disabled={!chatInput.trim()} title="Send"><IconSend size={20} /></ActionIcon>
                                            <ActionIcon variant="light" color="blue" size={36} onClick={() => sendMessage(`/ai ${chatInput}`)} loading={aiThinking} title="Ask AI"><IconRobot size={20} /></ActionIcon>
                                        </Group>
                                    </Box>
                                </Box>
                            </Tabs.Panel>
                            <Tabs.Panel value="members" pt="md">
                                <Box style={{ flex: 1, minWidth: 0, marginLeft: 32 }}>
                                    <Stack>
                                        <Title order={4} mb="xs">Members</Title>
                                        {Array.isArray(project.members) && project.members.length > 0 ? (
                                            <Stack gap={12}>
                                                {project.members.map((email: string, idx: number) => (
                                                    <Group key={email + idx} justify="space-between" align="center" wrap="nowrap" style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 8, padding: '12px 20px', boxShadow: 'none' }}>
                                                        <Group align="center" gap={12}>
                                                            <Avatar radius="xl" color="blue" size={32} style={{ fontWeight: 700 }}>{getInitials(email)}</Avatar>
                                                            <Text style={{ fontWeight: 500, color: '#222', fontSize: 16 }}>{email}</Text>
                                                        </Group>
                                                        <Menu shadow="md" width={140} position="bottom-end">
                                                            <Menu.Target>
                                                                <ActionIcon variant="subtle" color="blue" size={28} style={{ transition: 'color 0.18s' }}>
                                                                    <IconDots size={18} />
                                                                </ActionIcon>
                                                            </Menu.Target>
                                                            <Menu.Dropdown>
                                                                <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => handleRemoveMember(email)} disabled={project.members.length <= 1}>
                                                                    Remove
                                                                </Menu.Item>
                                                            </Menu.Dropdown>
                                                        </Menu>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        ) : (
                                            <Text c="dimmed">No members yet.</Text>
                                        )}
                                        <Group mt="md" gap={8}>
                                            <TextInput placeholder="Add member by email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.currentTarget.value)} disabled={adding} style={{ flex: 2 }} />
                                            <Button onClick={handleAddMember} loading={adding} disabled={!newMemberEmail} style={{ flex: 1 }}>Add</Button>
                                        </Group>
                                    </Stack>
                                </Box>
                            </Tabs.Panel>
                        </Tabs>
                    </Box>
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
            </Box>
            <FloatingAssistant currentTab={activeTab} userName={userName} projectContext={projectContext} />
        </>
    );
} 