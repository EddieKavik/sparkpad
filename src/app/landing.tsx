"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/contexts/ThemeContext";
import { IconRocket, IconRobot, IconUsers, IconTag, IconSparkles } from "@tabler/icons-react";

function AnimatedSVGBackground() {
    return (
        <svg className="animated-svg-bg" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="glow1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%" gradientTransform="rotate(45)">
                    <stop offset="0%" stopColor="#0a0a1a" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#181c2b" stopOpacity="0.1" />
                </radialGradient>
                <radialGradient id="glow2" cx="50%" cy="50%" r="50%" fx="50%" fy="50%" gradientTransform="rotate(90)">
                    <stop offset="0%" stopColor="#23243a" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#0a0a1a" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="400" cy="300" r="320" fill="url(#glow1)" />
            <circle cx="1600" cy="800" r="260" fill="url(#glow2)" />
            <rect x="900" y="100" width="120" height="120" rx="32" fill="#181c2b" opacity="0.12">
                <animateTransform attributeName="transform" type="rotate" from="0 960 160" to="360 960 160" dur="18s" repeatCount="indefinite" />
            </rect>
            <rect x="200" y="700" width="80" height="80" rx="20" fill="#23243a" opacity="0.10">
                <animateTransform attributeName="transform" type="rotate" from="0 240 740" to="360 240 740" dur="24s" repeatCount="indefinite" />
            </rect>
        </svg>
    );
}

function OnboardingModal({ open, onClose }: { open: boolean, onClose: () => void }) {
    if (!open) return null;
    return (
        <div className="onboarding-modal glass-strong" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(24,28,43,0.85)', zIndex: 10000 }}>
            <div>
                <h2 className="holo-strong">Welcome to Sparkpad</h2>
                <p style={{ color: '#b0b7ff', fontSize: 18, marginBottom: 24 }}>Experience the future of collaboration.<br />Organize, create, and innovate with Sparkpad's AI-powered workspace.</p>
                <button className="futuristic-btn" onClick={onClose}>Let&apos;s Go!</button>
            </div>
        </div>
    );
}

export default function Landing() {
    const { theme } = useTheme();
    const [showOnboarding, setShowOnboarding] = useState(false);
    useEffect(() => {
        if (typeof window !== "undefined" && !window.localStorage.getItem("sparkpadOnboarded")) {
            setShowOnboarding(true);
        }
    }, []);
    const handleCloseOnboarding = () => {
        setShowOnboarding(false);
        if (typeof window !== "undefined") {
            window.localStorage.setItem("sparkpadOnboarded", "1");
        }
    };
    return (
        <main style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: '#f5f7fa', fontFamily: 'Inter, Roboto, Arial, sans-serif', color: '#1a1b1e' }}>
            <section style={{ paddingTop: 120, paddingBottom: 80, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: 2, marginBottom: 16, color: '#1769aa' }}>Sparkpad</h1>
                <h2 style={{ fontSize: '1.7rem', fontWeight: 600, marginBottom: 32, letterSpacing: 1, color: '#1769aa' }}>
                    Welcome: Executive Collaboration
                </h2>
                <div style={{ maxWidth: 700, margin: '0 auto', marginBottom: 48 }}>
                    <div style={{ padding: 32, borderRadius: 32, boxShadow: '0 8px 32px #e3e8ee', background: '#fff', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
                            <div style={{ flex: 1 }}>
                                <IconRocket size={64} style={{ color: '#1769aa' }} />
                                <h3 style={{ fontWeight: 700, fontSize: 24, margin: '16px 0 8px', color: '#1769aa' }}>Lightning Fast</h3>
                                <p style={{ color: '#5c5f66', fontSize: 16 }}>Instant project creation, real-time sync, and blazing speed for your workflow.</p>
                            </div>
                            <div style={{ flex: 1 }}>
                                <IconRobot size={64} style={{ color: '#1769aa' }} />
                                <h3 style={{ fontWeight: 700, fontSize: 24, margin: '16px 0 8px', color: '#1769aa' }}>AI-Powered</h3>
                                <p style={{ color: '#5c5f66', fontSize: 16 }}>Smart suggestions, AI chat, and intelligent tagging to supercharge your team.</p>
                            </div>
                            <div style={{ flex: 1 }}>
                                <IconUsers size={64} style={{ color: '#1769aa' }} />
                                <h3 style={{ fontWeight: 700, fontSize: 24, margin: '16px 0 8px', color: '#1769aa' }}>Seamless Collaboration</h3>
                                <p style={{ color: '#5c5f66', fontSize: 16 }}>Effortless teamwork, live editing, and secure sharing for the next era.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <Link href="/login">
                    <button style={{ marginTop: 32, fontSize: '1.3rem', background: '#1769aa', color: '#fff', borderRadius: 24, padding: '16px 40px', fontWeight: 700, border: 'none', boxShadow: '0 2px 12px #e3e8ee' }}>
                        Get Started with Sparkpad
                    </button>
                </Link>
            </section>
            <section style={{ textAlign: 'center', zIndex: 1 }}>
                <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 24, color: '#1769aa' }}>What is Sparkpad?</h2>
                <p style={{ color: '#5c5f66', fontSize: 20, maxWidth: 700, margin: '0 auto 32px' }}>
                    Sparkpad is your all-in-one executive workspace, designed for innovators, creators, and teams who want to work at the speed of tomorrow. Organize, collaborate, and create with AI-powered tools, real-time sync, and a stunning interface that feels like the future.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 220, margin: 12, padding: 32, background: '#fff', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee' }}>
                        <IconSparkles size={48} style={{ color: '#1769aa' }} />
                        <h3 style={{ fontWeight: 700, fontSize: 20, margin: '16px 0 8px', color: '#1769aa' }}>Next-Gen UI</h3>
                        <p style={{ color: '#5c5f66', fontSize: 16 }}>A visually stunning, intuitive interface that inspires productivity and creativity.</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 220, margin: 12, padding: 32, background: '#fff', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee' }}>
                        <IconTag size={48} style={{ color: '#1769aa' }} />
                        <h3 style={{ fontWeight: 700, fontSize: 20, margin: '16px 0 8px', color: '#1769aa' }}>Smart Tagging</h3>
                        <p style={{ color: '#5c5f66', fontSize: 16 }}>Organize everything with intelligent tags and instant search.</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 220, margin: 12, padding: 32, background: '#fff', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee' }}>
                        <IconUsers size={48} style={{ color: '#1769aa' }} />
                        <h3 style={{ fontWeight: 700, fontSize: 20, margin: '16px 0 8px', color: '#1769aa' }}>Team-Ready</h3>
                        <p style={{ color: '#5c5f66', fontSize: 16 }}>Built for teams of any size, with secure sharing and real-time updates.</p>
                    </div>
                </div>
            </section>
        </main>
    );
} 