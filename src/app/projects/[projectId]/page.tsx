"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Container, Title, Tabs, Box, Text, Loader, Center, Group, TextInput, Button, Stack, Modal, ActionIcon, rem, Menu, Avatar } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconSettings, IconDots, IconTrash } from "@tabler/icons-react";

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

export default function ProjectViewPage() {
    const params = useParams();
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

    useEffect(() => {
        const fetchProject = async () => {
            setLoading(true);
            try {
                const res = await fetch("http://localhost:3333/projects?mode=volatile&key=projects");
                if (!res.ok) throw new Error("Failed to fetch projects");
                const data = await res.json();
                if (Array.isArray(data)) {
                    const found = data.find((p) => String(p.id) === String(projectId));
                    setProject(found || null);
                    setRenameValue(found?.name || "");
                } else {
                    setProject(null);
                }
            } catch {
                setProject(null);
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [projectId]);

    const handleAddMember = async () => {
        if (!project || !newMemberEmail) return;
        if (project.members && project.members.includes(newMemberEmail)) {
            showNotification({ title: "Already a member", message: "This user is already a member.", color: "yellow" });
            return;
        }
        setAdding(true);
        try {
            // Fetch all projects
            const res = await fetch("http://localhost:3333/projects?mode=volatile&key=projects");
            if (!res.ok) throw new Error("Failed to fetch projects");
            const projects = await res.json();
            // Find and update the project
            const idx = projects.findIndex((p) => String(p.id) === String(projectId));
            if (idx === -1) throw new Error("Project not found");
            const updatedProject = { ...projects[idx] };
            updatedProject.members = Array.isArray(updatedProject.members) ? updatedProject.members : [];
            updatedProject.members.push(newMemberEmail);
            projects[idx] = updatedProject;
            // Save back
            const saveRes = await fetch("http://localhost:3333/projects?mode=volatile&key=projects", {
                method: "POST",
                body: JSON.stringify(projects),
            });
            if (!saveRes.ok) throw new Error("Failed to add member");
            setProject(updatedProject);
            setNewMemberEmail("");
            showNotification({ title: "Success", message: "Member added!", color: "green" });
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
            const res = await fetch("http://localhost:3333/projects?mode=volatile&key=projects");
            if (!res.ok) throw new Error("Failed to fetch projects");
            const projects = await res.json();
            const idx = projects.findIndex((p) => String(p.id) === String(projectId));
            if (idx === -1) throw new Error("Project not found");
            const updatedProject = { ...projects[idx], name: renameValue };
            projects[idx] = updatedProject;
            const saveRes = await fetch("http://localhost:3333/projects?mode=volatile&key=projects", {
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
            const res = await fetch("http://localhost:3333/projects?mode=volatile&key=projects");
            if (!res.ok) throw new Error("Failed to fetch projects");
            const projects = await res.json();
            const idx = projects.findIndex((p) => String(p.id) === String(projectId));
            if (idx === -1) throw new Error("Project not found");
            const updatedProject = { ...projects[idx] };
            updatedProject.members = updatedProject.members.filter((email: string) => email !== emailToRemove);
            projects[idx] = updatedProject;
            const saveRes = await fetch("http://localhost:3333/projects?mode=volatile&key=projects", {
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
        <Container size="md" mt={40}>
            <Title order={2} mb="lg">
                Project: {project.name || projectId}
            </Title>
            <Modal opened={settingsOpened} onClose={() => setSettingsOpened(false)} title="Rename Project" centered>
                <TextInput
                    label="Project Name"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.currentTarget.value)}
                    mb="md"
                />
                <Button onClick={handleRename} loading={renaming} fullWidth disabled={!renameValue}>
                    Save
                </Button>
            </Modal>
            <Group align="center" justify="space-between" mb="xs">
                <Tabs value={activeTab} onChange={setActiveTab} style={{ flex: 1 }}>
                    <Tabs.List>
                        <Tabs.Tab value="default">Documents</Tabs.Tab>
                        <Tabs.Tab value="templates">Templates</Tabs.Tab>
                        <Tabs.Tab value="members">Members</Tabs.Tab>
                        {docTabs.filter(tab => tab.id !== "default").map(tab => (
                            <Tabs.Tab key={tab.id} value={tab.id}>{tab.title}</Tabs.Tab>
                        ))}
                        <ActionIcon
                            variant="light"
                            color="violet"
                            size={28}
                            ml={8}
                            onClick={handleAddDocument}
                            title="Add Document"
                            style={{ marginLeft: rem(8) }}
                        >
                            +
                        </ActionIcon>
                    </Tabs.List>
                    <Tabs.Panel value="default" pt="md">
                        <Box>
                            <Text c="dimmed">No document selected. Click + to add a new document.</Text>
                        </Box>
                    </Tabs.Panel>
                    {docTabs.filter(tab => tab.id !== "default").map(tab => (
                        <Tabs.Panel key={tab.id} value={tab.id} pt="md">
                            <Box>
                                <Title order={4}>{tab.title}</Title>
                                <Text c="dimmed">Document content coming soon!</Text>
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
                                            <Avatar radius="xl" color="violet" size={32}>
                                                {getInitials(email)}
                                            </Avatar>
                                            <Text c="violet.8">{email}</Text>
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
            </Group>
        </Container>
    );
} 