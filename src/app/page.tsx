"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Group, Button, Title, Box, Paper, rem, Text, Modal, TextInput } from "@mantine/core";
import { showNotification } from "@mantine/notifications";

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

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
  }, [router]);

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

  return (
    <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)" }}>
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
                  onClick={handleNameClick}
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
        {/* Main content goes here */}
      </Container>
    </Box>
  );
}
