"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

const Landing = dynamic(() => import("./landing"), { ssr: false });

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const loggedIn = !!localStorage.getItem("token");
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        router.replace("/dashboard");
      }
    }
  }, [router]);

  if (isLoggedIn === null) return null; // or a loading spinner
  return !isLoggedIn ? (
    <main style={{ width: '100vw', minHeight: '100vh', background: '#f5f7fa', padding: 0, margin: 0 }}>
      <section style={{ width: '100%', padding: '80px 0 40px 0', textAlign: 'center', background: '#f5f7fa' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: 2, marginBottom: 16, color: '#1769aa' }}>Welcome to Sparkpad</h1>
        <h2 style={{ fontSize: '1.7rem', fontWeight: 600, marginBottom: 32, letterSpacing: 1, color: '#1769aa' }}>
          The Executive AI Workspace for Modern Teams
        </h2>
        <p style={{ color: '#5c5f66', fontSize: 22, maxWidth: 900, margin: '0 auto 32px' }}>
          Sparkpad is your all-in-one platform for project management, collaboration, and AI-powered productivity. Organize, create, and innovate with a workspace designed for the future.
        </p>
        <Link href="/login">
          <button style={{ marginTop: 32, fontSize: '1.3rem', background: '#1769aa', color: '#fff', borderRadius: 24, padding: '16px 40px', fontWeight: 700, border: 'none', boxShadow: '0 2px 12px #e3e8ee', cursor: 'pointer' }}>
            Login to Dashboard
          </button>
        </Link>
      </section>
      <section style={{ width: '100%', background: '#fff', padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 48, maxWidth: 1400, width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, background: '#f5f7fa', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee', padding: 32, margin: 12 }}>
            <h3 style={{ color: '#1769aa', fontWeight: 700, fontSize: 24, marginBottom: 12 }}>AI-Driven Project Management</h3>
            <p style={{ color: '#5c5f66', fontSize: 16 }}>Automate, organize, and track your projects with smart suggestions and real-time insights.</p>
          </div>
          <div style={{ flex: 1, minWidth: 260, background: '#f5f7fa', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee', padding: 32, margin: 12 }}>
            <h3 style={{ color: '#1769aa', fontWeight: 700, fontSize: 24, marginBottom: 12 }}>Seamless Collaboration</h3>
            <p style={{ color: '#5c5f66', fontSize: 16 }}>Chat, share files, and work together in real time—wherever your team is.</p>
          </div>
          <div style={{ flex: 1, minWidth: 260, background: '#f5f7fa', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee', padding: 32, margin: 12 }}>
            <h3 style={{ color: '#1769aa', fontWeight: 700, fontSize: 24, marginBottom: 12 }}>Executive Insights</h3>
            <p style={{ color: '#5c5f66', fontSize: 16 }}>Get clear, actionable analytics and AI-powered recommendations for your business.</p>
          </div>
        </div>
      </section>
    </main>
  ) : null;
}
