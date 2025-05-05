"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Group, Button, Title, Box, Paper, rem, Text, Modal, TextInput, Card, Stack, Loader } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import Link from "next/link";

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

  // Profile modal state for password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account state
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

  const handleChangePassword = async () => {
    setChangingPassword(true);
    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification({ title: "Error", message: "All fields are required.", color: "red" });
        return;
      }
      if (newPassword !== confirmPassword) {
        showNotification({ title: "Error", message: "New passwords do not match.", color: "red" });
        return;
      }
      const userEmail = localStorage.getItem("user:username") || "";
      if (!userEmail) throw new Error("User email not found in localStorage");
      // Fetch encrypted password from Civil Memory
      const res = await fetch(
        `http://localhost:3333/users?mode=volatile&key=${encodeURIComponent(userEmail)}`
      );
      if (!res.ok) throw new Error("Failed to fetch current password");
      const encryptedPassword = await res.text();
      // Extract salt from stored encrypted password
      const saltB64 = extractSaltFromEncrypted(encryptedPassword);
      // Encrypt entered current password with extracted salt
      const encryptedInput = await encryptPassword(currentPassword, saltB64);
      if (encryptedInput !== encryptedPassword) {
        showNotification({ title: "Error", message: "Current password is incorrect.", color: "red" });
        return;
      }
      // Encrypt new password with a new salt
      const newEncrypted = await encryptPassword(newPassword);
      // Store new encrypted password
      const resSet = await fetch(
        `http://localhost:3333/users?mode=volatile&key=${encodeURIComponent(userEmail)}`,
        {
          method: "POST",
          body: newEncrypted,
        }
      );
      if (!resSet.ok) throw new Error("Failed to update password");
      showNotification({ title: "Success", message: "Password changed successfully!", color: "green" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showNotification({ title: "Error", message: err.message || "Failed to change password.", color: "red" });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const userEmail = localStorage.getItem("user:username") || "";
      if (!userEmail) throw new Error("User email not found in localStorage");
      // Delete user password
      await fetch(`http://localhost:3333/users?mode=volatile&key=${encodeURIComponent(userEmail)}`, { method: "DELETE" });
      // Delete user name
      await fetch(`http://localhost:3333/users?mode=volatile&key=${encodeURIComponent(userEmail + ':username')}`, { method: "DELETE" });
      // Remove user from all projects
      const res = await fetch("http://localhost:3333/projects?mode=volatile&key=projects");
      if (res.ok) {
        const projects = await res.json();
        let changed = false;
        const updatedProjects = Array.isArray(projects)
          ? projects.map((p) => {
            if (Array.isArray(p.members) && p.members.includes(userEmail)) {
              changed = true;
              return { ...p, members: p.members.filter((m: string) => m !== userEmail) };
            }
            return p;
          })
          : [];
        if (changed) {
          await fetch("http://localhost:3333/projects?mode=volatile&key=projects", {
            method: "POST",
            body: JSON.stringify(updatedProjects),
          });
        }
      }
      // Log out
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("user:username");
      showNotification({ title: "Account Deleted", message: "Your account and data have been deleted.", color: "green" });
      router.replace("/login");
    } catch (err: any) {
      showNotification({ title: "Error", message: err.message || "Failed to delete account.", color: "red" });
    } finally {
      setDeletingAccount(false);
      setDeleteConfirmOpen(false);
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
        <Button onClick={() => { console.log("Save button clicked"); handleSave(); }} loading={saving} fullWidth mb="md">
          Save
        </Button>
        <Title order={5} mt="md" mb="xs">Change Password</Title>
        <TextInput
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.currentTarget.value)}
          mb="xs"
        />
        <TextInput
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.currentTarget.value)}
          mb="xs"
        />
        <TextInput
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.currentTarget.value)}
          mb="md"
        />
        <Button onClick={handleChangePassword} loading={changingPassword} fullWidth color="violet" mb="md">
          Change Password
        </Button>
        <Button color="red" variant="outline" fullWidth onClick={() => setDeleteConfirmOpen(true)} loading={deletingAccount}>
          Delete Account
        </Button>
      </Modal>
      {/* Delete confirmation modal */}
      <Modal opened={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Confirm Account Deletion" centered>
        <Text c="red" mb="md">Are you sure you want to permanently delete your account and all associated data? This action cannot be undone.</Text>
        <Group grow>
          <Button variant="default" onClick={() => setDeleteConfirmOpen(false)} disabled={deletingAccount}>Cancel</Button>
          <Button color="red" onClick={handleDeleteAccount} loading={deletingAccount}>Delete</Button>
        </Group>
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

async function encryptPassword(password: string, saltB64?: string): Promise<string> {
  if (!saltB64) {
    // Generate new salt
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const enc = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      passwordKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const rawKey = await window.crypto.subtle.exportKey("raw", derivedKey);
    const combined = new Uint8Array(salt.length + rawKey.byteLength);
    combined.set(salt, 0);
    combined.set(new Uint8Array(rawKey), salt.length);
    return btoa(String.fromCharCode(...combined));
  } else {
    // Use provided salt
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
    const enc = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      passwordKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const rawKey = await window.crypto.subtle.exportKey("raw", derivedKey);
    const combined = new Uint8Array(salt.length + rawKey.byteLength);
    combined.set(salt, 0);
    combined.set(new Uint8Array(rawKey), salt.length);
    return btoa(String.fromCharCode(...combined));
  }
}

function extractSaltFromEncrypted(encrypted: string): string {
  // The salt is the first 16 bytes (base64-encoded)
  const bytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const salt = bytes.slice(0, 16);
  return btoa(String.fromCharCode(...salt));
}
