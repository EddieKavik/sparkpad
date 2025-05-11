"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Title, Text, Button, Group, Card, Stack, TextInput, ActionIcon, Menu, Badge, Tooltip, Modal, Textarea, Select, MultiSelect, SegmentedControl, Paper, Input, SimpleGrid, RingProgress, Center } from "@mantine/core";
import { IconPlus, IconDotsVertical, IconEdit, IconTrash, IconShare, IconUsers, IconCalendar, IconTag, IconSearch, IconFilter, IconSortAscending, IconSortDescending, IconChartBar, IconChartPie, IconChartLine } from "@tabler/icons-react";
import { NavigationBar } from "@/components/NavigationBar";
import { showNotification } from "@mantine/notifications";

interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    status: 'active' | 'archived' | 'completed';
    members: number;
    tags: string[];
}

interface ProjectStats {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    archivedProjects: number;
    totalMembers: number;
    averageMembersPerProject: number;
    mostUsedTags: { tag: string; count: number }[];
    recentActivity: { type: string; project: string; time: string }[];
}

export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpened, setModalOpened] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectDescription, setNewProjectDescription] = useState("");
    const [newProjectStatus, setNewProjectStatus] = useState<'active' | 'archived' | 'completed'>('active');
    const [newProjectTags, setNewProjectTags] = useState("");
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [shareModalOpened, setShareModalOpened] = useState(false);
    const [shareEmail, setShareEmail] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [tagFilter, setTagFilter] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'members'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showStats, setShowStats] = useState(false);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const userEmail = localStorage.getItem("user:username");
                if (!userEmail) {
                    router.push("/");
                    return;
                }
                const res = await fetch(
                    `http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`
                );
                if (!res.ok) throw new Error("Failed to fetch projects");
                const data = await res.json();
                setProjects(data);
            } catch (err: any) {
                setError(err.message);
                showNotification({
                    title: "Error",
                    message: "Failed to load projects. Please try again.",
                    color: "red",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, [router]);

    const handleCreateProject = async () => {
        try {
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail) throw new Error("User not found");
            const newProject: Project = {
                id: Date.now().toString(),
                name: newProjectName,
                description: newProjectDescription,
                createdAt: new Date().toISOString(),
                status: newProjectStatus,
                members: 1,
                tags: newProjectTags.split(',').map(tag => tag.trim()).filter(Boolean),
            };
            const updatedProjects = [...projects, newProject];
            const res = await fetch(
                `http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`,
                {
                    method: "POST",
                    body: JSON.stringify(updatedProjects),
                }
            );
            if (!res.ok) throw new Error("Failed to create project");
            setProjects(updatedProjects);
            setModalOpened(false);
            setNewProjectName("");
            setNewProjectDescription("");
            setNewProjectStatus('active');
            setNewProjectTags("");

            // Add notification for project creation
            const notification = {
                message: `Project "${newProjectName}" has been created`,
                time: new Date().toISOString(),
                type: 'project' as const,
                link: `/projects/${newProject.id}`
            };
            const event = new CustomEvent('addNotification', { detail: notification });
            window.dispatchEvent(event);

            showNotification({
                title: "Success",
                message: "Project created successfully!",
                color: "green",
            });
        } catch (err: any) {
            showNotification({
                title: "Error",
                message: err.message || "Failed to create project",
                color: "red",
            });
        }
    };

    const handleEditProject = async (project: Project) => {
        setEditingProject(project);
        setNewProjectName(project.name);
        setNewProjectDescription(project.description);
        setNewProjectStatus(project.status);
        setNewProjectTags(project.tags.join(', '));
        setModalOpened(true);
    };

    const handleUpdateProject = async () => {
        if (!editingProject) return;
        try {
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail) throw new Error("User not found");
            const updatedProject: Project = {
                ...editingProject,
                name: newProjectName,
                description: newProjectDescription,
                status: newProjectStatus,
                tags: newProjectTags.split(',').map(tag => tag.trim()).filter(Boolean),
            };
            const updatedProjects = projects.map(p => p.id === editingProject.id ? updatedProject : p);
            const res = await fetch(
                `http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`,
                {
                    method: "POST",
                    body: JSON.stringify(updatedProjects),
                }
            );
            if (!res.ok) throw new Error("Failed to update project");
            setProjects(updatedProjects);
            setModalOpened(false);
            setEditingProject(null);
            setNewProjectName("");
            setNewProjectDescription("");
            setNewProjectStatus('active');
            setNewProjectTags("");

            // Add notification for project update
            const notification = {
                message: `Project "${newProjectName}" has been updated`,
                time: new Date().toISOString(),
                type: 'update' as const,
                link: `/projects/${editingProject.id}`
            };
            const event = new CustomEvent('addNotification', { detail: notification });
            window.dispatchEvent(event);

            showNotification({
                title: "Success",
                message: "Project updated successfully!",
                color: "green",
            });
        } catch (err: any) {
            showNotification({
                title: "Error",
                message: err.message || "Failed to update project",
                color: "red",
            });
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        try {
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail) throw new Error("User not found");
            const project = projects.find(p => p.id === projectId);
            if (!project) throw new Error("Project not found");
            const updatedProjects = projects.filter(p => p.id !== projectId);
            const res = await fetch(
                `http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`,
                {
                    method: "POST",
                    body: JSON.stringify(updatedProjects),
                }
            );
            if (!res.ok) throw new Error("Failed to delete project");
            setProjects(updatedProjects);

            // Add notification for project deletion
            const notification = {
                message: `Project "${project.name}" has been deleted`,
                time: new Date().toISOString(),
                type: 'system' as const
            };
            const event = new CustomEvent('addNotification', { detail: notification });
            window.dispatchEvent(event);

            showNotification({
                title: "Success",
                message: "Project deleted successfully!",
                color: "green",
            });
        } catch (err: any) {
            showNotification({
                title: "Error",
                message: err.message || "Failed to delete project",
                color: "red",
            });
        }
    };

    const handleShareProject = async (projectId: string) => {
        try {
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail) throw new Error("User not found");
            const project = projects.find(p => p.id === projectId);
            if (!project) throw new Error("Project not found");
            const updatedProject = {
                ...project,
                members: project.members + 1,
            };
            const updatedProjects = projects.map(p => p.id === projectId ? updatedProject : p);
            const res = await fetch(
                `http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`,
                {
                    method: "POST",
                    body: JSON.stringify(updatedProjects),
                }
            );
            if (!res.ok) throw new Error("Failed to share project");
            setProjects(updatedProjects);
            setShareModalOpened(false);
            setShareEmail("");

            // Add notification for project sharing
            const notification = {
                message: `Project "${project.name}" has been shared with ${shareEmail}`,
                time: new Date().toISOString(),
                type: 'project' as const,
                link: `/projects/${projectId}`
            };
            const event = new CustomEvent('addNotification', { detail: notification });
            window.dispatchEvent(event);

            showNotification({
                title: "Success",
                message: "Project shared successfully!",
                color: "green",
            });
        } catch (err: any) {
            showNotification({
                title: "Error",
                message: err.message || "Failed to share project",
                color: "red",
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'green';
            case 'archived':
                return 'gray';
            case 'completed':
                return 'blue';
            default:
                return 'gray';
        }
    };

    // Get unique tags from all projects
    const allTags = Array.from(new Set(projects.flatMap(project => project.tags)));

    // Filter and sort projects
    const filteredAndSortedProjects = projects
        .filter(project => {
            const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                project.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(project.status);
            const matchesTags = tagFilter.length === 0 || tagFilter.some(tag => project.tags.includes(tag));
            return matchesSearch && matchesStatus && matchesTags;
        })
        .sort((a, b) => {
            if (sortBy === 'name') {
                return sortOrder === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            } else if (sortBy === 'date') {
                return sortOrder === 'asc'
                    ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            } else {
                return sortOrder === 'asc'
                    ? a.members - b.members
                    : b.members - a.members;
            }
        });

    // Calculate project statistics
    const projectStats: ProjectStats = {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        completedProjects: projects.filter(p => p.status === 'completed').length,
        archivedProjects: projects.filter(p => p.status === 'archived').length,
        totalMembers: projects.reduce((sum, p) => sum + p.members, 0),
        averageMembersPerProject: projects.length ? Math.round(projects.reduce((sum, p) => sum + p.members, 0) / projects.length) : 0,
        mostUsedTags: Object.entries(
            projects.flatMap(p => p.tags).reduce((acc, tag) => {
                acc[tag] = (acc[tag] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        )
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
        recentActivity: projects
            .map(p => [
                { type: 'created', project: p.name, time: p.createdAt },
                ...(p.members > 1 ? [{ type: 'shared', project: p.name, time: p.createdAt }] : [])
            ])
            .flat()
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, 5)
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <NavigationBar showBackButton />
            <Container size="lg" py="xl">
                <Group justify="space-between" mb="xl">
                    <div>
                        <Title order={2}>Projects</Title>
                        <Text c="dimmed" size="sm">Manage your projects and collaborate with your team</Text>
                    </div>
                    <Group>
                        <Button
                            variant="light"
                            leftSection={<IconChartBar size={16} />}
                            onClick={() => setShowStats(!showStats)}
                        >
                            {showStats ? 'Hide Statistics' : 'Show Statistics'}
                        </Button>
                        <Button
                            leftSection={<IconPlus size={16} />}
                            onClick={() => {
                                setEditingProject(null);
                                setNewProjectName("");
                                setNewProjectDescription("");
                                setNewProjectStatus('active');
                                setNewProjectTags("");
                                setModalOpened(true);
                            }}
                        >
                            New Project
                        </Button>
                    </Group>
                </Group>

                {showStats && (
                    <Paper withBorder p="md" mb="xl" radius="md">
                        <Stack>
                            <Title order={3} mb="md">Project Statistics</Title>
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
                                <Card withBorder p="md" radius="md">
                                    <Stack align="center" gap="xs">
                                        <RingProgress
                                            size={80}
                                            thickness={8}
                                            sections={[
                                                { value: (projectStats.activeProjects / projectStats.totalProjects) * 100, color: 'green' },
                                                { value: (projectStats.completedProjects / projectStats.totalProjects) * 100, color: 'blue' },
                                                { value: (projectStats.archivedProjects / projectStats.totalProjects) * 100, color: 'gray' }
                                            ]}
                                            label={
                                                <Center>
                                                    <Text size="xs" fw={700}>
                                                        {projectStats.totalProjects}
                                                    </Text>
                                                </Center>
                                            }
                                        />
                                        <Text size="sm" fw={500}>Total Projects</Text>
                                        <Group gap="xs">
                                            <Badge color="green">{projectStats.activeProjects} Active</Badge>
                                            <Badge color="blue">{projectStats.completedProjects} Completed</Badge>
                                            <Badge color="gray">{projectStats.archivedProjects} Archived</Badge>
                                        </Group>
                                    </Stack>
                                </Card>
                                <Card withBorder p="md" radius="md">
                                    <Stack align="center" gap="xs">
                                        <IconUsers size={40} color="var(--mantine-color-blue-6)" />
                                        <Text size="xl" fw={700}>{projectStats.totalMembers}</Text>
                                        <Text size="sm" fw={500}>Total Members</Text>
                                        <Text size="xs" c="dimmed">
                                            {projectStats.averageMembersPerProject} members per project
                                        </Text>
                                    </Stack>
                                </Card>
                                <Card withBorder p="md" radius="md">
                                    <Stack gap="xs">
                                        <Text size="sm" fw={500}>Most Used Tags</Text>
                                        {projectStats.mostUsedTags.map(({ tag, count }) => (
                                            <Group key={tag} justify="space-between">
                                                <Badge variant="light">{tag}</Badge>
                                                <Text size="sm">{count} projects</Text>
                                            </Group>
                                        ))}
                                    </Stack>
                                </Card>
                                <Card withBorder p="md" radius="md">
                                    <Stack gap="xs">
                                        <Text size="sm" fw={500}>Recent Activity</Text>
                                        {projectStats.recentActivity.map((activity, index) => (
                                            <Group key={index} gap="xs">
                                                <IconCalendar size={16} />
                                                <Text size="sm" style={{ flex: 1 }}>
                                                    {activity.type === 'created' ? 'Created' : 'Shared'} project "{activity.project}"
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {new Date(activity.time).toLocaleDateString()}
                                                </Text>
                                            </Group>
                                        ))}
                                    </Stack>
                                </Card>
                            </SimpleGrid>
                        </Stack>
                    </Paper>
                )}

                <Paper withBorder p="md" mb="xl" radius="md">
                    <Stack>
                        <Group>
                            <Input
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                                leftSection={<IconSearch size={16} />}
                                style={{ flex: 1 }}
                            />
                            <SegmentedControl
                                value={viewMode}
                                onChange={(value) => setViewMode(value as 'grid' | 'list')}
                                data={[
                                    { label: 'Grid', value: 'grid' },
                                    { label: 'List', value: 'list' },
                                ]}
                            />
                        </Group>
                        <Group>
                            <MultiSelect
                                placeholder="Filter by status"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                data={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'archived', label: 'Archived' },
                                    { value: 'completed', label: 'Completed' },
                                ]}
                                leftSection={<IconFilter size={16} />}
                                style={{ width: 200 }}
                            />
                            <MultiSelect
                                placeholder="Filter by tags"
                                value={tagFilter}
                                onChange={setTagFilter}
                                data={allTags.map(tag => ({ value: tag, label: tag }))}
                                leftSection={<IconTag size={16} />}
                                style={{ width: 200 }}
                            />
                            <Select
                                placeholder="Sort by"
                                value={sortBy}
                                onChange={(value) => setSortBy(value as 'name' | 'date' | 'members')}
                                data={[
                                    { value: 'name', label: 'Name' },
                                    { value: 'date', label: 'Date' },
                                    { value: 'members', label: 'Members' },
                                ]}
                                leftSection={<IconSortAscending size={16} />}
                                style={{ width: 150 }}
                            />
                            <ActionIcon
                                variant="light"
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                title={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
                            >
                                {sortOrder === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />}
                            </ActionIcon>
                        </Group>
                    </Stack>
                </Paper>

                {loading ? (
                    <Text>Loading projects...</Text>
                ) : error ? (
                    <Text c="red">{error}</Text>
                ) : filteredAndSortedProjects.length === 0 ? (
                    <Card withBorder p="xl" radius="md" style={{ textAlign: 'center' }}>
                        <Stack align="center" gap="md">
                            <Text size="lg" fw={500}>No projects found</Text>
                            <Text c="dimmed">
                                {searchQuery || statusFilter.length > 0 || tagFilter.length > 0
                                    ? "Try adjusting your filters or search query"
                                    : "Create your first project to get started"}
                            </Text>
                            <Button
                                leftSection={<IconPlus size={16} />}
                                onClick={() => setModalOpened(true)}
                            >
                                Create Project
                            </Button>
                        </Stack>
                    </Card>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr',
                        gap: '1rem'
                    }}>
                        {filteredAndSortedProjects.map((project) => (
                            <Card key={project.id} withBorder shadow="sm" radius="md" p="lg">
                                <Group justify="space-between" mb="md">
                                    <div>
                                        <Text fw={500} size="lg">{project.name}</Text>
                                        <Badge color={getStatusColor(project.status)} size="sm">
                                            {project.status}
                                        </Badge>
                                    </div>
                                    <Menu shadow="md" width={200}>
                                        <Menu.Target>
                                            <ActionIcon variant="subtle" color="gray">
                                                <IconDotsVertical size={16} />
                                            </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            <Menu.Item
                                                leftSection={<IconEdit size={16} />}
                                                onClick={() => handleEditProject(project)}
                                            >
                                                Edit
                                            </Menu.Item>
                                            <Menu.Item
                                                leftSection={<IconShare size={16} />}
                                                onClick={() => {
                                                    setEditingProject(project);
                                                    setShareModalOpened(true);
                                                }}
                                            >
                                                Share
                                            </Menu.Item>
                                            <Menu.Item
                                                leftSection={<IconTrash size={16} />}
                                                color="red"
                                                onClick={() => handleDeleteProject(project.id)}
                                            >
                                                Delete
                                            </Menu.Item>
                                        </Menu.Dropdown>
                                    </Menu>
                                </Group>
                                <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
                                    {project.description}
                                </Text>
                                <Group gap="xs" mb="md">
                                    {project.tags.map((tag, index) => (
                                        <Badge key={index} variant="light" color="violet" size="sm">
                                            {tag}
                                        </Badge>
                                    ))}
                                </Group>
                                <Group justify="space-between">
                                    <Group gap="xs">
                                        <Tooltip label="Members">
                                            <Group gap={4}>
                                                <IconUsers size={16} />
                                                <Text size="sm">{project.members}</Text>
                                            </Group>
                                        </Tooltip>
                                        <Tooltip label="Created">
                                            <Group gap={4}>
                                                <IconCalendar size={16} />
                                                <Text size="sm">
                                                    {new Date(project.createdAt).toLocaleDateString()}
                                                </Text>
                                            </Group>
                                        </Tooltip>
                                    </Group>
                                    <Button
                                        variant="light"
                                        size="sm"
                                        onClick={() => router.push(`/projects/${project.id}`)}
                                    >
                                        View Details
                                    </Button>
                                </Group>
                            </Card>
                        ))}
                    </div>
                )}
            </Container>

            <Modal
                opened={modalOpened}
                onClose={() => {
                    setModalOpened(false);
                    setEditingProject(null);
                }}
                title={editingProject ? "Edit Project" : "New Project"}
                centered
            >
                <Stack>
                    <TextInput
                        label="Project Name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.currentTarget.value)}
                        required
                    />
                    <Textarea
                        label="Description"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.currentTarget.value)}
                        minRows={3}
                    />
                    <Select
                        label="Status"
                        value={newProjectStatus}
                        onChange={(value) => setNewProjectStatus(value as 'active' | 'archived' | 'completed')}
                        data={[
                            { value: 'active', label: 'Active' },
                            { value: 'archived', label: 'Archived' },
                            { value: 'completed', label: 'Completed' },
                        ]}
                    />
                    <TextInput
                        label="Tags (comma-separated)"
                        value={newProjectTags}
                        onChange={(e) => setNewProjectTags(e.currentTarget.value)}
                        placeholder="e.g. web, design, marketing"
                    />
                    <Button
                        onClick={editingProject ? handleUpdateProject : handleCreateProject}
                        fullWidth
                    >
                        {editingProject ? "Update Project" : "Create Project"}
                    </Button>
                </Stack>
            </Modal>

            <Modal
                opened={shareModalOpened}
                onClose={() => setShareModalOpened(false)}
                title="Share Project"
                centered
            >
                <Stack>
                    <TextInput
                        label="Email Address"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.currentTarget.value)}
                        placeholder="Enter email address to share with"
                        required
                    />
                    <Button
                        onClick={() => editingProject && handleShareProject(editingProject.id)}
                        fullWidth
                    >
                        Share Project
                    </Button>
                </Stack>
            </Modal>
        </div>
    );
} 