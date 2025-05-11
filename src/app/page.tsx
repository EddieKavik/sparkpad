"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Group, Button, Title, Box, Text, Modal, TextInput, Card, Stack, Loader, Badge } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import Link from "next/link";
import { NavigationBar } from "@/components/NavigationBar";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/contexts/ThemeContext";
import { IconRocket, IconUserPlus, IconBell, IconSearch, IconStar, IconRobot, IconUsersGroup, IconSparkles } from "@tabler/icons-react";
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';

// Theme-specific styles
const themeStyles = {
  futuristic: {
    background: "linear-gradient(135deg, #181c2b 0%, #23243a 100%)",
    cardBackground: "rgba(24,28,43,0.85)",
    cardBorder: "1.5px solid #3a2e5d77",
    textColor: "#fff",
    secondaryTextColor: "#b0b7ff",
    accentColor: "#7f5fff",
    glowOverlay: {
      background: 'radial-gradient(circle at 80% 20%, #3a2e5d44 0%, transparent 60%), radial-gradient(circle at 20% 80%, #232b4d44 0%, transparent 60%)',
      filter: 'blur(48px)',
    },
    buttonGradient: { from: '#232b4d', to: '#3a2e5d', deg: 90 },
    cardShadow: '0 8px 32px 0 #232b4d44',
    modalBackground: 'rgba(24,28,43,0.95)',
    inputBackground: 'rgba(35,43,77,0.3)',
    inputBorder: '#3a2e5d77',
    badgeColor: 'violet',
  },
  classic: {
    background: "#f8f9fa",
    cardBackground: "#fff",
    cardBorder: "1px solid #e9ecef",
    textColor: "#1a1b1e",
    secondaryTextColor: "#868e96",
    accentColor: "#228be6",
    glowOverlay: {
      background: 'none',
      filter: 'none',
    },
    buttonGradient: { from: '#228be6', to: '#40c057', deg: 90 },
    cardShadow: '0 2px 8px rgba(0,0,0,0.06)',
    modalBackground: '#fff',
    inputBackground: '#f1f3f5',
    inputBorder: '#e9ecef',
    badgeColor: 'blue',
  },
};

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = themeStyles[theme];
  const [userName, setUserName] = useState<string | null>(null);

  // Projects state
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectModal, setProjectModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [invitingMember, setInvitingMember] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState<'active' | 'archived' | 'completed'>('active');
  const [newProjectTags, setNewProjectTags] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      router.replace("/login");
    } else {
      try {
        const parsed = JSON.parse(user);
        setUserName(parsed.name || null);
      } catch {
        setUserName(null);
      }
    }
    fetchProjects();
    // eslint-disable-next-line
  }, [router]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const userEmail = localStorage.getItem("user:username");
      if (!userEmail) {
        router.replace("/login");
        return;
      }
      const res = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      // Only show projects where the user is a member
      const filtered = Array.isArray(data)
        ? data.filter(
          (project) =>
            Array.isArray(project.members) &&
            userEmail &&
            project.members.includes(userEmail)
        )
        : [];
      setProjects(filtered);
    } catch (err) {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  const handleCreateProject = async () => {
    setCreatingProject(true);
    try {
      const userEmail = localStorage.getItem("user:username");
      if (!userEmail) {
        router.replace("/login");
        return;
      }
      // Fetch current projects array
      const resGet = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`);
      let projectsArr = [];
      if (resGet.ok) {
        try {
          projectsArr = await resGet.json();
          if (!Array.isArray(projectsArr)) projectsArr = [];
        } catch {
          projectsArr = [];
        }
      }
      // Add new project with members array
      const newProject = {
        id: Date.now().toString(),
        name: newProjectName.trim(),
        description: newProjectDescription.trim(),
        status: newProjectStatus,
        tags: newProjectTags.split(",").map(tag => tag.trim()).filter(Boolean),
        createdAt: new Date().toISOString(),
        members: [userEmail],
      };
      const updatedProjects = [...projectsArr, newProject];
      // Store updated array
      const resSet = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`, {
        method: "POST",
        body: JSON.stringify(updatedProjects),
      });
      if (!resSet.ok) throw new Error("Failed to create project");
      showNotification({ title: "Success", message: "Project created!", color: "green" });
      setProjectModal(false);
      setNewProjectName("");
      setNewProjectDescription("");
      setNewProjectStatus("active");
      setNewProjectTags("");
      fetchProjects();
    } catch (err: any) {
      showNotification({ title: "Error", message: err.message || "Failed to create project", color: "red" });
    } finally {
      setCreatingProject(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !inviteProjectId) {
      showNotification({ title: "Error", message: "Please fill in all fields", color: "red" });
      return;
    }

    setInvitingMember(true);
    try {
      const userEmail = localStorage.getItem("user:username");
      if (!userEmail) {
        router.replace("/login");
        return;
      }

      // Fetch current projects array
      const resGet = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`);
      if (!resGet.ok) throw new Error("Failed to fetch projects");

      const projectsArr = await resGet.json();
      const projectIndex = projectsArr.findIndex((p: any) => p.id === inviteProjectId);

      if (projectIndex === -1) {
        throw new Error("Project not found");
      }

      // Add new member if not already a member
      if (!projectsArr[projectIndex].members.includes(inviteEmail)) {
        projectsArr[projectIndex].members.push(inviteEmail);

        // Update projects
        const resSet = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`, {
          method: "POST",
          body: JSON.stringify(projectsArr),
        });

        if (!resSet.ok) throw new Error("Failed to invite member");

        showNotification({ title: "Success", message: "Member invited successfully!", color: "green" });
        setInviteModal(false);
        setInviteEmail("");
        setInviteProjectId("");
        fetchProjects();
      } else {
        showNotification({ title: "Info", message: "User is already a member of this project", color: "blue" });
      }
    } catch (err: any) {
      showNotification({ title: "Error", message: err.message || "Failed to invite member", color: "red" });
    } finally {
      setInvitingMember(false);
    }
  };

  const handleSearchProjects = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = projects.filter(project =>
      project.name.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query) ||
      project.tags.some((tag: string) => tag.toLowerCase().includes(query))
    );
    setSearchResults(results);
  };

  useEffect(() => {
    handleSearchProjects();
  }, [searchQuery]);

  // Example: Simulate activity feed (replace with real data in production)
  useEffect(() => {
    setActivityFeed([
      { type: 'project', message: 'You created "AI Research Hub"', time: '2m ago', icon: <IconRocket size={18} color="#00f0ff" /> },
      { type: 'member', message: 'Invited Jane Doe to "Design Sprint"', time: '10m ago', icon: <IconUserPlus size={18} color="#ff00e0" /> },
      { type: 'ai', message: 'AI Assistant suggested a new template', time: '1h ago', icon: <IconRobot size={18} color="#00ffae" /> },
      { type: 'star', message: 'You starred "Quantum Project"', time: '3h ago', icon: <IconStar size={18} color="#ffe600" /> },
    ]);
  }, []);

  // Calculate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const teamMembers = Array.from(new Set(projects.flatMap(p => Array.isArray(p.members) ? p.members : []))).length;

  return (
    <Box style={{ minHeight: "100vh", background: styles.background, position: 'relative', overflow: 'hidden' }}>
      {/* Theme-specific Glow Overlay */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none',
        zIndex: 0,
        ...styles.glowOverlay,
      }} />
      <NavigationBar userName={userName} onLogout={handleLogout} />
      <ThemeSwitcher />

      {/* Welcome Banner */}
      <Box style={{
        margin: '0 auto',
        marginTop: 40,
        marginBottom: 32,
        maxWidth: 700,
        padding: 32,
        borderRadius: 32,
        background: styles.cardBackground,
        boxShadow: styles.cardShadow,
        backdropFilter: 'none',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <Group justify="center" align="center" gap={8}>
          <IconSparkles size={32} color={styles.accentColor} />
          <Title order={2} style={{ color: styles.textColor, fontWeight: 800, letterSpacing: 1 }}>
            Welcome{userName ? `, ${userName}` : ''} to SparkPad
          </Title>
        </Group>
        <Text mt="sm" c={styles.secondaryTextColor} size="lg" style={{ fontWeight: 500, letterSpacing: 0.5 }}>
          Your {theme === 'futuristic' ? 'futuristic AI' : 'collaborative'} workspace for innovation.
        </Text>
      </Box>

      {/* Quick Actions */}
      <Group justify="center" gap={24} mb={32}>
        <Button
          leftSection={<IconRocket size={18} />}
          variant="gradient"
          gradient={styles.buttonGradient}
          size="md"
          radius="xl"
          style={{
            fontWeight: 700,
            boxShadow: styles.cardShadow,
            color: '#fff'
          }}
          onClick={() => setProjectModal(true)}
        >
          New Project
        </Button>
        <Button
          leftSection={<IconUserPlus size={18} />}
          variant="gradient"
          gradient={styles.buttonGradient}
          size="md"
          radius="xl"
          style={{
            fontWeight: 700,
            boxShadow: styles.cardShadow,
            color: '#fff'
          }}
          onClick={() => setInviteModal(true)}
        >
          Invite Member
        </Button>
        <Button
          leftSection={<IconSearch size={18} />}
          variant="gradient"
          gradient={styles.buttonGradient}
          size="md"
          radius="xl"
          style={{
            fontWeight: 700,
            boxShadow: styles.cardShadow,
            color: '#fff'
          }}
          onClick={() => setSearchModal(true)}
        >
          Search Projects
        </Button>
      </Group>

      {/* Stats Cards */}
      <Group justify="center" gap={32} mb={40}>
        {[
          { icon: <IconRocket size={32} color={styles.accentColor} />, value: totalProjects, label: "Total Projects" },
          { icon: <IconBell size={32} color={styles.accentColor} />, value: activeProjects, label: "Active Projects" },
          { icon: <IconStar size={32} color={styles.accentColor} />, value: completedProjects, label: "Completed" },
          { icon: <IconUsersGroup size={32} color={styles.accentColor} />, value: teamMembers, label: "Team Members" },
        ].map((stat, index) => (
          <Box
            key={index}
            style={{
              minWidth: 180,
              borderRadius: 24,
              background: styles.cardBackground,
              border: styles.cardBorder,
              boxShadow: styles.cardShadow,
              padding: 24,
              textAlign: 'center',
              color: styles.accentColor,
              backdropFilter: 'none',
            }}
          >
            {stat.icon}
            <Title order={3} style={{ color: styles.accentColor, fontWeight: 700 }}>{stat.value}</Title>
            <Text size="sm" c={styles.secondaryTextColor}>{stat.label}</Text>
          </Box>
        ))}
      </Group>

      {/* Recent Projects Carousel */}
      <Box mb={40} style={{ maxWidth: 900, margin: '0 auto', zIndex: 1, position: 'relative' }}>
        <Title order={4} mb={16} style={{ color: styles.textColor, fontWeight: 700, letterSpacing: 1 }}>Recent Projects</Title>
        {projects.length === 0 ? (
          <Text c={styles.secondaryTextColor} ta="center">No projects yet. Start your first project!</Text>
        ) : (
          <Carousel slideSize="33.3333%" height={180} slideGap="md">
            {(projects.slice(-6).reverse() || []).map((project, idx) => (
              <Carousel.Slide key={project.id || idx}>
                <Card shadow="md" p="lg" radius="lg" withBorder style={{
                  background: styles.cardBackground,
                  border: styles.cardBorder,
                  color: styles.textColor,
                  minHeight: 160,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  boxShadow: styles.cardShadow
                }}>
                  <Group justify="space-between" align="center">
                    <Text fw={700} size="lg" style={{ color: styles.accentColor }}>{project.name || "Untitled Project"}</Text>
                    <IconStar size={20} color="#fff7b0" style={{ filter: 'drop-shadow(0 0 6px #fff7b088)' }} />
                  </Group>
                  <Text size="sm" c={styles.secondaryTextColor} mt={8} mb={8} lineClamp={2}>{project.description || "No description."}</Text>
                  <Group gap={6} mt={8}>
                    {(project.tags || []).map((tag: string, i: number) => (
                      <Badge key={i} color={styles.badgeColor} variant="light" size="xs">{tag}</Badge>
                    ))}
                  </Group>
                  <Button mt={16}
                    variant={theme === 'futuristic' ? 'gradient' : 'filled'}
                    gradient={theme === 'futuristic' ? styles.buttonGradient : undefined}
                    color={theme === 'classic' ? 'blue' : undefined}
                    size="xs"
                    radius="xl"
                    style={{ fontWeight: 700, color: theme === 'classic' ? '#fff' : '#fff' }}
                    component={Link}
                    href={`/projects/${project.id}`}
                  >
                    Open Project
                  </Button>
                </Card>
              </Carousel.Slide>
            ))}
          </Carousel>
        )}
      </Box>
      {/* Activity Feed */}
      <Box mb={40} style={{
        maxWidth: 700,
        margin: '0 auto',
        zIndex: 1,
        position: 'relative',
        background: styles.cardBackground,
        borderRadius: 24,
        border: styles.cardBorder,
        boxShadow: styles.cardShadow,
        padding: 24
      }}>
        <Title order={4} mb={16} style={{ color: styles.textColor, fontWeight: 700, letterSpacing: 1 }}>Activity Feed</Title>
        {activityFeed.length === 0 ? (
          <Text c={styles.secondaryTextColor} ta="center">No recent activity.</Text>
        ) : (
          <Stack gap={12}>
            {activityFeed.map((item, idx) => (
              <Group key={idx} gap={10} align="center">
                {item.icon}
                <Text size="sm" c={styles.secondaryTextColor}>{item.message}</Text>
                <Text size="xs" c={styles.accentColor} ml="auto">{item.time}</Text>
              </Group>
            ))}
          </Stack>
        )}
      </Box>
      {/* Project Create Modal */}
      <Modal opened={projectModal} onClose={() => setProjectModal(false)} title="Create Project" centered>
        <TextInput
          label="Project Name"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.currentTarget.value)}
          mb="md"
        />
        <TextInput
          label="Description"
          value={newProjectDescription}
          onChange={(e) => setNewProjectDescription(e.currentTarget.value)}
          mb="md"
        />
        <TextInput
          label="Tags (comma-separated)"
          value={newProjectTags}
          onChange={(e) => setNewProjectTags(e.currentTarget.value)}
          mb="md"
          placeholder="e.g. web, design, marketing"
        />
        <select
          value={newProjectStatus}
          onChange={e => setNewProjectStatus(e.target.value as 'active' | 'archived' | 'completed')}
          style={{ width: '100%', marginBottom: 16, padding: 8, borderRadius: 4, border: styles.inputBorder }}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="completed">Completed</option>
        </select>
        <Button onClick={handleCreateProject} loading={creatingProject} fullWidth>
          Create
        </Button>
      </Modal>
      {/* Invite Member Modal */}
      <Modal
        opened={inviteModal}
        onClose={() => setInviteModal(false)}
        title="Invite Team Member"
        centered
        size="md"
        styles={{
          title: { color: styles.textColor, fontWeight: 700 },
          header: { background: styles.modalBackground },
          body: { background: styles.modalBackground },
        }}
      >
        <Stack>
          <TextInput
            label="Member Email"
            placeholder="Enter member's email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            styles={{
              label: { color: styles.secondaryTextColor },
              input: { background: styles.inputBackground, borderColor: styles.inputBorder, color: styles.textColor },
            }}
          />
          <select
            value={inviteProjectId}
            onChange={(e) => setInviteProjectId(e.target.value)}
            style={{
              background: styles.inputBackground,
              border: styles.inputBorder,
              borderRadius: '4px',
              padding: '8px 12px',
              color: styles.textColor,
              width: '100%',
            }}
          >
            <option value="">Select Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <Button
            onClick={handleInviteMember}
            loading={invitingMember}
            variant="gradient"
            gradient={{ from: '#3a2e5d', to: '#232b4d', deg: 90 }}
            fullWidth
          >
            Invite Member
          </Button>
        </Stack>
      </Modal>
      {/* Search Projects Modal */}
      <Modal
        opened={searchModal}
        onClose={() => setSearchModal(false)}
        title="Search Projects"
        centered
        size="lg"
        styles={{
          title: { color: styles.textColor, fontWeight: 700 },
          header: { background: styles.modalBackground },
          body: { background: styles.modalBackground },
        }}
      >
        <Stack>
          <TextInput
            placeholder="Search by project name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            styles={{
              input: { background: styles.inputBackground, borderColor: styles.inputBorder, color: styles.textColor },
            }}
          />
          <Box>
            {searchResults.length > 0 ? (
              <Stack>
                {searchResults.map((project) => (
                  <Card
                    key={project.id}
                    style={{
                      background: styles.cardBackground,
                      border: styles.cardBorder,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      router.push(`/projects/${project.id}`);
                      setSearchModal(false);
                    }}
                  >
                    <Group justify="space-between">
                      <Box>
                        <Text fw={700} c={styles.textColor}>{project.name}</Text>
                        <Text size="sm" c={styles.secondaryTextColor}>{project.description}</Text>
                      </Box>
                      <Badge color={project.status === 'active' ? 'green' : project.status === 'completed' ? 'blue' : 'gray'}>
                        {project.status}
                      </Badge>
                    </Group>
                    <Group mt="xs" gap="xs">
                      {project.tags.map((tag: string) => (
                        <Badge key={tag} variant="light" color={styles.badgeColor}>
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  </Card>
                ))}
              </Stack>
            ) : searchQuery ? (
              <Text c={styles.secondaryTextColor} ta="center">No projects found</Text>
            ) : null}
          </Box>
        </Stack>
      </Modal>
    </Box>
  );
}
