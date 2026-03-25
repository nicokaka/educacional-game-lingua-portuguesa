import { supabase } from './client.js';

export const MODULE_LEADERBOARD_WINDOW_HOURS = 12;
let supportsFinishedAtColumn = true;

function isMissingColumnError(error, columnName, tableName) {
  const message = error?.message || '';
  return new RegExp(`Could not find the '${columnName}' column of '${tableName}'`, 'i').test(message);
}

function stripFinishedAt(payload) {
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'finished_at')) return payload;
  const { finished_at, ...rest } = payload;
  return rest;
}

function getLeaderboardWindowStart(period = '12h') {
  if (period === 'today') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return todayStart.toISOString();
  }

  return new Date(Date.now() - (MODULE_LEADERBOARD_WINDOW_HOURS * 60 * 60 * 1000)).toISOString();
}

async function fetchLeaderboardAttemptRows(moduleId, filterClassroomId = '', period = '12h') {
  const trimmedFilterClassroomId = filterClassroomId?.trim?.() || '';

  let query = supabase
    .from('module_attempts')
    .select('id, student_name, classroom_id, classroom_name, score, max_score, completed, finished_at, created_at')
    .eq('module_id', moduleId)
    .gte('created_at', getLeaderboardWindowStart(period));

  if (trimmedFilterClassroomId) {
    query = query.or(`classroom_id.eq.${trimmedFilterClassroomId},classroom_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao carregar placar: ${error.message}`);
  }

  return trimmedFilterClassroomId
    ? (() => {
        const classroomRows = (data || []).filter((attempt) => attempt.classroom_id === trimmedFilterClassroomId);
        return classroomRows.length > 0
          ? classroomRows
          : (data || []).filter((attempt) => !attempt.classroom_id);
      })()
    : (data || []);
}

/**
 * Salva uma tentativa finalizada de modulo.
 * @param {{
 *   module_id: string,
 *   classroom_id?: string,
 *   classroom_name?: string,
 *   student_name: string,
 *   score: number,
 *   max_score: number,
 *   completed: boolean
 * }} attempt
 */
export async function createModuleAttempt(attempt) {
  let payload = supportsFinishedAtColumn ? attempt : stripFinishedAt(attempt);
  let { data, error } = await supabase
    .from('module_attempts')
    .insert(payload)
    .select('id');

  if (error && supportsFinishedAtColumn && isMissingColumnError(error, 'finished_at', 'module_attempts')) {
    supportsFinishedAtColumn = false;
    payload = stripFinishedAt(attempt);
    ({ data, error } = await supabase
      .from('module_attempts')
      .insert(payload)
      .select('id'));
  }

  if (error) {
    throw new Error(`Erro ao salvar tentativa: ${error.message}`);
  }

  return Array.isArray(data) ? data[0] || null : data || null;
}

export async function updateModuleAttempt(attemptId, patch) {
  if (!attemptId) {
    throw new Error('Nao foi possivel identificar a tentativa para atualizar.');
  }

  let payload = supportsFinishedAtColumn ? patch : stripFinishedAt(patch);
  let { data, error } = await supabase
    .from('module_attempts')
    .update(payload)
    .eq('id', attemptId)
    .select('id');

  if (error && supportsFinishedAtColumn && isMissingColumnError(error, 'finished_at', 'module_attempts')) {
    supportsFinishedAtColumn = false;
    payload = stripFinishedAt(patch);
    ({ data, error } = await supabase
      .from('module_attempts')
      .update(payload)
      .eq('id', attemptId)
      .select('id'));
  }

  if (error) {
    throw new Error(`Erro ao atualizar tentativa: ${error.message}`);
  }

  return Array.isArray(data) ? data[0] || null : data || null;
}

/**
 * Retorna a classificacao da turma e a posicao do aluno atual em um modulo.
 * @param {string} moduleId
 * @param {string} currentStudentName
 * @param {string} currentClassroomId
 * @param {{ period?: 'today' | '12h', filterClassroomId?: string }} options
 */
