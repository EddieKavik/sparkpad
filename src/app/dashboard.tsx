"use client";
import { motion } from "framer-motion";
import { IconSparkles, IconRobot, IconMessage, IconTag, IconUsers, IconRocket } from "@tabler/icons-react";
import { EmblaCarousel } from "../components/EmblaCarousel";
import Link from "next/link";
import AskAI from '../components/AskAI';

export default function Dashboard() {
    return (
        <>
            <AskAI />
        <main className="min-h-screen bg-[#f5f7fa] text-[#1a1b1e] font-sans relative overflow-x-hidden">
            {/* Creative Icon Button for 2090 Landing Page */}
            <a
                href="/landing"
                target="_blank"
                rel="noopener noreferrer"
                title="Visit the 2090 Landing Page"
                className="fixed top-6 right-8 z-50 p-3 rounded-full bg-white shadow-lg hover:scale-110 transition-transform border-2 border-blue-200 hover:border-blue-400"
            >
                <IconRocket size={32} className="text-[#1769aa]" />
            </a>
            {/* Animated Futuristic Glow Background */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.5, scale: 1 }}
                    transition={{ duration: 2 }}
                    className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-gradient-to-r from-violet-600 via-blue-500 to-fuchsia-500 blur-3xl opacity-40 rounded-full"
                />
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 0.2, y: 0 }}
                    transition={{ duration: 2, delay: 0.5 }}
                    className="absolute bottom-[-10%] right-0 w-[40vw] h-[40vw] bg-gradient-to-tr from-fuchsia-500 via-blue-500 to-violet-600 blur-2xl opacity-30 rounded-full"
                />
            </div>

            {/* Hero Section */}
            <section className="relative z-10 flex flex-col items-center justify-center pt-32 pb-16 text-center">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[#1769aa] drop-shadow-lg">Sparkpad</h1>
                <p className="mt-6 text-xl md:text-2xl font-medium text-[#1769aa] max-w-2xl mx-auto">
                    Welcome to Sparkpad: Executive AI-Powered Productivity & Collaboration
                </p>
                <div className="mt-10 w-full max-w-3xl">
                    <EmblaCarousel />
                </div>
                <div className="mt-12">
                    <Link href="/login">
                        <button className="px-10 py-4 rounded-full bg-[#1769aa] text-white font-bold text-lg shadow-xl hover:scale-105 hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-400">
                            Get Started with Sparkpad
                        </button>
                    </Link>
                </div>
            </section>

            {/* Product Introduction */}
            <section className="relative z-10 max-w-5xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#1769aa]">What is Sparkpad?</h2>
                    <p className="text-lg text-[#5c5f66] mb-6">
                        Sparkpad is your all-in-one, AI-powered workspace for notes, chat, tagging, and collaboration. Experience the next generation of productivity with real-time AI assistance, executive design, and seamless teamwork.
                    </p>
                    <ul className="space-y-4">
                        <li className="flex items-center gap-3 text-[#1769aa]"><IconSparkles className="text-[#1769aa]" size={28} /> AI-Driven Note-Taking & Organization</li>
                        <li className="flex items-center gap-3 text-[#1769aa]"><IconMessage className="text-[#1769aa]" size={28} /> Real-Time Team Chat & Collaboration</li>
                        <li className="flex items-center gap-3 text-[#1769aa]"><IconTag className="text-[#1769aa]" size={28} /> Smart Tagging & Knowledge Management</li>
                        <li className="flex items-center gap-3 text-[#1769aa]"><IconRobot className="text-[#1769aa]" size={28} /> Built-in AI Assistant for Every Task</li>
                        <li className="flex items-center gap-3 text-[#1769aa]"><IconUsers className="text-[#1769aa]" size={28} /> Effortless Sharing & Teamwork</li>
                    </ul>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <div className="w-64 h-64 rounded-3xl bg-white shadow-2xl flex items-center justify-center relative overflow-hidden">
                        <IconRobot size={120} className="text-[#1769aa] drop-shadow-lg" />
                        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[#1769aa] text-lg font-semibold tracking-wide">Meet SparkAI</span>
                    </div>
                </div>
            </section>
        </main>
        </>
    );
} 