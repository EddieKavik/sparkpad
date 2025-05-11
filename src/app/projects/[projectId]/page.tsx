"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Container, Title, Tabs, Box, Text, Loader, Center, Group, TextInput, Button, Stack, Modal, ActionIcon, rem, Menu, Avatar, Paper } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconSettings, IconDots, IconTrash, IconArrowLeft, IconSend, IconFile, IconMoodSmile, IconRobot } from "@tabler/icons-react";
import { getGeminiClient } from "@/utils/gemini";
import { NavigationBar } from "@/components/NavigationBar";
import { useTheme } from '@/contexts/ThemeContext';

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
    futuristic: {
        background: "linear-gradient(135deg, #181c2b 0%, #23243a 100%)",
        overlay: {
            background: 'radial-gradient(circle at 80% 20%, #3a2e5d44 0%, transparent 60%), radial-gradient(circle at 20% 80%, #232b4d44 0%, transparent 60%)',
            filter: 'blur(48px)',
        },
        cardBackground: "rgba(24,28,43,0.85)",
        cardBorder: "1.5px solid #3a2e5d77",
        cardShadow: '0 8px 32px 0 #232b4d44',
        textColor: "#fff",
        secondaryTextColor: "#b0b7ff",
        accentColor: "#7f5fff",
        buttonGradient: { from: '#232b4d', to: '#3a2e5d', deg: 90 },
        badgeColor: 'violet',
        tabBackground: 'rgba(35,43,77,0.18)',
        tabListBackground: 'rgba(24,28,43,0.85)',
        tabPanelBackground: 'rgba(24,28,43,0.92)',
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
    const [docTabs, setDocTabs] = useState([
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
    const styles = themeStyles[theme];
    const [researchItems, setResearchItems] = useState([]);
    const [researchLoading, setResearchLoading] = useState(false);
    const [newResearch, setNewResearch] = useState({ title: '', type: 'web', content: '' });

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
                if (!res.ok) throw new Error("Failed to fetch project");
                const projects = await res.json();
                const project = Array.isArray(projects)
                    ? projects.find((p) => p.id === projectId)
                    : null;
                if (!project) throw new Error("Project not found");
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
            const projects = await res.json();
            const idx = projects.findIndex((p: any) => String(p.id) === String(projectId));
            if (idx === -1) throw new Error("Project not found");
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

    const handleAddResearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newResearch.title.trim() || !newResearch.content.trim()) return;
        const res = await fetch(`/api/projects/${projectId}/research`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...newResearch,
                createdBy: userName || 'anonymous',
            }),
        });
        if (res.ok) {
            setNewResearch({ title: '', type: 'web', content: '' });
            fetchResearchItems();
        }
    };

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

    return (
        <>
            <Box style={{ minHeight: '100vh', background: styles.background, position: 'relative', overflow: 'hidden' }}>
                {/* Futuristic Glow Overlay */}
                <div style={styles.overlay} />
                <NavigationBar userName={userName} onLogout={handleLogout} showBackButton={true} />
                <Container size="md" mt={40}>
                    <Title order={2} mb="lg" style={{ color: styles.textColor, fontWeight: 800, letterSpacing: 1 }}>
                        Project: {project.name || projectId}
                    </Title>
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
                        <TextInput
                            label="Project Name"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.currentTarget.value)}
                            mb="md"
                        />
                        <Button onClick={handleRename} loading={renaming} fullWidth disabled={!renameValue} variant={styles.buttonGradient} style={{ fontWeight: 700, color: '#fff', boxShadow: '0 2px 16px #232b4d44' }}>
                            Save
                        </Button>
                    </Modal>
                    <Tabs value={activeTab} onChange={value => setActiveTab(value || "default")} style={{ flex: 1 }}
                        styles={{
                            tab: {
                                background: styles.tabBackground,
                                color: styles.secondaryTextColor,
                                borderRadius: 16,
                                fontWeight: 700,
                                marginRight: 8,
                                padding: '8px 20px',
                            },
                            list: {
                                background: styles.tabListBackground,
                                borderRadius: 20,
                                boxShadow: styles.cardShadow,
                                padding: 4,
                            },
                            panel: {
                                background: styles.tabPanelBackground,
                                borderRadius: 24,
                                color: styles.textColor,
                            },
                        }}
                    >
                        <Tabs.List>
                            {docTabs.map(tab => (
                                <Tabs.Tab key={tab.id} value={tab.id}>{tab.title}</Tabs.Tab>
                            ))}
                            <Tabs.Tab value="templates">Templates</Tabs.Tab>
                            <Tabs.Tab value="members">Members</Tabs.Tab>
                            <Tabs.Tab value="chat">Chat</Tabs.Tab>
                            <Tabs.Tab value="research">Research</Tabs.Tab>
                        </Tabs.List>
                        {docTabs.map(tab => (
                            <Tabs.Panel key={tab.id} value={tab.id}>
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
                                                            <TextInput
                                                                value={editRowValue}
                                                                onChange={e => setEditRowValue(e.currentTarget.value)}
                                                                autoFocus
                                                                style={{ flex: 1 }}
                                                                disabled={!!isAI}
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
                                                            {row}
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
                                                <TextInput
                                                    value={newRowValue}
                                                    onChange={e => setNewRowValue(e.currentTarget.value)}
                                                    placeholder="Enter row text"
                                                    autoFocus
                                                    style={{ flex: 1 }}
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
                            </Tabs.Panel>
                        ))}
                        <Tabs.Panel value="templates" pt="md">
                            <Box>
                                <Text c="dimmed">Templates tab content coming soon!</Text>
                            </Box>
                        </Tabs.Panel>
                        <Tabs.Panel value="members" pt="md">
                            <Stack>
                                <Title order={4} mb="xs">Members</Title>
                                {Array.isArray(project.members) && project.members.length > 0 ? (
                                    project.members.map((email: string, idx: number) => (
                                        <Group key={email + idx} justify="space-between" align="center" wrap="nowrap">
                                            <Group align="center" gap={8}>
                                                <Avatar radius="xl" color={styles.badgeColor} size={32}>
                                                    {getInitials(email)}
                                                </Avatar>
                                                <Text c={styles.secondaryTextColor}>{email}</Text>
                                            </Group>
                                            <Menu shadow="md" width={140} position="bottom-end">
                                                <Menu.Target>
                                                    <ActionIcon variant="subtle" color="gray" size={28}>
                                                        <IconDots size={18} />
                                                    </ActionIcon>
                                                </Menu.Target>
                                                <Menu.Dropdown>
                                                    <Menu.Item
                                                        color="red"
                                                        leftSection={<IconTrash size={16} />}
                                                        onClick={() => handleRemoveMember(email)}
                                                        disabled={project.members.length <= 1}
                                                    >
                                                        Remove
                                                    </Menu.Item>
                                                </Menu.Dropdown>
                                            </Menu>
                                        </Group>
                                    ))
                                ) : (
                                    <Text c="dimmed">No members yet.</Text>
                                )}
                                <Group mt="md">
                                    <TextInput
                                        placeholder="Add member by email"
                                        value={newMemberEmail}
                                        onChange={(e) => setNewMemberEmail(e.currentTarget.value)}
                                        disabled={adding}
                                    />
                                    <Button onClick={handleAddMember} loading={adding} disabled={!newMemberEmail}>
                                        Add
                                    </Button>
                                </Group>
                            </Stack>
                        </Tabs.Panel>
                        <Tabs.Panel value="chat" pt="md">
                            <Box style={{ maxWidth: 600, margin: "0 auto" }}>
                                <Title order={4}>Project Chat</Title>
                                <Stack spacing="xs" style={{ minHeight: 320, maxHeight: 400, overflowY: "auto", background: "#f8fafc", borderRadius: 8, padding: 12, border: "1px solid #eee" }}>
                                    {chatMessages.length === 0 ? (
                                        <Text c="dimmed" ta="center">No messages yet. Start the conversation!</Text>
                                    ) : (
                                        chatMessages.map((msg, idx) => (
                                            <Group key={msg.id} align="flex-end" style={{ justifyContent: msg.sender === userName ? "flex-end" : "flex-start" }}>
                                                <Avatar radius="xl" color={msg.sender === "ai" ? "blue" : styles.badgeColor} size={32}>
                                                    {msg.sender === "ai" ? <IconRobot size={18} /> : getInitials(msg.senderName)}
                                                </Avatar>
                                                <Paper shadow="xs" p="sm" radius="md" style={{ background: '#232b4d', color: '#b0b7ff', minWidth: 80, maxWidth: 360 }}>
                                                    <Text size="sm" fw={msg.sender === "ai" ? 600 : 500} style={{ wordBreak: "break-word" }}>{msg.content}</Text>
                                                    <Group gap={4} mt={4} align="center">
                                                        <Text size="xs" c="dimmed">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                                        {msg.reactions && msg.reactions.length > 0 && (
                                                            <Group gap={2}>
                                                                {msg.reactions.map((emoji: string, i: number) => (
                                                                    <span key={i} style={{ fontSize: 16 }}>{emoji}</span>
                                                                ))}
                                                            </Group>
                                                        )}
                                                        <ActionIcon size="xs" variant="subtle" onClick={() => addReaction(msg.id, "👍")}>👍</ActionIcon>
                                                        <ActionIcon size="xs" variant="subtle" onClick={() => addReaction(msg.id, "😂")}>😂</ActionIcon>
                                                        <ActionIcon size="xs" variant="subtle" onClick={() => addReaction(msg.id, "🎉")}>🎉</ActionIcon>
                                                    </Group>
                                                </Paper>
                                            </Group>
                                        ))
                                    )}
                                    <div ref={chatEndRef} />
                                </Stack>
                                <Group mt="md" align="flex-end">
                                    <TextInput
                                        placeholder="Type a message... or use /ai to ask the AI assistant"
                                        value={chatInput}
                                        onChange={e => setChatInput(e.currentTarget.value)}
                                        onKeyDown={e => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                sendMessage(chatInput);
                                            }
                                        }}
                                        style={{ flex: 1 }}
                                        disabled={sending || aiThinking}
                                    />
                                    <ActionIcon variant="light" color="blue" size={36} component="label" title="Upload file">
                                        <IconFile size={20} />
                                        <input type="file" style={{ display: "none" }} onChange={handleFileUpload} />
                                    </ActionIcon>
                                    <ActionIcon variant="filled" color={styles.badgeColor} size={36} onClick={() => sendMessage(chatInput)} loading={sending || aiThinking} disabled={!chatInput.trim()} title="Send">
                                        <IconSend size={20} />
                                    </ActionIcon>
                                    <ActionIcon variant="light" color={styles.badgeColor} size={36} onClick={() => sendMessage(`/ai ${chatInput}`)} loading={aiThinking} title="Ask AI">
                                        <IconRobot size={20} />
                                    </ActionIcon>
                                </Group>
                            </Box>
                        </Tabs.Panel>
                        <Tabs.Panel value="research" pt="md">
                            <Box style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
                                <Title order={3} mb="md">Research</Title>
                                <form onSubmit={handleAddResearch} style={{ marginBottom: 32 }}>
                                    <Group align="flex-end" gap="md">
                                        <TextInput
                                            label="Title"
                                            value={newResearch.title}
                                            onChange={e => setNewResearch(r => ({ ...r, title: e.target.value }))}
                                            required
                                            style={{ flex: 2 }}
                                        />
                                        <TextInput
                                            label="Type"
                                            value={newResearch.type}
                                            onChange={e => setNewResearch(r => ({ ...r, type: e.target.value }))}
                                            style={{ flex: 1 }}
                                            placeholder="web, note, pdf, ..."
                                        />
                                        <TextInput
                                            label="Content"
                                            value={newResearch.content}
                                            onChange={e => setNewResearch(r => ({ ...r, content: e.target.value }))}
                                            required
                                            style={{ flex: 3 }}
                                        />
                                        <Button type="submit" loading={researchLoading}>Add</Button>
                                    </Group>
                                </form>
                                <Stack>
                                    {researchLoading ? (
                                        <Text>Loading research...</Text>
                                    ) : researchItems.length === 0 ? (
                                        <Text c="dimmed">No research items yet. Add your first one above!</Text>
                                    ) : (
                                        researchItems.map((item: any) => (
                                            <Paper key={item.id} withBorder p="md" radius="md" style={{ background: styles.cardBackground, border: styles.cardBorder, color: styles.textColor }}>
                                                <Group justify="space-between">
                                                    <div>
                                                        <Text fw={700}>{item.title}</Text>
                                                        <Text size="sm" c={styles.secondaryTextColor}>{item.type}</Text>
                                                    </div>
                                                    <Text size="xs" c="dimmed">{new Date(item.createdAt).toLocaleString()}</Text>
                                                </Group>
                                                <Text mt="sm">{item.content}</Text>
                                                {item.tags && item.tags.length > 0 && (
                                                    <Group gap="xs" mt="xs">
                                                        {item.tags.map((tag: string) => (
                                                            <Paper key={tag} p="xs" radius="sm" style={{ background: styles.tabBackground, color: styles.secondaryTextColor }}>{tag}</Paper>
                                                        ))}
                                                    </Group>
                                                )}
                                            </Paper>
                                        ))
                                    )}
                                </Stack>
                            </Box>
                        </Tabs.Panel>
                    </Tabs>
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
                </Container>
            </Box>
        </>
    );
} 