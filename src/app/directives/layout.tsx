"use client";
import { Stack, Title, Button } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DirectivesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ width: 240, background: '#f0f1f3', borderRight: '1px solid #eee', padding: '1rem 0' }}>
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
      </div>
      <main style={{ flex: 1, padding: '1rem' }}>{children}</main>
    </div>
  );
} 