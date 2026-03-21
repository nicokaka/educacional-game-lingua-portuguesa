import { supabase } from './client.js';

/**
 * Salva uma tentativa finalizada de modulo.
 * @param {{
 *   module_id: string,
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
 */
export async function fetchModuleLeaderboard(moduleId, currentStudentName = '') {
  const { data, error } = await supabase
    .from('module_attempts')
    .select('student_name, score, max_score, completed, created_at')
    .eq('module_id', moduleId);

  if (error) {
    throw new Error(`Erro ao carregar placar: ${error.message}`);
  }

  const rankedAttempts = (data || [])
    .map((attempt) => ({
      ...attempt,
      percentage: attempt.max_score > 0 ? attempt.score / attempt.max_score : 0,
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
    const normalizedName = attempt.student_name.trim();
    if (!normalizedName || seenStudents.has(normalizedName)) continue;
    seenStudents.add(normalizedName);
    bestByStudent.push(attempt);
  }

  const trimmedCurrentStudent = currentStudentName.trim();
  const currentStudentIndex = trimmedCurrentStudent
    ? bestByStudent.findIndex((entry) => entry.student_name === trimmedCurrentStudent)
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
