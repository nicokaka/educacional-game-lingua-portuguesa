import { supabase } from './client.js';

export const MODULE_LEADERBOARD_WINDOW_HOURS = 12;
let supportsFinishedAtColumn = true;
let supportsV2Columns = true;

function isMissingColumnError(error, columnName, tableName) {
  const message = error?.message || '';
  return new RegExp(`Could not find the '${columnName}' column of '${tableName}'`, 'i').test(message);
}

function stripFinishedAt(payload) {
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'finished_at')) return payload;
  const { finished_at, ...rest } = payload;
  return rest;
}

function stripV2Columns(payload) {
  if (!payload) return payload;
  const { wrong_answers, hints_used, max_streak, ...rest } = payload;
  return rest;
}

function getLeaderboardWindowStart(period = '12h') {
  if (period === 'today') {
    // Usa meia-noite UTC para evitar divergência entre celulares com fusos diferentes.
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  }

  if (period === '7d') {
    return new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
  }

  return new Date(Date.now() - (MODULE_LEADERBOARD_WINDOW_HOURS * 60 * 60 * 1000)).toISOString();
}

// Utilitários de Tratamento de Dados (Anti-Dado Sujo)
function toTitleCase(str) {
  if (!str) return '';
  return str.trim().toLowerCase().split(/\s+/).map(word => {
    if (word.length === 0) return '';
    const smallWords = ['e', 'de', 'da', 'do', 'das', 'dos'];
    if (smallWords.includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function normalizeForDeduplication(name) {
  if (!name) return '';
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/\s+/g, " ") // Espaços únicos
    .trim();
}

async function fetchLeaderboardAttemptRows(moduleId, filterClassroomId = '', period = '12h') {
  const trimmedFilterClassroomId = filterClassroomId?.trim?.() || '';

  let query = supabase
    .from('module_attempts')
    .select('*')
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
  let payload = supportsV2Columns ? attempt : stripV2Columns(attempt);
  payload = supportsFinishedAtColumn ? payload : stripFinishedAt(payload);
  
  let { data, error } = await supabase
    .from('module_attempts')
    .insert(payload)
    .select('id');

  if (error && supportsV2Columns && isMissingColumnError(error, 'wrong_answers', 'module_attempts')) {
    supportsV2Columns = false;
    payload = stripV2Columns(attempt);
    payload = supportsFinishedAtColumn ? payload : stripFinishedAt(payload);
    ({ data, error } = await supabase
      .from('module_attempts')
      .insert(payload)
      .select('id'));
  }

  if (error && supportsFinishedAtColumn && isMissingColumnError(error, 'finished_at', 'module_attempts')) {
    supportsFinishedAtColumn = false;
    payload = stripFinishedAt(payload);
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

  let payload = supportsV2Columns ? patch : stripV2Columns(patch);
  payload = supportsFinishedAtColumn ? payload : stripFinishedAt(payload);

  let { data, error } = await supabase
    .from('module_attempts')
    .update(payload)
    .eq('id', attemptId)
    .select('id');

  if (error && supportsV2Columns && isMissingColumnError(error, 'wrong_answers', 'module_attempts')) {
    supportsV2Columns = false;
    payload = stripV2Columns(patch);
    payload = supportsFinishedAtColumn ? payload : stripFinishedAt(payload);
    ({ data, error } = await supabase
      .from('module_attempts')
      .update(payload)
      .eq('id', attemptId)
      .select('id'));
  }

  if (error && supportsFinishedAtColumn && isMissingColumnError(error, 'finished_at', 'module_attempts')) {
    supportsFinishedAtColumn = false;
    payload = stripFinishedAt(payload);
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
  const period = options?.period || '12h';
  const filterClassroomId = options?.filterClassroomId?.trim?.() || '';
  const rows = await fetchLeaderboardAttemptRows(moduleId, filterClassroomId, period);

  const rankedAttempts = rows
    .map((attempt) => {
      const rawName = attempt.student_name?.trim?.() || '';
      const rawClass = attempt.classroom_name?.trim?.() || '';
      
      return {
        ...attempt,
        percentage: attempt.max_score > 0 ? attempt.score / attempt.max_score : 0,
        student_name: toTitleCase(rawName),
        student_name_raw: rawName, // Guardado para match do currentStudent
        classroom_id: attempt.classroom_id || '',
        classroom_name: rawClass ? toTitleCase(rawClass) : (attempt.classroom_id ? 'Turma Removida Ou Indisponível' : ''),
        finished_at: attempt.finished_at || null,
        wrong_answers: attempt.wrong_answers || 0,
        hints_used: attempt.hints_used || 0,
        max_streak: attempt.max_streak || 0,
      };
    })
    .sort((a, b) => {
      // 1. Maior porcentagem primeiro
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      
      // 2. Status de conclusão (completo > incompleto > sem finished_at)
      const statusRankA = a.finished_at ? (a.completed ? 3 : 1) : 2;
      const statusRankB = b.finished_at ? (b.completed ? 3 : 1) : 2;
      if (statusRankB !== statusRankA) return statusRankB - statusRankA;

      // 3. Menor tempo de duração primeiro (tie-breaker de velocidade)
      const durationA = a.finished_at && a.created_at ? new Date(a.finished_at).getTime() - new Date(a.created_at).getTime() : Infinity;
      const durationB = b.finished_at && b.created_at ? new Date(b.finished_at).getTime() - new Date(b.created_at).getTime() : Infinity;
      
      const validA = durationA > 0 && durationA <= 3600000; // max 1 hora
      const validB = durationB > 0 && durationB <= 3600000;
      
      if (validA && validB && durationA !== durationB) {
        return durationA - durationB;
      } else if (validA && !validB) {
        return -1;
      } else if (!validA && validB) {
        return 1;
      }

      // 4. Último caso: mais recente primeiro
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const bestByStudent = [];
  const seenStudents = new Set(); // Guarda identityKeys para dedup rápido

  for (const attempt of rankedAttempts) {
    if (!attempt.student_name_raw) continue;
    
    const dedupName = normalizeForDeduplication(attempt.student_name_raw);
    const currentClassroom = attempt.classroom_id || 'legacy';
    
    // Deduplicação inteligente (Anti-typos / Nomes parecidos)
    let isDuplicate = false;
    for (const seenKey of seenStudents) {
      const [seenClassroom, seenName] = seenKey.split('::');
      
      if (seenClassroom === currentClassroom) {
        // Se um nome contém o outro (ex: "davi e pedro" vs "davi e pedro isaias") e for maior que 4 caracteres
        if ((seenName.includes(dedupName) || dedupName.includes(seenName)) && Math.min(seenName.length, dedupName.length) > 4) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (isDuplicate) continue;

    const identityKey = `${currentClassroom}::${dedupName}`;
    seenStudents.add(identityKey);
    bestByStudent.push(attempt);
  }

  const trimmedCurrentStudent = currentStudentName?.trim?.() || '';
  const normalizedCurrentStudent = normalizeForDeduplication(trimmedCurrentStudent);
  
  const currentStudentIndex = trimmedCurrentStudent
    ? bestByStudent.findIndex((entry) => {
        // Match relaxado para encontrar o aluno atual mesmo que a string raw divirja
        const entryNormalized = normalizeForDeduplication(entry.student_name_raw);
        if (entryNormalized !== normalizedCurrentStudent && !entryNormalized.includes(normalizedCurrentStudent) && !normalizedCurrentStudent.includes(entryNormalized)) return false;
        
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
  const period = options?.period || '12h';
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
