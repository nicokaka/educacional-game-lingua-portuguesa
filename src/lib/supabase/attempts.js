import { supabase } from './client.js';

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
 * Retorna o top 3 e a posicao do aluno atual em um modulo.
 * @param {string} moduleId
 * @param {string} currentStudentName
 * @param {string} currentClassroomId
 */
export async function fetchModuleLeaderboard(moduleId, currentStudentName = '', currentClassroomId = '') {
  const { data, error } = await supabase
    .from('module_attempts')
    .select('student_name, classroom_id, classroom_name, score, max_score, completed, created_at')
    .eq('module_id', moduleId);

  if (error) {
    throw new Error(`Erro ao carregar placar: ${error.message}`);
  }

  const rankedAttempts = (data || [])
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
  const trimmedCurrentClassroomId = currentClassroomId?.trim?.() || '';
  const currentStudentIndex = trimmedCurrentStudent
    ? bestByStudent.findIndex((entry) => {
        if (entry.student_name !== trimmedCurrentStudent) return false;
        if (!trimmedCurrentClassroomId) return !entry.classroom_id;
        return entry.classroom_id === trimmedCurrentClassroomId || !entry.classroom_id;
      })
    : -1;

  return {
    top3: bestByStudent.slice(0, 3),
    currentStudent: currentStudentIndex === -1
      ? null
      : {
          rank: currentStudentIndex + 1,
          ...bestByStudent[currentStudentIndex],
        },
  };
}
