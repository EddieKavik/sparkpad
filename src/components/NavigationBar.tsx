"use client";
import { useRouter } from "next/navigation";
import { Group, Button, Text, Avatar, Menu, ActionIcon, rem, Modal, TextInput, Title, AppShell, Burger, UnstyledButton } from "@mantine/core";
import { IconMaximize, IconChevronDown, IconLogout, IconUser, IconSun, IconMoonStars } from "@tabler/icons-react";
import { getInitials } from "@/utils/helpers";
import { useState } from "react";
import { showNotification } from "@mantine/notifications";
import { useDisclosure } from '@mantine/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from './ThemeProvider';

export function NavigationBar() {
    const [opened, { toggle }] = useDisclosure();
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [userMenuOpened, setUserMenuOpened] = useState(false);
    const { isDarkMode, toggleTheme } = useTheme();
    const theme = useMantineTheme();
    const [modalOpened, setModalOpened] = useState(false);
    const [editName, setEditName] = useState("");
    const [saving, setSaving] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    const handleNameClick = () => {
        setEditName(user?.name || "");
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
            setModalOpened(false);
            showNotification({
                title: "Success",
                message: "Name updated successfully!",
                color: "green",
            });
            // Force a page reload to update the UI
            window.location.reload();
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

    return (
        <AppShell.Header>
            <Group h="100%" px="md" justify="space-between">
                <Group>
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    <Button
                        variant="subtle"
                        onClick={() => router.push('/')}
                        size="sm"
                    >
                        Back to Dashboard
                    </Button>
                </Group>

                <Group>
                    <ActionIcon
                        variant="default"
                        onClick={toggleTheme}
                        size="lg"
                        aria-label="Toggle color scheme"
                    >
                        {isDarkMode ? (
                            <IconSun size="1.2rem" stroke={1.5} />
                        ) : (
                            <IconMoonStars size="1.2rem" stroke={1.5} />
                        )}
                    </ActionIcon>

                    <Menu
                        width={260}
                        position="bottom-end"
                        transitionProps={{ transition: 'pop-top-right' }}
                        onClose={() => setUserMenuOpened(false)}
                        onOpen={() => setUserMenuOpened(true)}
                        withinPortal
                    >
                        <Menu.Target>
                            <UnstyledButton style={{ cursor: 'pointer' }} onClick={handleNameClick}>
                                <Group gap={8}>
                                    <Avatar radius="xl" color="violet" size={32}>
                                        {getInitials(user?.name)}
                                    </Avatar>
                                    <Text size="sm" fw={500}>{user?.name}</Text>
                                </Group>
                            </UnstyledButton>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item onClick={handleNameClick}>
                                Edit Profile
                            </Menu.Item>
                            <Menu.Item onClick={() => signOut()}>
                                Logout
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Group>

            <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Edit Profile" centered>
                <TextInput
                    label="Name"
                    value={editName}
                    onChange={(e) => setEditName(e.currentTarget.value)}
                    mb="md"
                />
                <Button onClick={handleSave} loading={saving} fullWidth mb="md">
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
                <Button onClick={handleChangePassword} loading={changingPassword} fullWidth color="violet">
                    Change Password
                </Button>
            </Modal>
        </AppShell.Header>
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