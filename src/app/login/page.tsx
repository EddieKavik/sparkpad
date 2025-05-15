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
    Text,
    Center,
    rem,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconLogin2, IconBrandGoogle, IconBrandTwitter, IconBrandFacebook, IconBrandLinkedin } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

function uint8ToBase64(uint8: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
}

async function encryptPassword(password: string, saltB64: string): Promise<string> {
    // Decode base64 salt
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
    return uint8ToBase64(combined);
}

function extractSaltFromEncrypted(encrypted: string): string {
    try {
        // The salt is the first 16 bytes (base64-encoded)
        const bytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
        const salt = bytes.slice(0, 16);
        return btoa(String.fromCharCode(...salt));
    } catch (err) {
        console.error('Failed to extract salt from encrypted password. Value:', encrypted, err);
        if (typeof window !== 'undefined' && window?.showNotification) {
            showNotification({
                title: 'Error',
                message: 'Corrupted password data. Please re-register.',
                color: 'red',
            });
        }
        throw new Error('Corrupted password data. Please re-register.');
    }
}

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Fetch encrypted password from Civil Memory
            const res = await fetch(
                "http://localhost:3333/users?mode=disk&key=" + encodeURIComponent("user:" + email)
            );
            if (!res.ok) throw new Error("Invalid email or password");
            const encryptedPassword = await res.text();
            let saltB64;
            try {
                saltB64 = extractSaltFromEncrypted(encryptedPassword);
            } catch (err) {
                showNotification({
                    title: 'Error',
                    message: 'Stored password is corrupted. Please re-register.',
                    color: 'red',
                });
                setLoading(false);
                return;
            }
            // Encrypt entered password with extracted salt
            let encryptedInput;
            try {
                encryptedInput = await encryptPassword(password, saltB64);
            } catch (err) {
                console.error('Failed to encrypt input password', err);
                showNotification({
                    title: 'Error',
                    message: 'Password encryption failed. Please try again.',
                    color: 'red',
                });
                setLoading(false);
                return;
            }
            if (encryptedInput !== encryptedPassword) throw new Error("Invalid email or password");
            // Simulate token and user object
            const token = "dummy-token";
            const user = { name: email.split("@")[0] };
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("user:username", email);
            showNotification({
                title: "Success",
                message: "Login successful!",
                color: "green",
            });
            router.push("/projects");
        } catch (err: any) {
            showNotification({
                title: "Error",
                message: err.message || "Login failed.",
                color: "red",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            style={{
                minHeight: "100vh",
                background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)",
                padding: rem(16),
            }}
        >
            <Center style={{ minHeight: "100vh" }}>
                <Paper
                    shadow="xl"
                    radius="lg"
                    p="lg"
                    withBorder
                    style={{
                        width: "100%",
                        maxWidth: 400,
                        minWidth: 0,
                        background: "rgba(255,255,255,0.95)",
                        border: "1px solid #e0e7ff",
                    }}
                >
                    <Stack align="center" mb="md" gap="xs">
                        <IconLogin2 size={40} color="#7950f2" />
                        <Title order={2} style={{ fontWeight: 800, letterSpacing: -1, fontSize: rem(28) }}>
                            Log In to SparkPad
                        </Title>
                        <Text c="dimmed" size="sm" ta="center">
                            Welcome back! Please enter your credentials.
                        </Text>
                    </Stack>
                    {/* Social login buttons */}
                    <Stack gap="xs" mb="md">
                        <Button
                            leftSection={<IconBrandGoogle size={18} />}
                            variant="default"
                            fullWidth
                            onClick={() => signIn("google")}
                        >
                            Continue with Google
                        </Button>
                        <Button
                            leftSection={<IconBrandTwitter size={18} />}
                            variant="default"
                            fullWidth
                            onClick={() => signIn("twitter")}
                        >
                            Continue with Twitter/X
                        </Button>
                        <Button
                            leftSection={<IconBrandFacebook size={18} />}
                            variant="default"
                            fullWidth
                            onClick={() => signIn("facebook")}
                        >
                            Continue with Facebook
                        </Button>
                        <Button
                            leftSection={<IconBrandLinkedin size={18} />}
                            variant="default"
                            fullWidth
                            onClick={() => signIn("linkedin")}
                        >
                            Continue with LinkedIn
                        </Button>
                    </Stack>
                    <form onSubmit={handleSubmit}>
                        <Stack gap="md">
                            <TextInput
                                label="Email"
                                placeholder="you@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.currentTarget.value)}
                                required
                                autoComplete="email"
                                size="md"
                                radius="md"
                                withAsterisk
                                styles={{
                                    input: { fontSize: rem(16) },
                                    label: { fontWeight: 600 },
                                }}
                            />
                            <PasswordInput
                                label="Password"
                                placeholder="Your password"
                                value={password}
                                onChange={(e) => setPassword(e.currentTarget.value)}
                                required
                                autoComplete="current-password"
                                size="md"
                                radius="md"
                                withAsterisk
                                styles={{
                                    input: { fontSize: rem(16) },
                                    label: { fontWeight: 600 },
                                }}
                            />
                            <Button
                                type="submit"
                                loading={loading}
                                size="md"
                                radius="md"
                                fullWidth
                                gradient={{ from: "indigo", to: "violet", deg: 90 }}
                                style={{ fontWeight: 700, fontSize: rem(16) }}
                            >
                                Log In
                            </Button>
                        </Stack>
                    </form>
                    <Button
                        variant="subtle"
                        color="violet"
                        fullWidth
                        mt="md"
                        onClick={() => router.push("/signup")}
                    >
                        Sign Up
                    </Button>
                </Paper>
            </Center>
        </Box>
    );
} 