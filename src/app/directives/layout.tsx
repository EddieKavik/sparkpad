"use client";
import { AppShell, Stack, Title, Button } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DirectivesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AppShell
      navbar={{
        width: 240,
        breakpoint: 'sm',
        collapsed: false,
        content: (
          <Stack>
            <Title order={4} mb="md">Directives Hub</Title>
            <Button
              component={Link}
              href="/directives/inbox"
              variant={pathname === "/directives/inbox" ? "filled" : "light"}
              fullWidth
            >
              Inbox
            </Button>
            <Button
              component={Link}
              href="/directives/broadcast-logs"
              variant={pathname === "/directives/broadcast-logs" ? "filled" : "light"}
              fullWidth
            >
              Broadcast Logs
            </Button>
            <Button
              component={Link}
              href="/directives/target-groups"
              variant={pathname === "/directives/target-groups" ? "filled" : "light"}
              fullWidth
            >
              Target Groups
            </Button>
          </Stack>
        ),
      }}
      padding="md"
    >
      <main>{children}</main>
    </AppShell>
  );
} 