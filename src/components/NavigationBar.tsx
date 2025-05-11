"use client";
import { useRouter } from "next/navigation";
import { Group, Button, Text, Avatar, Menu, ActionIcon, rem } from "@mantine/core";
import { IconMaximize } from "@tabler/icons-react";
import { getInitials } from "@/utils/helpers";

interface NavigationBarProps {
    userName?: string | null;
    onLogout?: () => void;
    showBackButton?: boolean;
}

export function NavigationBar({ userName, onLogout, showBackButton = false }: NavigationBarProps) {
    const router = useRouter();

    return (
        <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #eee' }}>
            <Group>
                {showBackButton && (
                    <Button
                        variant="subtle"
                        onClick={() => router.push('/')}
                        size="sm"
                    >
                        Back to Dashboard
                    </Button>
                )}
            </Group>
            <Group>
                {userName && (
                    <Menu shadow="md" width={200} position="bottom-end">
                        <Menu.Target>
                            <Group style={{ cursor: 'pointer' }} gap={8}>
                                <Avatar radius="xl" color="violet" size={32}>
                                    {getInitials(userName)}
                                </Avatar>
                                <Text size="sm" fw={500}>{userName}</Text>
                            </Group>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item onClick={onLogout}>
                                Logout
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                )}
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    radius="md"
                    style={{ padding: 0, minWidth: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => {
                        if (document.fullscreenElement) {
                            document.exitFullscreen();
                        } else {
                            document.body.requestFullscreen();
                        }
                    }}
                    title="Fullscreen"
                >
                    <IconMaximize size={22} />
                </ActionIcon>
            </Group>
        </Group>
    );
} 