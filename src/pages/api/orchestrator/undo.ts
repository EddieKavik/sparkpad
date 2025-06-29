import type { NextApiRequest, NextApiResponse } from 'next';
import { safeJsonParse } from '../../../utils/safeJsonParse';

// Helper to fetch from Civil Memory
async function fetchCivilMemory(key: string) {
  const res = await fetch(`http://localhost:3333/?mode=disk&key=${encodeURIComponent(key)}`);
  if (!res.ok) return null;
  const text = await res.text();
  return text ? safeJsonParse(text, null) : null;
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
    const projectId = action.projectId || action.projectID || action.project_id;
    // Undo logic for supported actions
    if (action.action === 'create_task') {
      // Undo by deleting the created task (must have task id)
      const { id } = action;
      if (!id) throw new Error('Task id required to undo create_task');
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const projects = projectsByUser[owner];
      const idx = projects.findIndex(p => String(p.id) === String(projectId));
      if (idx === -1) throw new Error('Project not found');
      const project = projects[idx];
      const updatedTasks = (project.tasks || []).filter((t: any) => String(t.id) !== String(id));
      projects[idx] = { ...project, tasks: updatedTasks };
      await postCivilMemory(`projects:${owner}`, projects);
      result = { action, status: 'undone', info: 'Task creation undone (task deleted)' };
    } else if (action.action === 'delete_task') {
      // Undo by re-creating the deleted task (must have full task data)
      const { taskData } = action;
      if (!taskData) throw new Error('Full task data required to undo delete_task');
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const projects = projectsByUser[owner];
      const idx = projects.findIndex(p => String(p.id) === String(projectId));
      if (idx === -1) throw new Error('Project not found');
      const project = projects[idx];
      const updatedTasks = Array.isArray(project.tasks) ? [...project.tasks, taskData] : [taskData];
      projects[idx] = { ...project, tasks: updatedTasks };
      await postCivilMemory(`projects:${owner}`, projects);
      result = { action, status: 'undone', info: 'Task deletion undone (task restored)' };
    } else if (action.action === 'create_document') {
      // Undo by deleting the created document (must have docId)
      const { docId } = action;
      if (!docId) throw new Error('docId required to undo create_document');
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
      result = { action, status: 'undone', info: 'Document creation undone (document deleted)' };
    } else if (action.action === 'delete_document') {
      // Undo by re-creating the deleted document (must have full docTab and rows)
      const { docTab, docRows } = action;
      if (!docTab || !docRows) throw new Error('docTab and docRows required to undo delete_document');
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const docTabsKey = `doctabs:${owner}:${projectId}`;
      let docTabs = await fetchCivilMemory(docTabsKey) || [];
      docTabs.push(docTab);
      await postCivilMemory(docTabsKey, docTabs);
      const docsKey = `docs:${owner}`;
      let docs = await fetchCivilMemory(docsKey) || {};
      docs[docTab.id] = docRows;
      await postCivilMemory(docsKey, docs);
      result = { action, status: 'undone', info: 'Document deletion undone (document restored)' };
    } else if (action.action === 'create_expense') {
      // Undo by deleting the created expense (must have expense id)
      const { id } = action;
      if (!id) throw new Error('Expense id required to undo create_expense');
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const projects = projectsByUser[owner];
      const idx = projects.findIndex(p => String(p.id) === String(projectId));
      if (idx === -1) throw new Error('Project not found');
      const project = projects[idx];
      const updatedExpenses = (project.expenses || []).filter((e: any) => String(e.id) !== String(id));
      projects[idx] = { ...project, expenses: updatedExpenses };
      await postCivilMemory(`projects:${owner}`, projects);
      result = { action, status: 'undone', info: 'Expense creation undone (expense deleted)' };
    } else if (action.action === 'delete_expense') {
      // Undo by re-creating the deleted expense (must have full expense data)
      const { expenseData } = action;
      if (!expenseData) throw new Error('Full expense data required to undo delete_expense');
      const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
      if (!owner) throw new Error('Project owner not found');
      const projects = projectsByUser[owner];
      const idx = projects.findIndex(p => String(p.id) === String(projectId));
      if (idx === -1) throw new Error('Project not found');
      const project = projects[idx];
      const updatedExpenses = Array.isArray(project.expenses) ? [...project.expenses, expenseData] : [expenseData];
      projects[idx] = { ...project, expenses: updatedExpenses };
      await postCivilMemory(`projects:${owner}`, projects);
      result = { action, status: 'undone', info: 'Expense deletion undone (expense restored)' };
    } else if (action.action === 'create_research') {
      // Undo by deleting the created research item (must have id)
      const { id } = action;
      if (!id) throw new Error('Research id required to undo create_research');
      const researchKey = `research:${projectId}`;
      let research = await fetchCivilMemory(researchKey) || [];
      research = research.filter((r: any) => String(r.id) !== String(id));
      await postCivilMemory(researchKey, research);
      result = { action, status: 'undone', info: 'Research creation undone (item deleted)' };
    } else if (action.action === 'delete_research') {
      // Undo by re-creating the deleted research item (must have full data)
      const { researchData } = action;
      if (!researchData) throw new Error('Full research data required to undo delete_research');
      const researchKey = `research:${projectId}`;
      let research = await fetchCivilMemory(researchKey) || [];
      research.push(researchData);
      await postCivilMemory(researchKey, research);
      result = { action, status: 'undone', info: 'Research deletion undone (item restored)' };
    } else {
      throw new Error('Undo not supported for this action type');
    }
  } catch (err: any) {
    result = { action, status: 'error', info: err.message };
  }
  // Log the undo in orchestrator_logs
  const logKey = 'orchestrator_logs';
  let logs = await fetchCivilMemory(logKey) || [];
  logs.unshift({ timestamp: new Date().toISOString(), actions: [action], results: [result], undo: true });
  await postCivilMemory(logKey, logs);
  return res.status(200).json(result);
} 