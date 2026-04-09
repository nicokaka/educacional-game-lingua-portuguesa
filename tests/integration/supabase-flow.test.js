import assert from 'node:assert/strict';

import { createModule, fetchModuleWithChallenges, deleteModule } from '../../src/lib/supabase/modules.js';
import { createModuleAttempt, updateModuleAttempt, fetchModuleLeaderboard } from '../../src/lib/supabase/attempts.js';
import { createOpenTextResponse, fetchModuleOpenTextResponses, updateOpenTextResponseReview, fetchStudentOpenTextResponses, deleteOpenTextResponse } from '../../src/lib/supabase/writtenResponses.js';


let moduleId = null;
let attemptId = null;
let responseId = null;
let challengeRecordId = null;

const testStudentName = `test_student_${Date.now()}`;
let testClassroomId = null;

async function runFlow() {
  console.log('--- Iniciando Integration Tests ---');
  
  try {
    // 0. Pegar Classroom existente para evitar FK error
    console.log('0. Buscando turma existente...');
    const { fetchActiveClassrooms } = await import('../../src/lib/supabase/classrooms.js');
    const classrooms = await fetchActiveClassrooms();
    testClassroomId = classrooms.length > 0 ? classrooms[0].id : null;
    console.log('✅ Turma encontrada:', testClassroomId);

    // 1. Criar Módulo
    console.log('1. Criando modulo...');
    const resultModule = await createModule(
      { title: 'Modulo de Integracao Teste', author: 'Bot' },
      [{ id: 'q1', type: 'open_text', prompt: 'Qual o sentido da vida?', difficulty: 1 }]
    );
    moduleId = resultModule;
    assert.ok(moduleId, 'moduleId deve ser retornado');
    console.log('✅ Modulo criado:', moduleId);

    // 2. Fetch Módulo com Challenges
    console.log('2. Buscando modulo e challenges...');
    const moduleData = await fetchModuleWithChallenges(moduleId);
    assert.equal(moduleData.module, 'Modulo de Integracao Teste');
    assert.equal(moduleData.challenges.length, 1);
    challengeRecordId = moduleData.challenges[0].challengeRecordId;
    assert.ok(challengeRecordId, 'challengeRecordId deve estar preenchido');
    console.log('✅ Challenge carregado:', challengeRecordId);

    // 3. Create Module Attempt
    console.log('3. Criando tentativa...');
    const attemptResult = await createModuleAttempt({
      module_id: moduleId,
      classroom_id: testClassroomId,
      classroom_name: 'Turma Teste',
      student_name: testStudentName,
      score: 0,
      max_score: 10,
      completed: false
    });
    attemptId = attemptResult.id;
    assert.ok(attemptId, 'attemptId deve ser retornado');
    console.log('✅ Tentativa criada:', attemptId);

    // 4. Update Module Attempt (Parcial)
    console.log('4. Atualizando tentativa (parcial)...');
    await updateModuleAttempt(attemptId, { score: 5 });
    console.log('✅ Tentativa atualizada (parcial)');

    // 5. Update Module Attempt (Finalizar)
    console.log('5. Finalizando tentativa...');
    await updateModuleAttempt(attemptId, { score: 10, completed: true, finished_at: new Date().toISOString() });
    console.log('✅ Tentativa finalizada');

    // 6. Create Open Text Response
    console.log('6. Enviando resposta open text...');
    await createOpenTextResponse({
      module_id: moduleId,
      challenge_id: challengeRecordId,
      student_name: testStudentName,
      classroom_id: testClassroomId,
      classroom_name: 'Turma Teste',
      student_access_id: 'test_access_123',
      response_text: '42',
      status: 'pending'
    });
    console.log('✅ Resposta enviada');

    // 7. Fetch Respostas (Professor)
    console.log('7. Professor busca respostas...');
    const teacherResponses = await fetchModuleOpenTextResponses(moduleId);
    assert.equal(teacherResponses.length, 1);
    assert.equal(teacherResponses[0].response_text, '42');
    responseId = teacherResponses[0].id;
    assert.ok(responseId, 'responseId deve ser retornado do fetch');
    console.log('✅ Professor encontrou a resposta:', responseId);

    // 8. Avaliar Resposta
    console.log('8. Avaliando resposta...');
    const reviewResult = await updateOpenTextResponseReview(responseId, {
      status: 'correta',
      teacher_feedback: 'Muito bem pensado!'
    });
    assert.ok(reviewResult.reviewed_at, 'reviewed_at deve estar preenchido');
    console.log('✅ Resposta avaliada');

    // 9. Fetch Respostas (Aluno)
    console.log('9. Aluno busca suas correcoes...');
    const studentResponses = await fetchStudentOpenTextResponses({
      studentName: testStudentName,
      classroomId: testClassroomId,
      studentAccessId: 'test_access_123'
    });
    // Can match more than 1 if left from previous failed runs, string match is enough
    const myResponse = studentResponses.find(r => r.id === responseId);
    assert.ok(myResponse, 'Resposta do aluno nao encontrada');
    assert.equal(myResponse.status, 'correta');
    assert.equal(myResponse.teacher_feedback, 'Muito bem pensado!');
    console.log('✅ Aluno verificou o feedback');

    // 10. Fetch Leaderboard
    console.log('10. Checando placar (Leaderboard)...');
    const leaderboard = await fetchModuleLeaderboard(moduleId, testStudentName, testClassroomId);
    assert.ok(leaderboard.top3.length > 0, 'Placar vazio');
    const leader = leaderboard.top3[0];
    assert.equal(leader.student_name, testStudentName);
    assert.equal(leader.score, 10);
    assert.equal(leader.completed, true);
    console.log('✅ Placar atualizado com a tentativa finalizada');

    // 11. Delete Open Text Response
    console.log('11. Deletando resposta...');
    await deleteOpenTextResponse(responseId);
    const teacherResponsesAfterDelete = await fetchModuleOpenTextResponses(moduleId);
    assert.equal(teacherResponsesAfterDelete.length, 0);
    console.log('✅ Resposta deletada');

  } catch (error) {
    console.error('❌ ERRO NO FLUXO DE INTEGRACAO:', error);
    process.exitCode = 1;
  } finally {
    // 12. Cleanup (Delete Module CASCADE)
    if (moduleId) {
      console.log('12. Deletando modulo (cleanup)...');
      try {
        await deleteModule(moduleId);
        console.log('✅ Limpeza concluida.');
      } catch(e) {
        console.error('❌ Erro no cleanup:', e);
      }
    }
  }
}

runFlow();
