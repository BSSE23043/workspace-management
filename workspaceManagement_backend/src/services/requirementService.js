const crypto = require('crypto');
const { pool } = require('../config/db');

const toApiRequirement = async (reqRow) => {
  const [milestones] = await pool.execute(
    `SELECT id, title, is_completed FROM milestones WHERE requirement_id = ?`,
    [reqRow.id]
  );
  const [broadcasts] = await pool.execute(
    `SELECT id, author_email, content, created_at FROM broadcasts WHERE requirement_id = ? ORDER BY created_at DESC`,
    [reqRow.id]
  );
  const [replies] = await pool.execute(
    `SELECT id, author_email, message, created_at FROM clarification_replies WHERE requirement_id = ? ORDER BY created_at DESC`,
    [reqRow.id]
  );

  const msList = milestones.map((m) => ({
    id: m.id,
    title: m.title,
    isCompleted: Boolean(m.is_completed),
  }));
  const completedCount = msList.filter((m) => m.isCompleted).length;
  const totalCount = msList.length;

  return {
    id: reqRow.id,
    code: reqRow.code,
    title: reqRow.title,
    organization: reqRow.client_email,
    clientRepresentative: reqRow.client_email,
    clientId: reqRow.client_email,
    clientEmail: reqRow.client_email,
    contractDeadline: reqRow.deadline,
    lifecycleState: reqRow.lifecycle_state,
    completedMilestones: completedCount,
    totalMilestones: totalCount,
    progressPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    milestones: msList,
    broadcasts: broadcasts.map((b) => ({
      id: b.id,
      time: 'Just now',
      createdAt: new Date(b.created_at).getTime(),
      author: b.author_email,
      content: b.content,
    })),
    clarificationReplies: replies.map((r) => ({
      id: r.id,
      time: 'Just now',
      createdAt: new Date(r.created_at).getTime(),
      author: r.author_email,
      content: r.message,
    })),
  };
};

const listRequirementsByClient = async (clientEmail) => {
  const [rows] = await pool.execute(
    `SELECT id, code, client_email, author_email, title, deadline, lifecycle_state
       FROM requirements
      WHERE client_email = ?
      ORDER BY id DESC`,
    [clientEmail]
  );
  const out = [];
  for (const r of rows) {
    out.push(await toApiRequirement(r));
  }
  return out;
};

const findRequirementById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT id, code, client_email, author_email, title, deadline, lifecycle_state
       FROM requirements WHERE id = ? LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  return toApiRequirement(rows[0]);
};

const addClarificationReply = async ({ reqId, authorEmail, message }) => {
  const id = crypto.randomUUID();
  await pool.execute(
    `INSERT INTO clarification_replies (id, requirement_id, client_email, author_email, message)
     VALUES (?, ?, (SELECT client_email FROM requirements WHERE id = ?), ?, ?)`,
    [id, reqId, reqId, authorEmail, message]
  );
  return findRequirementById(reqId);
};

module.exports = {
  listRequirementsByClient,
  findRequirementById,
  addClarificationReply,
};
