"use client";
import { IconRobot, IconSparkles, IconUsers } from "@tabler/icons-react";
import Image from "next/image";
import { useState } from "react";

export default function About() {
    const [showAssistant, setShowAssistant] = useState(false);
    return (
        <main style={{ width: '100vw', minHeight: '100vh', background: 'linear-gradient(135deg, #e3f0ff 0%, #f5f7fa 100%)', padding: 0, margin: 0, position: 'relative' }}>
            {/* AI Assistant Floating Button */}
            <button
                onClick={() => setShowAssistant(true)}
                style={{
                    position: 'fixed',
                    bottom: 32,
                    right: 32,
                    zIndex: 1000,
                    background: '#1769aa',
                    border: 'none',
                    borderRadius: '50%',
                    width: 64,
                    height: 64,
                    boxShadow: '0 4px 24px #b3c6e6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                }}
                aria-label="Open AI Assistant"
            >
                <IconRobot size={36} color="#fff" />
            </button>
            {/* AI Assistant Modal */}
            {showAssistant && (
                <div style={{
                    position: 'fixed',
                    bottom: 110,
                    right: 32,
                    zIndex: 1100,
                    background: '#fff',
                    borderRadius: 24,
                    boxShadow: '0 8px 32px #b3c6e6',
                    padding: 32,
                    minWidth: 320,
                    maxWidth: 400,
                    animation: 'fadeIn 0.3s',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                        <IconRobot size={32} color="#1769aa" style={{ marginRight: 12 }} />
                        <h3 style={{ color: '#1769aa', fontWeight: 700, fontSize: 22, margin: 0 }}>Hi, I'm Spark!</h3>
                    </div>
                    <p style={{ color: '#5c5f66', fontSize: 16, marginBottom: 16 }}>
                        Welcome to SparkPad! Ask me anything about our company, team, or vision. ✨
                    </p>
                    <button onClick={() => setShowAssistant(false)} style={{ background: '#1769aa', color: '#fff', border: 'none', borderRadius: 16, padding: '8px 20px', fontWeight: 600, cursor: 'pointer' }}>Close</button>
                </div>
            )}
            {/* Hero Section */}
            <section style={{ width: '100%', padding: '80px 0 40px 0', textAlign: 'center', background: '#fff', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, width: 180, height: 180, opacity: 0.12 }}>
                    <Image src="/globe.svg" alt="Globe" width={180} height={180} />
                </div>
                <h1 style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: 2, marginBottom: 16, color: '#1769aa' }}>About SparkPad</h1>
                <p style={{ color: '#5c5f66', fontSize: 20, maxWidth: 900, margin: '0 auto 32px' }}>
                    SparkPad was founded to empower teams with the tools of tomorrow. Our mission is to make collaboration effortless, intelligent, and inspiring for every organization.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 32 }}>
                    <IconSparkles size={48} color="#1769aa" />
                    <IconUsers size={48} color="#1769aa" />
                </div>
            </section>
            {/* Timeline Section */}
            <section style={{ width: '100%', background: 'linear-gradient(90deg, #e3f0ff 0%, #f5f7fa 100%)', padding: '40px 0', textAlign: 'center' }}>
                <h2 style={{ color: '#1769aa', fontWeight: 700, fontSize: 28, marginBottom: 32 }}>Our Story</h2>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 48, flexWrap: 'wrap', maxWidth: 1000, margin: '0 auto' }}>
                    <div style={{ flex: 1, minWidth: 220, background: '#fff', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee', padding: 32, margin: 12, transition: 'transform 0.2s', cursor: 'pointer' }}>
                        <h3 style={{ color: '#1769aa', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>2019</h3>
                        <p style={{ color: '#5c5f66', fontSize: 16 }}>SparkPad is born from a vision to make teamwork smarter and more inspiring.</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 220, background: '#fff', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee', padding: 32, margin: 12, transition: 'transform 0.2s', cursor: 'pointer' }}>
                        <h3 style={{ color: '#1769aa', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>2021</h3>
                        <p style={{ color: '#5c5f66', fontSize: 16 }}>AI-driven features launch, setting SparkPad apart as a leader in executive productivity.</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 220, background: '#fff', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee', padding: 32, margin: 12, transition: 'transform 0.2s', cursor: 'pointer' }}>
                        <h3 style={{ color: '#1769aa', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>2023</h3>
                        <p style={{ color: '#5c5f66', fontSize: 16 }}>SparkPad expands globally, empowering teams in 30+ countries.</p>
                    </div>
                </div>
            </section>
            {/* Mission & Vision Section */}
            <section style={{ width: '100%', background: '#fff', padding: '40px 0', textAlign: 'center' }}>
                <h2 style={{ color: '#1769aa', fontWeight: 700, fontSize: 28, marginBottom: 16 }}>Our Mission</h2>
                <p style={{ color: '#5c5f66', fontSize: 18, maxWidth: 800, margin: '0 auto 32px' }}>
                    To revolutionize productivity and teamwork with AI-driven solutions that are as beautiful as they are powerful.
                </p>
                <h2 style={{ color: '#1769aa', fontWeight: 700, fontSize: 28, marginBottom: 16 }}>Our Vision</h2>
                <p style={{ color: '#5c5f66', fontSize: 18, maxWidth: 800, margin: '0 auto 32px' }}>
                    To be the world's most trusted platform for executive collaboration and innovation.
                </p>
            </section>
            {/* Team Section */}
            <section style={{ width: '100%', background: 'linear-gradient(90deg, #e3f0ff 0%, #f5f7fa 100%)', padding: '40px 0', textAlign: 'center' }}>
                <h2 style={{ color: '#1769aa', fontWeight: 700, fontSize: 28, marginBottom: 16 }}>Our Team</h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap', maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ flex: 1, minWidth: 220, background: '#fff', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee', padding: 32, margin: 12, transition: 'transform 0.2s', cursor: 'pointer' }}>
                        <Image src="/file.svg" alt="Jane Doe" width={48} height={48} style={{ marginBottom: 12 }} />
                        <h3 style={{ color: '#1769aa', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Jane Doe</h3>
                        <p style={{ color: '#5c5f66', fontSize: 16 }}>CEO & Founder</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 220, background: '#fff', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee', padding: 32, margin: 12, transition: 'transform 0.2s', cursor: 'pointer' }}>
                        <Image src="/window.svg" alt="John Smith" width={48} height={48} style={{ marginBottom: 12 }} />
                        <h3 style={{ color: '#1769aa', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>John Smith</h3>
                        <p style={{ color: '#5c5f66', fontSize: 16 }}>CTO & Product Lead</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 220, background: '#fff', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee', padding: 32, margin: 12, transition: 'transform 0.2s', cursor: 'pointer' }}>
                        <Image src="/globe.svg" alt="Alex Lee" width={48} height={48} style={{ marginBottom: 12 }} />
                        <h3 style={{ color: '#1769aa', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Alex Lee</h3>
                        <p style={{ color: '#5c5f66', fontSize: 16 }}>Head of AI</p>
                    </div>
                </div>
            </section>
        </main>
    );
} 