export async function fetchModuleLeaderboard(moduleId, currentStudentName = '', currentClassroomId = '', options = {}) {
  const trimmedCurrentClassroomId = currentClassroomId?.trim?.() || '';
  const period = options?.period === 'today' ? 'today' : '12h';
  const filterClassroomId = options?.filterClassroomId?.trim?.() || '';
  const rows = await fetchLeaderboardAttemptRows(moduleId, filterClassroomId, period);

  const rankedAttempts = rows
    .map((attempt) => ({
      ...attempt,
      percentage: attempt.max_score > 0 ? attempt.score / attempt.max_score : 0,
      student_name: attempt.student_name?.trim?.() || '',
      classroom_id: attempt.classroom_id || '',
      classroom_name: attempt.classroom_name || (attempt.classroom_id ? 'Turma removida ou indisponivel' : ''),
      finished_at: attempt.finished_at || null,
    }))
    .sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      const statusRankA = a.finished_at ? (a.completed ? 3 : 1) : 2;
      const statusRankB = b.finished_at ? (b.completed ? 3 : 1) : 2;
      if (statusRankB !== statusRankA) return statusRankB - statusRankA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const bestByStudent = [];
  const seenStudents = new Set();

  for (const attempt of rankedAttempts) {
    const normalizedName = attempt.student_name;
    if (!normalizedName) continue;

    const identityKey = attempt.classroom_id
      ? `${attempt.classroom_id}::${normalizedName}`
      : `legacy::${normalizedName}`;

    if (seenStudents.has(identityKey)) continue;
    seenStudents.add(identityKey);
    bestByStudent.push(attempt);
  }

  const trimmedCurrentStudent = currentStudentName?.trim?.() || '';
  const currentStudentIndex = trimmedCurrentStudent
    ? bestByStudent.findIndex((entry) => {
        if (entry.student_name !== trimmedCurrentStudent) return false;
        if (!trimmedCurrentClassroomId) return !entry.classroom_id;
        return entry.classroom_id === trimmedCurrentClassroomId || !entry.classroom_id;
      })
    : -1;

  return {
    top3: bestByStudent,
    attemptCount: rows.length,
    currentStudent: currentStudentIndex === -1
      ? null
      : {
          rank: currentStudentIndex + 1,
          ...bestByStudent[currentStudentIndex],
        },
  };
}

export async function clearModuleLeaderboard(moduleId, currentClassroomId = '', options = {}) {
  const period = options?.period === 'today' ? 'today' : '12h';
  const rows = await fetchLeaderboardAttemptRows(moduleId, currentClassroomId, period);
  const ids = rows.map((attempt) => attempt.id).filter(Boolean);

  if (ids.length === 0) return { deletedCount: 0 };

  const { error } = await supabase
    .from('module_attempts')
    .delete()
    .in('id', ids);

  if (error) {
    throw new Error(`Erro ao zerar placar: ${error.message}`);
  }

  return { deletedCount: ids.length };
}

export async function fetchModuleAttemptRoster(moduleId) {
  const { data, error } = await supabase
    .from('module_attempts')
    .select('student_name, classroom_id, classroom_name, created_at')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao carregar resultados do modulo: ${error.message}`);
  }

  const rosterByIdentity = new Map();

  for (const row of data || []) {
    const studentName = row.student_name?.trim?.() || '';
    if (!studentName) continue;

    const classroomId = row.classroom_id || '';
    const identityKey = classroomId ? `${classroomId}::${studentName}` : `legacy::${studentName}`;
    const current = rosterByIdentity.get(identityKey);

    if (!current) {
      rosterByIdentity.set(identityKey, {
        student_name: studentName,
        classroom_id: classroomId,
        classroom_name: row.classroom_name || (classroomId ? 'Turma removida ou indisponivel' : 'Turma antiga ou nao informada'),
        attempt_count: 1,
        last_attempt_at: row.created_at || '',
      });
      continue;
    }

    current.attempt_count += 1;
    if (new Date(row.created_at).getTime() > new Date(current.last_attempt_at).getTime()) {
      current.last_attempt_at = row.created_at || current.last_attempt_at;
    }
  }

  return [...rosterByIdentity.values()].sort((a, b) => {
    const dateDiff = new Date(b.last_attempt_at).getTime() - new Date(a.last_attempt_at).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.attempt_count - a.attempt_count;
  });
}

export async function removeStudentFromModuleLeaderboard(moduleId, studentName, classroomId = '') {
  const trimmedStudentName = studentName?.trim?.() || '';
  const trimmedClassroomId = classroomId?.trim?.() || '';

  if (!moduleId || !trimmedStudentName) {
    throw new Error('Nao foi possivel identificar o registro para remover do placar.');
  }

  let query = supabase
    .from('module_attempts')
    .delete()
    .eq('module_id', moduleId)
    .eq('student_name', trimmedStudentName);

  query = trimmedClassroomId
    ? query.eq('classroom_id', trimmedClassroomId)
    : query.is('classroom_id', null);

  const { error } = await query;

  if (error) {
    throw new Error(`Erro ao remover do placar: ${error.message}`);
  }
}
