import type { NextApiRequest, NextApiResponse } from 'next';
import { getGeminiClient } from '@/utils/gemini';
import { safeJsonParse } from '../../../utils/safeJsonParse';

// Helper to fetch from Civil Memory
async function fetchCivilMemory(key: string) {
  try {
    const res = await fetch(`http://localhost:3333/?mode=disk&key=${encodeURIComponent(key)}`);
    if (!res.ok) {
      console.error(`[orchestrator] Failed to fetch key: ${key}, status: ${res.status}`);
      return null;
    }
    const text = await res.text();
    return text ? safeJsonParse(text, null) : null;
  } catch (err) {
    console.error(`[orchestrator] Exception fetching key: ${key}`, err);
    return null;
  }
}

// Helper to update Civil Memory (POST)
async function postCivilMemory(key: string, data: any) {
  try {
    const res = await fetch(`http://localhost:3333/?mode=disk&key=${encodeURIComponent(key)}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      console.error(`[orchestrator] Failed to post key: ${key}, status: ${res.status}`);
    }
    return res.ok;
  } catch (err) {
    console.error(`[orchestrator] Exception posting key: ${key}`, err);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Fetch all users (from Civil Memory, assume key 'users')
    const users = await fetchCivilMemory('users');
    if (!users || typeof users !== 'object') {
      console.error('[orchestrator] Could not fetch users from Civil Memory', users);
      return res.status(500).json({ error: 'Could not fetch users from Civil Memory', details: users });
    }
    const userEmails = Object.keys(users);
    if (userEmails.length === 0) {
      console.error('[orchestrator] No users found in Civil Memory');
      return res.status(500).json({ error: 'No users found in Civil Memory' });
    }

    // 2. For each user, fetch their projects
    const allProjects: any[] = [];
    const projectsByUser: Record<string, any[]> = {};
    const aiModeByProject: Record<string, string> = {};
    for (const email of userEmails) {
      const projects = await fetchCivilMemory(`projects:${email}`);
      if (Array.isArray(projects)) {
        projectsByUser[email] = projects;
        for (const project of projects) {
          // Fetch docs and docTabs for each project
          const docs = await fetchCivilMemory('docs:' + email);
          const docTabs = await fetchCivilMemory('doctabs:' + email + ':' + project.id);
          allProjects.push({
            ...project,
            owner: email,
            docs,
            docTabs,
          });
          aiModeByProject[String(project.id)] = project.ai_mode || 'full_auto';
        }
      } else {
        console.warn(`[orchestrator] No projects found for user: ${email}`);
      }
    }

    // 3. Call Gemini with a prompt and the data
    let aiText = '';
    try {
      const gemini = getGeminiClient();
      const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `You are an autonomous AI project manager for a collaborative platform.\n\nHere is the full data for all projects, users, documents, tasks, and finances.\n\nYour job is to review all data and output a list of actions (in JSON array format) to fully manage, organize, and optimize all projects.\n\nYou may:\n- Create, update, or delete documents, tasks, expenses, or messages.\n- Assign or reassign tasks.\n- Summarize or tag documents.\n- Communicate with users.\n- Take any action needed to keep projects running smoothly.\n\nOutput ONLY a JSON array of actions, e.g.:\n[\n  { \"action\": \"create_task\", \"projectId\": \"123\", \"title\": \"Follow up\", ... },\n  { \"action\": \"summarize_document\", ... }\n]\n\nHere is the data:\n${JSON.stringify(allProjects).slice(0, 12000)}\n\n(If the data is too long, focus on the most recent or important items.)`;
      const result = await model.generateContent(prompt);
      aiText = result.response.text().trim();
    } catch (err: any) {
      console.error('[orchestrator] Gemini error', err);
      return res.status(500).json({ error: 'Gemini error', details: err.message });
    }

    // 4. Parse and execute actions
    let actions: any[] = [];
    try {
      actions = safeJsonParse(aiText, []);
      if (!Array.isArray(actions)) throw new Error('AI did not return an array');
    } catch (err: any) {
      console.error('[orchestrator] AI output parse error', { aiText, error: err });
      return res.status(500).json({ error: 'AI output parse error', aiText, details: err.message });
    }

    const results: any[] = [];
    for (const action of actions) {
      let result = { action, status: 'skipped', info: '' };
      try {
        // Determine projectId for this action (if any)
        const projectId = action.projectId || action.projectID || action.project_id;
        const aiMode = projectId ? aiModeByProject[String(projectId)] || 'full_auto' : 'full_auto';
        if (aiMode === 'off') {
          result = { action, status: 'skipped', info: 'AI automation is OFF for this project' };
        } else if (aiMode === 'suggest_only') {
          result = { action, status: 'suggested', info: 'AI suggests this action; user approval required' };
        } else if (aiMode === 'full_auto') {
          if (action.action === 'create_task') {
            // Find the right user and project
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
            result = { action, status: 'success', info: 'Task created' };
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
            result = { action, status: 'success', info: 'Task updated' };
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
            result = { action, status: 'success', info: 'Task deleted' };
          } else if (action.action === 'create_document') {
            // For simplicity, add a new docTab and empty docRows
            const { projectId, title, ...rest } = action;
            const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
            if (!owner) throw new Error('Project owner not found');
            // Update docTabs
            const docTabsKey = `doctabs:${owner}:${projectId}`;
            let docTabs = await fetchCivilMemory(docTabsKey) || [];
            const newDocId = 'doc-' + Date.now();
            docTabs.push({ id: newDocId, title: title || 'Untitled', ...rest });
            await postCivilMemory(docTabsKey, docTabs);
            // Update docRows
            const docsKey = `docs:${owner}`;
            let docs = await fetchCivilMemory(docsKey) || {};
            docs[newDocId] = [];
            await postCivilMemory(docsKey, docs);
            result = { action, status: 'success', info: 'Document created' };
          } else if (action.action === 'update_document') {
            // Update docTab title/tags
            const { projectId, docId, ...updates } = action;
            const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
            if (!owner) throw new Error('Project owner not found');
            const docTabsKey = `doctabs:${owner}:${projectId}`;
            let docTabs = await fetchCivilMemory(docTabsKey) || [];
            docTabs = docTabs.map((tab: any) => tab.id === docId ? { ...tab, ...updates } : tab);
            await postCivilMemory(docTabsKey, docTabs);
            result = { action, status: 'success', info: 'Document updated' };
          } else if (action.action === 'delete_document') {
            const { projectId, docId } = action;
            const owner = userEmails.find(email => (projectsByUser[email] || []).some(p => String(p.id) === String(projectId)));
            if (!owner) throw new Error('Project owner not found');
            const docTabsKey = `doctabs:${owner}:${projectId}`;
            let docTabs = await fetchCivilMemory(docTabsKey) || [];
            docTabs = docTabs.filter((tab: any) => tab.id !== docId);
            await postCivilMemory(docTabsKey, docTabs);
            // Remove docRows
            const docsKey = `docs:${owner}`;
            let docs = await fetchCivilMemory(docsKey) || {};
            delete docs[docId];
            await postCivilMemory(docsKey, docs);
            result = { action, status: 'success', info: 'Document deleted' };
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
            result = { action, status: 'success', info: 'Expense created' };
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
            result = { action, status: 'success', info: 'Expense updated' };
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
            result = { action, status: 'success', info: 'Expense deleted' };
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
            result = { action, status: 'success', info: 'Budget updated' };
          } else if (action.action === 'send_message') {
            // Send a message to the project group chat
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
            result = { action, status: 'success', info: 'Message sent' };
          } else if (action.action === 'summarize_chat') {
            // Summarize the chat and add the summary as a message
            const { projectId } = action;
            if (!projectId) throw new Error('Missing projectId');
            const chatKey = projectId;
            let chat = await fetchCivilMemory(`chat:${chatKey}`) || [];
            const chatContent = chat.map((msg: any) => `${msg.senderName || msg.sender}: ${msg.content}`).join('\n');
            // Use Gemini to summarize
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
            result = { action, status: 'success', info: 'Chat summarized' };
          } else if (action.action === 'create_research') {
            const { projectId, ...researchData } = action;
            if (!projectId) throw new Error('Missing projectId');
            const researchKey = `research:${projectId}`;
            let research = await fetchCivilMemory(researchKey) || [];
            const newResearch = { id: Date.now().toString(), ...researchData };
            research.push(newResearch);
            await postCivilMemory(researchKey, research);
            result = { action, status: 'success', info: 'Research item created' };
          } else if (action.action === 'update_research') {
            const { projectId, researchId, ...updates } = action;
            if (!projectId || !researchId) throw new Error('Missing projectId or researchId');
            const researchKey = `research:${projectId}`;
            let research = await fetchCivilMemory(researchKey) || [];
            research = research.map((r: any) => String(r.id) === String(researchId) ? { ...r, ...updates } : r);
            await postCivilMemory(researchKey, research);
            result = { action, status: 'success', info: 'Research item updated' };
          } else if (action.action === 'delete_research') {
            const { projectId, researchId } = action;
            if (!projectId || !researchId) throw new Error('Missing projectId or researchId');
            const researchKey = `research:${projectId}`;
            let research = await fetchCivilMemory(researchKey) || [];
            research = research.filter((r: any) => String(r.id) !== String(researchId));
            await postCivilMemory(researchKey, research);
            result = { action, status: 'success', info: 'Research item deleted' };
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
            result = { action, status: 'success', info: 'Research summarized' };
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
            result = { action, status: 'success', info: 'Notification sent' };
          } else {
            result = { action, status: 'unknown', info: 'Unknown action type' };
          }
        }
      } catch (err: any) {
        console.error('[orchestrator] Error executing action', { action, error: err });
        result = { action, status: 'error', info: err.message };
      }
      results.push(result);
    }

    // After all actions, log the orchestrator run
    try {
      const logKey = 'orchestrator_logs';
      let logs = await fetchCivilMemory(logKey) || [];
      logs.unshift({ timestamp: new Date().toISOString(), actions, results });
      await postCivilMemory(logKey, logs);
    } catch (err) {
      console.error('[orchestrator] Failed to log orchestrator run', err);
    }

    return res.status(200).json({ status: 'Orchestrator online', actions, results, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('[orchestrator] Unexpected error', err);
    return res.status(500).json({ error: 'Unexpected orchestrator error', details: err.message });
  }
} 