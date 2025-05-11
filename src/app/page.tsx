"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Group, Button, Title, Box, Text, Modal, TextInput, Card, Stack, Loader } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import Link from "next/link";
import { NavigationBar } from "@/components/NavigationBar";

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  // Projects state
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectModal, setProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

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
      const res = await fetch("http://localhost:3333/projects?mode=volatile&key=projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      const userEmail = localStorage.getItem("user:username");
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
      // Fetch current projects array
      const resGet = await fetch("http://localhost:3333/projects?mode=volatile&key=projects");
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
      const userEmail = localStorage.getItem("user:username") || "";
      const newProject = { id: Date.now(), name: newProjectName, members: [userEmail] };
      const updatedProjects = [...projectsArr, newProject];
      // Store updated array
      const resSet = await fetch("http://localhost:3333/projects?mode=volatile&key=projects", {
        method: "POST",
        body: JSON.stringify(updatedProjects),
      });
      if (!resSet.ok) throw new Error("Failed to create project");
      showNotification({ title: "Success", message: "Project created!", color: "green" });
      setProjectModal(false);
      setNewProjectName("");
      fetchProjects();
    } catch (err: any) {
      showNotification({ title: "Error", message: err.message || "Failed to create project", color: "red" });
    } finally {
      setCreatingProject(false);
    }
  };

  return (
    <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)" }}>
      <NavigationBar userName={userName} onLogout={handleLogout} />
      {/* Project Create Modal */}
      <Modal opened={projectModal} onClose={() => setProjectModal(false)} title="Create Project" centered>
        <TextInput
          label="Project Name"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.currentTarget.value)}
          mb="md"
        />
        <Button onClick={handleCreateProject} loading={creatingProject} fullWidth>
          Create
        </Button>
      </Modal>
      <Container size="lg" mt={40}>
        <Title order={2} mb="md">Welcome to SparkPad!</Title>
        <Button mb="md" onClick={() => setProjectModal(true)} color="violet">
          + New Project
        </Button>
        {projectsLoading ? (
          <Loader mt="md" />
        ) : projects.length === 0 ? (
          <Text mt="md" c="dimmed">No projects found.</Text>
        ) : (
          <Stack mt="md">
            {projects.map((project, idx) => (
              <Link href={`/projects/${project.id}`} style={{ textDecoration: "none" }} key={project.id || idx}>
                <Card shadow="sm" p="md" radius="md" withBorder style={{ cursor: "pointer", transition: "box-shadow 0.2s", marginBottom: 8 }}>
                  <Text fw={600} c="violet.8">{project.name || "Untitled Project"}</Text>
                </Card>
              </Link>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
