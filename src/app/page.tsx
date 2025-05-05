"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container, Group, Button, Title, Box, Paper, rem } from "@mantine/core";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      router.replace("/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  return (
    <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)" }}>
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
          <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Title
              order={3}
              style={{
                fontWeight: 800,
                letterSpacing: -1,
                fontSize: rem(24),
                color: "#7950f2",
                flex: 1,
              }}
            >
              SparkPad
            </Title>
            <Button
              variant="outline"
              color="violet"
              radius="md"
              onClick={handleLogout}
              style={{ marginLeft: "auto" }}
            >
              Logout
            </Button>
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
