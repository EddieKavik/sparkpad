"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Group, Button, Title, Box, Paper, rem, Text, Modal, TextInput, Card, Stack, Loader } from "@mantine/core";
import { showNotification } from "@mantine/notifications";

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  // Projects state
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectModal, setProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  // Debug: log on each render
  console.log("Rendering Home, userName:", userName);

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
      console.log("Fetched projects array:", data);
      setProjects(Array.isArray(data) ? data : []);
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

  const handleNameClick = () => {
    setEditName(userName || "");
    setModalOpened(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userEmail = localStorage.getItem("user:username") || "";
      if (!userEmail) throw new Error("User email not found in localStorage");
      const res = await fetch(
        `http://localhost:3333/users?mode=volatile&key=${encodeURIComponent(userEmail + ":username")}`,
        {
          method: "POST",
          body: editName,
        }
      );
      if (!res.ok) throw new Error((await res.text()) || "Failed to update name");
      const user = localStorage.getItem("user");
      if (user) {
        const parsed = JSON.parse(user);
        parsed.name = editName;
        localStorage.setItem("user", JSON.stringify(parsed));
      }
      setUserName(editName);
      console.log("Updated userName to:", editName);
      setModalOpened(false);
      showNotification({
        title: "Success",
        message: "Name updated successfully!",
        color: "green",
      });
    } catch (err: any) {
      showNotification({
        title: "Error",
        message: err.message || "Failed to update name.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
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
      // Add new project
      const newProject = { id: Date.now(), name: newProjectName };
      const updatedProjects = [...projectsArr, newProject];
      console.log("Saving projects array:", updatedProjects);
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
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Edit Profile" centered>
        <TextInput
          label="Name"
          value={editName}
          onChange={(e) => setEditName(e.currentTarget.value)}
          mb="md"
        />
        <Button onClick={() => { console.log("Save button clicked"); handleSave(); }} loading={saving} fullWidth>
          Save
        </Button>
      </Modal>
      <Paper
        shadow="xs"
        p={0}
        style={{
          height: 60,
          background: "#fff",
          borderBottom: "1px solid #e0e7ff",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Container size="lg" style={{ height: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              justifyContent: "space-between",
            }}
          >
            <Title
              order={3}
              style={{
                fontWeight: 800,
                letterSpacing: -1,
                fontSize: rem(24),
                color: "#7950f2",
              }}
            >
              SparkPad
            </Title>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              {userName && (
                <Text
                  size="md"
                  fw={600}
                  c="violet.8"
                  style={{
                    marginRight: 0,
                    padding: "4px 16px",
                    borderRadius: 8,
                    background: "#f3f0ff",
                    border: "1px solid #e5dbff",
                    cursor: "pointer",
                  }}
                  onClick={() => { setEditName(userName || ""); setModalOpened(true); }}
                  title="Edit profile"
                >
                  {userName}
                </Text>
              )}
              <Button
                variant="outline"
                color="violet"
                radius="md"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </div>
        </Container>
      </Paper>
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
              <Card key={project.id || idx} shadow="sm" p="md" radius="md" withBorder>
                <Text fw={600}>{project.name || "Untitled Project"}</Text>
              </Card>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
