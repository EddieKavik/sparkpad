"use client";
import { motion } from "framer-motion";
import { IconSparkles, IconRobot, IconMessage, IconTag, IconUsers } from "@tabler/icons-react";
import { EmblaCarousel } from "../components/EmblaCarousel";
import Link from "next/link";
import AIInsightsPanel from '../../src/components/AIInsightsPanel';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#181c2b] via-[#23243a] to-[#2e254d] text-white relative overflow-x-hidden">
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
        <motion.h1
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-blue-300 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-lg"
        >
          Sparkpad
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mt-6 text-xl md:text-2xl font-medium text-blue-200 max-w-2xl mx-auto"
        >
          Welcome 2090: The Future of AI-Powered Productivity & Collaboration
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-10 w-full max-w-3xl"
        >
          <EmblaCarousel />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-12"
        >
          <Link href="/login">
            <button className="px-10 py-4 rounded-full bg-gradient-to-r from-fuchsia-600 via-violet-600 to-blue-600 text-white font-bold text-lg shadow-xl hover:scale-105 hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-300">
              Get Started with Sparkpad
            </button>
          </Link>
        </motion.div>
      </section>

      {/* Unified AI Insights Panel */}
      <section className="relative z-10 max-w-4xl mx-auto px-4">
        <AIInsightsPanel />
      </section>

      {/* Product Introduction */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <motion.h2
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-3xl md:text-4xl font-bold mb-4 text-violet-300"
          >
            What is Sparkpad?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-blue-100 mb-6"
          >
            Sparkpad is your all-in-one, AI-powered workspace for notes, chat, tagging, and collaboration. Experience the next generation of productivity with real-time AI assistance, futuristic design, and seamless teamwork.
          </motion.p>
          <ul className="space-y-4">
            <li className="flex items-center gap-3 text-blue-200"><IconSparkles className="text-fuchsia-400" size={28} /> AI-Driven Note-Taking & Organization</li>
            <li className="flex items-center gap-3 text-blue-200"><IconMessage className="text-blue-400" size={28} /> Real-Time Team Chat & Collaboration</li>
            <li className="flex items-center gap-3 text-blue-200"><IconTag className="text-violet-400" size={28} /> Smart Tagging & Knowledge Management</li>
            <li className="flex items-center gap-3 text-blue-200"><IconRobot className="text-cyan-400" size={28} /> Built-in AI Assistant for Every Task</li>
            <li className="flex items-center gap-3 text-blue-200"><IconUsers className="text-green-400" size={28} /> Effortless Sharing & Teamwork</li>
          </ul>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center justify-center"
        >
          {/* Futuristic AI Demo/Avatar Placeholder */}
          <div className="w-64 h-64 rounded-3xl bg-gradient-to-br from-blue-900 via-fuchsia-800 to-violet-900 shadow-2xl flex items-center justify-center relative overflow-hidden animate-pulse">
            <IconRobot size={120} className="text-fuchsia-300 drop-shadow-lg animate-bounce-slow" />
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-blue-200 text-lg font-semibold tracking-wide">Meet SparkAI</span>
    </div>
        </motion.div>
      </section>
    </main>
  );
}
