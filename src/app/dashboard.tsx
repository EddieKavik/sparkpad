"use client";
import { motion } from "framer-motion";
import { IconSparkles, IconRobot, IconMessage, IconTag, IconUsers, IconRocket } from "@tabler/icons-react";
import { EmblaCarousel } from "../components/EmblaCarousel";
import Link from "next/link";
import AskAI from '../components/AskAI';
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/projects");
    }, [router]);
    return null;
} 