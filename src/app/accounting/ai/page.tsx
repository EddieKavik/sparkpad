"use client";
import { Title, Container, Paper, Stack, Text, Group } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";

export default function AIInsightsPage() {
  return (
    <Container size="md" py="xl">
      <Title order={3} mb="md">AI Insights</Title>
      <Paper p="md" withBorder>
        <Group>
          <IconSparkles size={28} />
          <Stack gap={2}>
            <Text fw={700}>AI Suggestions</Text>
            <Text c="dimmed">Get smart recommendations for budgeting, spending, and more.</Text>
            <Text c="dimmed">(Coming soon: AI-powered chat and financial health summaries!)</Text>
          </Stack>
        </Group>
      </Paper>
    </Container>
  );
} 