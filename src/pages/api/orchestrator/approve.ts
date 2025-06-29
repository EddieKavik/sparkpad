import type { NextApiRequest, NextApiResponse } from 'next';
import { getGeminiClient } from '@/utils/gemini';

// Helper to fetch from Civil Memory
async function fetchCivilMemory(key: string) {
  const res = await fetch(`http://localhost:3333/?mode=disk&key=${encodeURIComponent(key)}`);
  if (!res.ok) return null;
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

// Helper to update Civil Memory (POST)
async function postCivilMemory(key: string, data: any) {
  const res = await fetch(`http://localhost:3333/?mode=disk&key=${encodeURIComponent(key)}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
  return res.ok;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { action } = req.body;
  if (!action || typeof action !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid action' });
  }
  // Fetch users and projects for context
  const users = await fetchCivilMemory('users');
  if (!users || typeof users !== 'object') {
    return res.status(500).json({ error: 'Could not fetch users from Civil Memory' });
  }
  const userEmails = Object.keys(users);
  const projectsByUser: Record<string, any[]> = {};
  for (const email of userEmails) {
    const projects = await fetchCivilMemory(`projects:${email}`);
    if (Array.isArray(projects)) {
      projectsByUser[email] = projects;
    }
  }
  let result = { action, status: 'skipped', info: '' };
  try {
    // Copy the full_auto action execution logic from orchestrator
    const projectId = action.projectId || action.projectID || action.project_id;
    if (action.action === 'create_task') {
      const { projectId, ...taskData } = action;
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const projects = projectsByUser[owner];
      const idx = projects.findIndex(p => String(p.id) === String(projectId));
      if (idx === -1) throw new Error('Project not found');
      const project = projects[idx];
      const newTask = { id: Date.now().toString(), ...taskData };
      const updatedTasks = Array.isArray(project.tasks) ? [...project.tasks, newTask] : [newTask];
      projects[idx] = { ...project, tasks: updatedTasks };
      await postCivilMemory(`projects:${owner}`, projects);
      result = { action, status: 'approved', info: 'Task created' };
    } else if (action.action === 'update_task') {
      const { projectId, taskId, ...updates } = action;
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const projects = projectsByUser[owner];
      const idx = projects.findIndex(p => String(p.id) === String(projectId));
      if (idx === -1) throw new Error('Project not found');
      const project = projects[idx];
      const updatedTasks = (project.tasks || []).map((t: any) => String(t.id) === String(taskId) ? { ...t, ...updates } : t);
      projects[idx] = { ...project, tasks: updatedTasks };
      await postCivilMemory(`projects:${owner}`, projects);
      result = { action, status: 'approved', info: 'Task updated' };
    } else if (action.action === 'delete_task') {
      const { projectId, taskId } = action;
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const projects = projectsByUser[owner];
      const idx = projects.findIndex(p => String(p.id) === String(projectId));
      if (idx === -1) throw new Error('Project not found');
      const project = projects[idx];
      const updatedTasks = (project.tasks || []).filter((t: any) => String(t.id) !== String(taskId));
      projects[idx] = { ...project, tasks: updatedTasks };
      await postCivilMemory(`projects:${owner}`, projects);
      result = { action, status: 'approved', info: 'Task deleted' };
    } else if (action.action === 'create_document') {
      const { projectId, title, ...rest } = action;
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const docTabsKey = `doctabs:${owner}:${projectId}`;
      let docTabs = await fetchCivilMemory(docTabsKey) || [];
      const newDocId = 'doc-' + Date.now();
      docTabs.push({ id: newDocId, title: title || 'Untitled', ...rest });
      await postCivilMemory(docTabsKey, docTabs);
      const docsKey = `docs:${owner}`;
      let docs = await fetchCivilMemory(docsKey) || {};
      docs[newDocId] = [];
      await postCivilMemory(docsKey, docs);
      result = { action, status: 'approved', info: 'Document created' };
    } else if (action.action === 'update_document') {
      const { projectId, docId, ...updates } = action;
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const docTabsKey = `doctabs:${owner}:${projectId}`;
      let docTabs = await fetchCivilMemory(docTabsKey) || [];
      docTabs = docTabs.map((tab: any) => tab.id === docId ? { ...tab, ...updates } : tab);
      await postCivilMemory(docTabsKey, docTabs);
      result = { action, status: 'approved', info: 'Document updated' };
    } else if (action.action === 'delete_document') {
      const { projectId, docId } = action;
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const docTabsKey = `doctabs:${owner}:${projectId}`;
      let docTabs = await fetchCivilMemory(docTabsKey) || [];
      docTabs = docTabs.filter((tab: any) => tab.id !== docId);
      await postCivilMemory(docTabsKey, docTabs);
      const docsKey = `docs:${owner}`;
      let docs = await fetchCivilMemory(docsKey) || {};
      delete docs[docId];
      await postCivilMemory(docsKey, docs);
      result = { action, status: 'approved', info: 'Document deleted' };
    } else if (action.action === 'create_expense') {
      const { projectId, ...expenseData } = action;
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const projects = projectsByUser[owner];
      const idx = projects.findIndex(p => String(p.id) === String(projectId));
      if (idx === -1) throw new Error('Project not found');
      const project = projects[idx];
      const newExpense = { id: Date.now().toString(), ...expenseData };
      const updatedExpenses = Array.isArray(project.expenses) ? [...project.expenses, newExpense] : [newExpense];
      projects[idx] = { ...project, expenses: updatedExpenses };
      await postCivilMemory(`projects:${owner}`, projects);
      result = { action, status: 'approved', info: 'Expense created' };
    } else if (action.action === 'update_expense') {
      const { projectId, expenseId, ...updates } = action;
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const projects = projectsByUser[owner];
      const idx = projects.findIndex(p => String(p.id) === String(projectId));
      if (idx === -1) throw new Error('Project not found');
      const project = projects[idx];
      const updatedExpenses = (project.expenses || []).map((e: any) => String(e.id) === String(expenseId) ? { ...e, ...updates } : e);
      projects[idx] = { ...project, expenses: updatedExpenses };
      await postCivilMemory(`projects:${owner}`, projects);
      result = { action, status: 'approved', info: 'Expense updated' };
    } else if (action.action === 'delete_expense') {
      const { projectId, expenseId } = action;
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const projects = projectsByUser[owner];
      const idx = projects.findIndex(p => String(p.id) === String(projectId));
      if (idx === -1) throw new Error('Project not found');
      const project = projects[idx];
      const updatedExpenses = (project.expenses || []).filter((e: any) => String(e.id) !== String(expenseId));
      projects[idx] = { ...project, expenses: updatedExpenses };
      await postCivilMemory(`projects:${owner}`, projects);
      result = { action, status: 'approved', info: 'Expense deleted' };
    } else if (action.action === 'update_budget') {
      const { projectId, budget, currency } = action;
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const projects = projectsByUser[owner];
      const idx = projects.findIndex(p => String(p.id) === String(projectId));
      if (idx === -1) throw new Error('Project not found');
      const project = projects[idx];
      projects[idx] = { ...project, budget: budget ?? project.budget, currency: currency ?? project.currency };
      await postCivilMemory(`projects:${owner}`, projects);
      result = { action, status: 'approved', info: 'Budget updated' };
    } else if (action.action === 'send_message') {
      const { projectId, sender, senderName, content, type } = action;
      if (!projectId || !content) throw new Error('Missing projectId or content');
      const chatKey = projectId;
      let chat = await fetchCivilMemory(`chat:${chatKey}`) || [];
      const newMsg = {
        id: Date.now(),
        sender: sender || 'ai',
        senderName: senderName || 'AI Assistant',
        timestamp: new Date().toISOString(),
        content,
        type: type || 'ai',
        reactions: []
      };
      chat.push(newMsg);
      await postCivilMemory(`chat:${chatKey}`, chat);
      result = { action, status: 'approved', info: 'Message sent' };
    } else if (action.action === 'summarize_chat') {
      const { projectId } = action;
      if (!projectId) throw new Error('Missing projectId');
      const chatKey = projectId;
      let chat = await fetchCivilMemory(`chat:${chatKey}`) || [];
      const chatContent = chat.map((msg: any) => `${msg.senderName || msg.sender}: ${msg.content}`).join('\n');
      const gemini = getGeminiClient();
      const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
      const summaryPrompt = `Summarize the following project chat for the team in 2-3 sentences.\n\n${chatContent}`;
      const summaryResult = await model.generateContent(summaryPrompt);
      const summary = summaryResult.response.text().trim();
      const summaryMsg = {
        id: Date.now(),
        sender: 'ai',
        senderName: 'AI Assistant',
        timestamp: new Date().toISOString(),
        content: summary,
        type: 'ai',
        reactions: []
      };
      chat.push(summaryMsg);
      await postCivilMemory(`chat:${chatKey}`, chat);
      result = { action, status: 'approved', info: 'Chat summarized' };
    } else if (action.action === 'create_research') {
      const { projectId, ...researchData } = action;
      if (!projectId) throw new Error('Missing projectId');
      const researchKey = `research:${projectId}`;
      let research = await fetchCivilMemory(researchKey) || [];
      const newResearch = { id: Date.now().toString(), ...researchData };
      research.push(newResearch);
      await postCivilMemory(researchKey, research);
      result = { action, status: 'approved', info: 'Research item created' };
    } else if (action.action === 'update_research') {
      const { projectId, researchId, ...updates } = action;
      if (!projectId || !researchId) throw new Error('Missing projectId or researchId');
      const researchKey = `research:${projectId}`;
      let research = await fetchCivilMemory(researchKey) || [];
      research = research.map((r: any) => String(r.id) === String(researchId) ? { ...r, ...updates } : r);
      await postCivilMemory(researchKey, research);
      result = { action, status: 'approved', info: 'Research item updated' };
    } else if (action.action === 'delete_research') {
      const { projectId, researchId } = action;
      if (!projectId || !researchId) throw new Error('Missing projectId or researchId');
      const researchKey = `research:${projectId}`;
      let research = await fetchCivilMemory(researchKey) || [];
      research = research.filter((r: any) => String(r.id) !== String(researchId));
      await postCivilMemory(researchKey, research);
      result = { action, status: 'approved', info: 'Research item deleted' };
    } else if (action.action === 'summarize_research') {
      const { projectId, researchId } = action;
      if (!projectId || !researchId) throw new Error('Missing projectId or researchId');
      const researchKey = `research:${projectId}`;
      let research = await fetchCivilMemory(researchKey) || [];
      const item = research.find((r: any) => String(r.id) === String(researchId));
      if (!item) throw new Error('Research item not found');
      const gemini = getGeminiClient();
      const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
      const summaryPrompt = `Summarize the following research for a project team in 2-3 sentences.\n\nTitle: ${item.title}\nType: ${item.type}\nContent: ${item.content}`;
      const summaryResult = await model.generateContent(summaryPrompt);
      const summary = summaryResult.response.text().trim();
      research = research.map((r: any) => String(r.id) === String(researchId) ? { ...r, summary } : r);
      await postCivilMemory(researchKey, research);
      result = { action, status: 'approved', info: 'Research summarized' };
    } else if (action.action === 'send_notification') {
      const { userEmail, message, type, projectId, projectName } = action;
      if (!userEmail || !message) throw new Error('Missing userEmail or message');
      const notifKey = `notifications:${userEmail}`;
      let notifications = await fetchCivilMemory(notifKey) || [];
      const newNotif = {
        id: Date.now(),
        type: type || 'info',
        projectId,
        projectName,
        message,
        timestamp: new Date().toISOString(),
        read: false
      };
      notifications.unshift(newNotif);
      await postCivilMemory(notifKey, notifications);
      result = { action, status: 'approved', info: 'Notification sent' };
    } else {
      result = { action, status: 'unknown', info: 'Unknown action type' };
    }
  } catch (err: any) {
    result = { action, status: 'error', info: err.message };
  }
  // Update orchestrator_logs: mark this action as approved
  const logKey = 'orchestrator_logs';
  let logs = await fetchCivilMemory(logKey) || [];
  // Find the first log with this action as suggested, and update its status
  for (const log of logs) {
    if (log.actions && log.results) {
      for (let i = 0; i < log.actions.length; i++) {
        if (JSON.stringify(log.actions[i]) === JSON.stringify(action) && log.results[i]?.status === 'suggested') {
          log.results[i] = result;
          break;
        }
      }
    }
  }
  await postCivilMemory(logKey, logs);
  return res.status(200).json(result);
} 