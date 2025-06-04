"use client";
import { Title, Container, Button, Group, Stack, Text, Paper, TextInput } from "@mantine/core";
import { IconChartBar, IconSparkles } from "@tabler/icons-react";

export default function ReportsPage() {
  return (
    <Container size="md" py="xl">
      <Title order={3} mb="md">Financial Reports</Title>
      <Paper p="md" mb="md" withBorder>
        <Group gap="md">
          <Button leftSection={<IconChartBar size={16} />}>Balance Sheet</Button>
          <Button leftSection={<IconChartBar size={16} />}>Income Statement</Button>
          <Button leftSection={<IconChartBar size={16} />}>Cash Flow</Button>
        </Group>
      </Paper>
      <Paper p="md" withBorder>
        <Group align="flex-start">
          <IconSparkles size={20} />
          <Stack gap={2}>
            <Text>Ask AI about your finances:</Text>
            <TextInput placeholder="E.g. Show me all expenses over $500 last month" />
          </Stack>
        </Group>
      </Paper>
    </Container>
  );
} 