"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Group, Button, Title, Box, Text, Modal, TextInput, Card, Stack, Loader, Badge, Textarea } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import Link from "next/link";
import { NavigationBar } from "@/components/NavigationBar";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/contexts/ThemeContext";
import { IconRocket, IconUserPlus, IconBell, IconSearch, IconStar, IconRobot, IconUsersGroup, IconSparkles, IconUsers, IconTag } from "@tabler/icons-react";
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';

// Theme-specific styles
const themeStyles = {
  futuristic: {
    background: "linear-gradient(135deg, #181c2b 0%, #23243a 100%)",
    cardBackground: "rgba(24,28,43,0.85)",
    cardBorder: "1.5px solid #3a2e5d77",
    textColor: "#fff",
    secondaryTextColor: "#b0b7ff",
    accentColor: "#7f5fff",
    glowOverlay: {
      background: 'radial-gradient(circle at 80% 20%, #3a2e5d44 0%, transparent 60%), radial-gradient(circle at 20% 80%, #232b4d44 0%, transparent 60%)',
      filter: 'blur(48px)',
    },
    buttonGradient: { from: '#232b4d', to: '#3a2e5d', deg: 90 },
    cardShadow: '0 8px 32px 0 #232b4d44',
    modalBackground: 'rgba(24,28,43,0.95)',
    inputBackground: 'rgba(35,43,77,0.3)',
    inputBorder: '#3a2e5d77',
    badgeColor: 'violet',
  },
  classic: {
    background: "#f8f9fa",
    cardBackground: "#fff",
    cardBorder: "1px solid #e9ecef",
    textColor: "#1a1b1e",
    secondaryTextColor: "#868e96",
    accentColor: "#228be6",
    glowOverlay: {
      background: 'none',
      filter: 'none',
    },
    buttonGradient: { from: '#228be6', to: '#40c057', deg: 90 },
    cardShadow: '0 2px 8px rgba(0,0,0,0.06)',
    modalBackground: '#fff',
    inputBackground: '#f1f3f5',
    inputBorder: '#e9ecef',
    badgeColor: 'blue',
  },
};

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

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = themeStyles[theme];
  const [userName, setUserName] = useState<string | null>(null);

  // Projects state
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectModal, setProjectModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [invitingMember, setInvitingMember] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState<'active' | 'archived' | 'completed'>('active');
  const [newProjectTags, setNewProjectTags] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      router.replace("/login");
    } else {
      try {
        const parsed = JSON.parse(user);
        setUserName(parsed.name || null);
      } catch {
        setUserName(null);
      }
    }
    fetchProjects();
    if (typeof window !== "undefined" && !window.localStorage.getItem("sparkpadOnboarded")) {
      setShowOnboarding(true);
    }
    // eslint-disable-next-line
  }, [router]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const userEmail = localStorage.getItem("user:username");
      if (!userEmail) {
        router.replace("/login");
        return;
      }
      const res = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      // Only show projects where the user is a member
      const filtered = Array.isArray(data)
        ? data.filter(
          (project) =>
            Array.isArray(project.members) &&
            userEmail &&
            project.members.includes(userEmail)
        )
        : [];
      setProjects(filtered);
    } catch (err) {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  const handleCreateProject = async () => {
    setCreatingProject(true);
    try {
      const userEmail = localStorage.getItem("user:username");
      if (!userEmail) {
        router.replace("/login");
        return;
      }
      // Fetch current projects array
      const resGet = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`);
      let projectsArr = [];
      if (resGet.ok) {
        try {
          projectsArr = await resGet.json();
          if (!Array.isArray(projectsArr)) projectsArr = [];
        } catch {
          projectsArr = [];
        }
      }
      // Add new project with members array
      const newProject = {
        id: Date.now().toString(),
        name: newProjectName.trim(),
        description: newProjectDescription.trim(),
        status: newProjectStatus,
        tags: newProjectTags.split(",").map(tag => tag.trim()).filter(Boolean),
        createdAt: new Date().toISOString(),
        members: [userEmail],
      };
      const updatedProjects = [...projectsArr, newProject];
      // Store updated array
      const resSet = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`, {
        method: "POST",
        body: JSON.stringify(updatedProjects),
      });
      if (!resSet.ok) throw new Error("Failed to create project");
      showNotification({ title: "Success", message: "Project created!", color: "green" });
      setProjectModal(false);
      setNewProjectName("");
      setNewProjectDescription("");
      setNewProjectStatus("active");
      setNewProjectTags("");
      fetchProjects();
    } catch (err: any) {
      showNotification({ title: "Error", message: err.message || "Failed to create project", color: "red" });
    } finally {
      setCreatingProject(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !inviteProjectId) {
      showNotification({ title: "Error", message: "Please fill in all fields", color: "red" });
      return;
    }

    setInvitingMember(true);
    try {
      const userEmail = localStorage.getItem("user:username");
      if (!userEmail) {
        router.replace("/login");
        return;
      }

      // Fetch current projects array
      const resGet = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`);
      if (!resGet.ok) throw new Error("Failed to fetch projects");

      const projectsArr = await resGet.json();
      const projectIndex = projectsArr.findIndex((p: any) => p.id === inviteProjectId);

      if (projectIndex === -1) {
        throw new Error("Project not found");
      }

      // Add new member if not already a member
      if (!projectsArr[projectIndex].members.includes(inviteEmail)) {
        projectsArr[projectIndex].members.push(inviteEmail);

        // Update projects
        const resSet = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`, {
          method: "POST",
          body: JSON.stringify(projectsArr),
        });

        if (!resSet.ok) throw new Error("Failed to invite member");

        showNotification({ title: "Success", message: "Member invited successfully!", color: "green" });
        setInviteModal(false);
        setInviteEmail("");
        setInviteProjectId("");
        fetchProjects();
      } else {
        showNotification({ title: "Info", message: "User is already a member of this project", color: "blue" });
      }
    } catch (err: any) {
      showNotification({ title: "Error", message: err.message || "Failed to invite member", color: "red" });
    } finally {
      setInvitingMember(false);
    }
  };

  const handleSearchProjects = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = projects.filter(project =>
      project.name.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query) ||
      project.tags.some((tag: string) => tag.toLowerCase().includes(query))
    );
    setSearchResults(results);
  };

  useEffect(() => {
    handleSearchProjects();
  }, [searchQuery]);

  // Example: Simulate activity feed (replace with real data in production)
  useEffect(() => {
    setActivityFeed([
      { type: 'project', message: 'You created "AI Research Hub"', time: '2m ago', icon: <IconRocket size={18} color="#00f0ff" /> },
      { type: 'member', message: 'Invited Jane Doe to "Design Sprint"', time: '10m ago', icon: <IconUserPlus size={18} color="#ff00e0" /> },
      { type: 'ai', message: 'AI Assistant suggested a new template', time: '1h ago', icon: <IconRobot size={18} color="#00ffae" /> },
      { type: 'star', message: 'You starred "Quantum Project"', time: '3h ago', icon: <IconStar size={18} color="#ffe600" /> },
    ]);
  }, []);

  // Calculate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const teamMembers = Array.from(new Set(projects.flatMap(p => Array.isArray(p.members) ? p.members : []))).length;

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sparkpadOnboarded", "1");
    }
  };

  return (
    <main style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <AnimatedSVGBackground />
      <div className="futuristic-hero-bg" />
      <OnboardingModal open={showOnboarding} onClose={handleCloseOnboarding} />
      <ThemeSwitcher />
      <section className="futuristic-section" style={{ paddingTop: 120, paddingBottom: 80, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <h1 className="holo-text futuristic-shimmer" style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: 2, marginBottom: 16 }}>Sparkpad</h1>
        <h2 className="neon-text futuristic-pulse" style={{ fontSize: '1.7rem', fontWeight: 600, marginBottom: 32, letterSpacing: 1 }}>
          Welcome 2090: The Future of Collaboration
        </h2>
        <div style={{ maxWidth: 700, margin: '0 auto', marginBottom: 48 }}>
          <div className="glass futuristic-3d" style={{ padding: 32, borderRadius: 32, boxShadow: '0 8px 32px #232b4d44', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
              <div className="futuristic-animate" style={{ flex: 1 }}>
                <IconRocket size={64} className="futuristic-icon" />
                <h3 className="holo-text" style={{ fontWeight: 700, fontSize: 24, margin: '16px 0 8px' }}>Lightning Fast</h3>
                <p style={{ color: '#b0b7ff', fontSize: 16 }}>Instant project creation, real-time sync, and blazing speed for your workflow.</p>
              </div>
              <div className="futuristic-animate" style={{ flex: 1, animationDelay: '0.7s' }}>
                <IconRobot size={64} className="futuristic-icon" />
                <h3 className="holo-text" style={{ fontWeight: 700, fontSize: 24, margin: '16px 0 8px' }}>AI-Powered</h3>
                <p style={{ color: '#b0b7ff', fontSize: 16 }}>Smart suggestions, AI chat, and intelligent tagging to supercharge your team.</p>
              </div>
              <div className="futuristic-animate" style={{ flex: 1, animationDelay: '1.4s' }}>
                <IconUsers size={64} className="futuristic-icon" />
                <h3 className="holo-text" style={{ fontWeight: 700, fontSize: 24, margin: '16px 0 8px' }}>Seamless Collaboration</h3>
                <p style={{ color: '#b0b7ff', fontSize: 16 }}>Effortless teamwork, live editing, and secure sharing for the next era.</p>
              </div>
            </div>
          </div>
        </div>
        <Link href="/login">
          <button className="futuristic-btn futuristic-shimmer" style={{ marginTop: 32, fontSize: '1.3rem' }}>
            Get Started with Sparkpad
          </button>
        </Link>
      </section>
      <div className="futuristic-divider" />
      <section className="futuristic-section" style={{ textAlign: 'center', zIndex: 1 }}>
        <h2 className="holo-text" style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 24 }}>What is Sparkpad?</h2>
        <p style={{ color: '#b0b7ff', fontSize: 20, maxWidth: 700, margin: '0 auto 32px' }}>
          Sparkpad is your all-in-one futuristic workspace, designed for innovators, creators, and teams who want to work at the speed of tomorrow. Organize, collaborate, and create with AI-powered tools, real-time sync, and a stunning interface that feels like the future.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          <div className="glass futuristic-animate futuristic-3d" style={{ flex: 1, minWidth: 220, margin: 12, padding: 32 }}>
            <IconSparkles size={48} className="futuristic-icon" />
            <h3 className="holo-text" style={{ fontWeight: 700, fontSize: 20, margin: '16px 0 8px' }}>Next-Gen UI</h3>
            <p style={{ color: '#b0b7ff', fontSize: 16 }}>A visually stunning, intuitive interface that inspires productivity and creativity.</p>
          </div>
          <div className="glass futuristic-animate futuristic-3d" style={{ flex: 1, minWidth: 220, margin: 12, padding: 32 }}>
            <IconTag size={48} className="futuristic-icon" />
            <h3 className="holo-text" style={{ fontWeight: 700, fontSize: 20, margin: '16px 0 8px' }}>Smart Tagging</h3>
            <p style={{ color: '#b0b7ff', fontSize: 16 }}>Organize everything with intelligent tags and instant search.</p>
          </div>
          <div className="glass futuristic-animate futuristic-3d" style={{ flex: 1, minWidth: 220, margin: 12, padding: 32 }}>
            <IconUsers size={48} className="futuristic-icon" />
            <h3 className="holo-text" style={{ fontWeight: 700, fontSize: 20, margin: '16px 0 8px' }}>Team-Ready</h3>
            <p style={{ color: '#b0b7ff', fontSize: 16 }}>Built for teams of any size, with secure sharing and real-time updates.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
