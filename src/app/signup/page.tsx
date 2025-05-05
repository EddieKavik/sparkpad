"use client";
import { useState } from "react";
import {
    TextInput,
    PasswordInput,
    Button,
    Box,
    Title,
    Paper,
    Stack,
    Group,
    Text,
    Center,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconSparkles } from "@tabler/icons-react";

async function encryptPassword(password: string): Promise<string> {
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
}

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const encryptedPassword = await encryptPassword(password);
            const res = await fetch(
                "http://localhost:3333/users?mode=volatile&key=" + encodeURIComponent(email),
                {
                    method: "POST",
                    body: encryptedPassword,
                }
            );
            if (!res.ok) throw new Error((await res.json()).message || "Registration failed");
            showNotification({
                title: "Success",
                message: "Registration successful!",
                color: "green",
            });
            setEmail("");
            setPassword("");
        } catch (err: any) {
            showNotification({
                title: "Error",
                message: err.message || "Registration failed.",
                color: "red",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)" }}>
            <Center style={{ minHeight: "100vh" }}>
                <Paper shadow="xl" radius="lg" p={32} withBorder style={{ minWidth: 350, maxWidth: 400, width: "100%" }}>
                    <Stack align="center" mb="md">
                        <IconSparkles size={40} color="#7950f2" />
                        <Title order={2} style={{ fontWeight: 800, letterSpacing: -1 }}>Sign Up for SparkPad</Title>
                        <Text c="dimmed" size="sm" ta="center">
                            Create your account to start sparking ideas!
                        </Text>
                    </Stack>
                    <form onSubmit={handleSubmit}>
                        <Stack>
                            <TextInput
                                label="Email"
                                placeholder="you@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.currentTarget.value)}
                                required
                                autoComplete="email"
                                size="md"
                                radius="md"
                            />
                            <PasswordInput
                                label="Password"
                                placeholder="Your password"
                                value={password}
                                onChange={(e) => setPassword(e.currentTarget.value)}
                                required
                                autoComplete="new-password"
                                size="md"
                                radius="md"
                            />
                            <Button type="submit" loading={loading} size="md" radius="md" fullWidth gradient={{ from: 'indigo', to: 'violet', deg: 90 }}>
                                Register
                            </Button>
                        </Stack>
                    </form>
                </Paper>
            </Center>
        </Box>
    );
} 