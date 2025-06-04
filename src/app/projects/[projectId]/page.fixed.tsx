"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Container, Title, Tabs, Box, Text, Loader, Center, Group, TextInput, Button, Stack, Modal, ActionIcon, rem, Menu, Avatar, Paper, MultiSelect, Textarea, Badge, Divider, Select } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconSettings, IconDots, IconTrash, IconArrowLeft, IconSend, IconFile, IconMoodSmile, IconRobot, IconEdit, IconSparkles, IconChevronDown, IconChevronUp, IconDownload, IconUpload } from "@tabler/icons-react";
import { getGeminiClient } from "@/utils/gemini";
import { useTheme } from '@/contexts/ThemeContext';
import { useMediaQuery } from '@mantine/hooks';
import { useDisclosure } from '@mantine/hooks';
import ReactMarkdown from 'react-markdown';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import FloatingAssistant from '@/components/FloatingAssistant';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { saveAs } from 'file-saver';
import AskAI from '../../../components/AskAI';
import AIInsightsPanel from '../../../components/AIInsightsPanel';
import AISentimentInsights from '../../../components/AISentimentInsights';
import AIWorkflowAutomation from '../../../components/AIWorkflowAutomation';
import AIRiskAlerts from '../../../components/AIRiskAlerts';
import OnboardingAssistant from '../../../components/OnboardingAssistant';
// @ts-ignore
import ProjectDocumentsTab from '../../../components/ProjectDocumentsTab';

// ... existing helper functions, types, and all logic ...
// (Copy all your code up to the return statement, unchanged)

export default function ProjectViewPage() {
    // ... all your state, useEffect, and handler code ...
    // (Copy all your code up to the return statement, unchanged)

    // Build project context for AI
    // ...

    return (
        <>
            <Box style={{ minHeight: '100vh', minWidth: '100vw', background: styles.background, position: 'relative', overflow: 'hidden' }}>
                {/* Futuristic Glow Overlay */}
                <div style={styles.overlay} />
                <Container fluid px={0} py={0} style={{ minWidth: '100vw', minHeight: '100vh', margin: 0 }}>
                    {/* ... all your JSX for the project page ... */}
                    {/* (Paste all the JSX for your tabs, panels, etc. here, as in your original file) */}
                    {/* Make sure all <Box>, <Container>, <Tabs>, and fragment tags are properly closed */}
                </Container>
            </Box>
            <ActionIcon
                variant="light"
                color="gray"
                size={36}
                onClick={() => setSettingsOpened(true)}
                title="Project Settings"
                style={{ marginLeft: rem(12) }}
            >
                <IconSettings size={22} />
            </ActionIcon>
            <FloatingAssistant
                currentTab={activeTab}
                userName={userName}
                projectContext={projectContext}
                onAddTask={(title: string) => {
                    const now = new Date().toISOString();
                    const newTask = {
                        id: Date.now().toString(),
                        title,
                        description: 'Added from AI action item',
                        assignee: '',
                        status: 'todo' as Task['status'],
                        priority: 'medium' as Task['priority'],
                        dueDate: '',
                        createdAt: now,
                        updatedAt: now,
                    };
                    saveTasks([...tasks, newTask]);
                    showNotification({ title: 'Task Added', message: `Task "${title}" added from AI action item.`, color: 'green' });
                }}
            />
        </>
    );
} 