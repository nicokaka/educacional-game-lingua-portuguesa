import { supabase } from './client.js';

export async function fetchActiveClassrooms() {
  const { data, error } = await supabase
    .from('classrooms')
    .select('id, name, sort_order, active, created_at')
    .eq('active', true)
    .order('sort_order')
    .order('created_at');

  if (error) {
    throw new Error(`Erro ao carregar turmas: ${error.message}`);
  }

  return data || [];
}

export async function fetchAllClassrooms() {
  const { data, error } = await supabase
    .from('classrooms')
    .select('id, name, sort_order, active, created_at')
    .order('active', { ascending: false })
    .order('sort_order')
    .order('created_at');

  if (error) {
    throw new Error(`Erro ao carregar turmas: ${error.message}`);
  }

  return data || [];
}

export async function createClassroom(name) {
  const trimmedName = name?.trim?.() || '';
  if (!trimmedName) {
    throw new Error('Digite um nome de turma.');
  }

  const { data: lastRow, error: lastError } = await supabase
    .from('classrooms')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) {
    throw new Error(`Erro ao preparar nova turma: ${lastError.message}`);
  }

  const { error } = await supabase
    .from('classrooms')
    .insert({
      name: trimmedName,
      sort_order: (lastRow?.sort_order || 0) + 1,
      active: true,
    });

  if (error) {
    throw new Error(`Erro ao criar turma: ${error.message}`);
  }
}

export async function updateClassroom(classroomId, name) {
  const trimmedName = name?.trim?.() || '';
  if (!trimmedName) {
    throw new Error('Digite um nome de turma.');
  }

  const { error } = await supabase
    .from('classrooms')
    .update({ name: trimmedName })
    .eq('id', classroomId);

  if (error) {
    throw new Error(`Erro ao atualizar turma: ${error.message}`);
  }
}

export async function setClassroomActive(classroomId, active) {
  const { error } = await supabase
    .from('classrooms')
    .update({ active })
    .eq('id', classroomId);

  if (error) {
    throw new Error(`Erro ao atualizar turma: ${error.message}`);
  }
}
