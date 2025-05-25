import React from 'react';
import { Tabs, Paper, Text } from '@mantine/core';
import AIRiskAlerts from './AIRiskAlerts';
import AIProjectHealthScore from './AIProjectHealthScore';
import AISentimentInsights from './AISentimentInsights';
import AIWorkflowAutomation from './AIWorkflowAutomation';
import AskAI from './AskAI';

const context = "Project: SparkPad\nMembers: Alice, Bob, Carol\nTasks: 12 open, 5 in progress, 2 overdue\nFiles: 20 uploaded\nRecent Activity: Bob completed 'Design UI', Carol commented on 'Setup API'";

export default function AIInsightsPanel() {
    return (
        <Paper p="lg" radius={20} shadow="xl" withBorder style={{ background: '#f8fafd', margin: '32px 0', minWidth: 340 }}>
            <Text fw={800} size="xl" mb={16} style={{ letterSpacing: 0.5, color: '#23243a' }}>
                AI Insights
            </Text>
            <Tabs defaultValue="risks" color="blue" variant="pills" radius="md">
                <Tabs.List grow>
                    <Tabs.Tab value="risks">Risk Alerts</Tabs.Tab>
                    <Tabs.Tab value="health">Project Health</Tabs.Tab>
                    <Tabs.Tab value="sentiment">Sentiment</Tabs.Tab>
                    <Tabs.Tab value="workflow">Workflow</Tabs.Tab>
                    <Tabs.Tab value="ask">Ask AI</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="risks" pt="md">
                    <AIRiskAlerts context={context} />
                </Tabs.Panel>
                <Tabs.Panel value="health" pt="md">
                    <AIProjectHealthScore context={context} />
                </Tabs.Panel>
                <Tabs.Panel value="sentiment" pt="md">
                    <AISentimentInsights context={context} />
                </Tabs.Panel>
                <Tabs.Panel value="workflow" pt="md">
                    <AIWorkflowAutomation context={context} />
                </Tabs.Panel>
                <Tabs.Panel value="ask" pt="md">
                    <AskAI context={context} />
                </Tabs.Panel>
            </Tabs>
        </Paper>
    );
} 