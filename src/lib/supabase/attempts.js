import { supabase } from './client.js';

export const MODULE_LEADERBOARD_WINDOW_HOURS = 12;

function getLeaderboardWindowStart() {
  return new Date(Date.now() - (MODULE_LEADERBOARD_WINDOW_HOURS * 60 * 60 * 1000)).toISOString();
}

async function fetchLeaderboardAttemptRows(moduleId, currentClassroomId = '') {
  const trimmedCurrentClassroomId = currentClassroomId?.trim?.() || '';

  let query = supabase
    .from('module_attempts')
    .select('id, student_name, classroom_id, classroom_name, score, max_score, completed, created_at')
    .eq('module_id', moduleId)
    .gte('created_at', getLeaderboardWindowStart());

  if (trimmedCurrentClassroomId) {
    query = query.or(`classroom_id.eq.${trimmedCurrentClassroomId},classroom_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao carregar placar: ${error.message}`);
  }

  return trimmedCurrentClassroomId
    ? (() => {
        const classroomRows = (data || []).filter((attempt) => attempt.classroom_id === trimmedCurrentClassroomId);
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
  const { error } = await supabase
    .from('module_attempts')
    .insert(attempt);

  if (error) {
    throw new Error(`Erro ao salvar tentativa: ${error.message}`);
  }
}

/**
 * Retorna a classificacao da turma e a posicao do aluno atual em um modulo.
 * @param {string} moduleId
 * @param {string} currentStudentName
 * @param {string} currentClassroomId
 */
export async function fetchModuleLeaderboard(moduleId, currentStudentName = '', currentClassroomId = '') {
  const trimmedCurrentClassroomId = currentClassroomId?.trim?.() || '';
  const rows = await fetchLeaderboardAttemptRows(moduleId, trimmedCurrentClassroomId);

  const rankedAttempts = rows
    .map((attempt) => ({
      ...attempt,
      percentage: attempt.max_score > 0 ? attempt.score / attempt.max_score : 0,
      student_name: attempt.student_name?.trim?.() || '',
      classroom_id: attempt.classroom_id || '',
      classroom_name: attempt.classroom_name || (attempt.classroom_id ? 'Turma removida ou indisponivel' : ''),
    }))
    .sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (b.score !== a.score) return b.score - a.score;
      if (Number(b.completed) !== Number(a.completed)) return Number(b.completed) - Number(a.completed);
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
    currentStudent: currentStudentIndex === -1
      ? null
      : {
          rank: currentStudentIndex + 1,
          ...bestByStudent[currentStudentIndex],
        },
  };
}

export async function clearModuleLeaderboard(moduleId, currentClassroomId = '') {
  const rows = await fetchLeaderboardAttemptRows(moduleId, currentClassroomId);
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
