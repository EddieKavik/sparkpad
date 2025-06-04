"use client";
import { Title, Container, Group, Paper, Button, Stack, Text } from "@mantine/core";
import { IconSparkles, IconChartBar, IconBook, IconReceipt2 } from "@tabler/icons-react";
import Link from "next/link";

export default function AccountingDashboard() {
  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="lg">Accounting Dashboard</Title>
      <Group align="flex-start" grow>
        <Paper p="md" shadow="sm" radius="md" withBorder>
          <Group>
            <IconBook size={32} />
            <Stack gap={2}>
              <Text fw={700}>Chart of Accounts</Text>
              <Text c="dimmed" size="sm">Manage your company accounts and structure.</Text>
              <Button component={Link} href="/accounting/accounts" size="xs" mt="xs">View Accounts</Button>
            </Stack>
          </Group>
        </Paper>
        <Paper p="md" shadow="sm" radius="md" withBorder>
          <Group>
            <IconReceipt2 size={32} />
            <Stack gap={2}>
              <Text fw={700}>Transactions</Text>
              <Text c="dimmed" size="sm">Record and review all company transactions.</Text>
              <Button component={Link} href="/accounting/transactions" size="xs" mt="xs">View Transactions</Button>
            </Stack>
          </Group>
        </Paper>
        <Paper p="md" shadow="sm" radius="md" withBorder>
          <Group>
            <IconChartBar size={32} />
            <Stack gap={2}>
              <Text fw={700}>Reports</Text>
              <Text c="dimmed" size="sm">Generate financial statements and analytics.</Text>
              <Button component={Link} href="/accounting/reports" size="xs" mt="xs">View Reports</Button>
            </Stack>
          </Group>
        </Paper>
        <Paper p="md" shadow="sm" radius="md" withBorder>
          <Group>
            <IconSparkles size={32} />
            <Stack gap={2}>
              <Text fw={700}>AI Insights</Text>
              <Text c="dimmed" size="sm">Get smart suggestions, anomaly detection, and more.</Text>
              <Button component={Link} href="/accounting/ai" size="xs" mt="xs">Try AI Insights</Button>
            </Stack>
          </Group>
        </Paper>
      </Group>
    </Container>
  );
} 