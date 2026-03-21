import { test, expect } from '@playwright/test';

const MODULE_ID = 'module-open-text';
const CLASSROOM_A = { id: 'class-a', name: 'Ano 7 - Turma A', sort_order: 1, active: true, created_at: '2026-03-20T10:00:00.000Z' };
const CLASSROOM_B = { id: 'class-b', name: 'Ano 7 - Turma B', sort_order: 2, active: true, created_at: '2026-03-20T10:01:00.000Z' };

const moduleRow = {
  id: MODULE_ID,
  title: 'Modulo Resposta Aberta',
  author: 'Profa Teste',
  created_at: '2026-03-20T09:00:00.000Z',
};

const modulesListResponse = [
  {
    ...moduleRow,
    challenges: [{ count: 2 }],
  },
];

const challengesResponse = [
  {
    id: 'challenge-open-text',
    module_id: MODULE_ID,
    type: 'open_text',
    prompt: 'Escreva uma frase com sujeito simples.',
    difficulty: 1,
    sort_order: 1,
    data: {
      monster: { name: 'Monstro de Teste', sprite: 'monster_01' },
    },
  },
  {
    id: 'challenge-true-false',
    module_id: MODULE_ID,
    type: 'true_false',
    prompt: 'Julgue a afirmacao.',
    difficulty: 1,
    sort_order: 2,
    data: {
      statements: [{ text: 'Esta afirmacao e verdadeira.', correctAnswer: true }],
      explanation: 'Correto.',
      monster: { name: 'Monstro de Teste', sprite: 'monster_01' },
    },
  },
];

function getEqParam(url, key) {
  const raw = url.searchParams.get(key) || '';
  return raw.startsWith('eq.') ? raw.slice(3) : '';
}

function toRows(payload) {
  return Array.isArray(payload) ? payload : [payload];
}

async function startRunFromMenu(page, classroomName, studentName, responseText) {
  await page.goto('/');
  await page.locator('.module-card').filter({ hasText: 'Modulo Resposta Aberta' }).click();
  await page.getByLabel('Turma').selectOption({ label: classroomName });
  await page.locator('#student-name-input').fill(studentName);
  await page.getByRole('button', { name: 'Comecar' }).click();
  await finishRun(page, responseText);
}

async function startRunFromSession(page, classroomId, classroomName, studentName, responseText) {
  await page.goto('/');
  await page.evaluate(([id, name, student]) => {
    window.sessionStorage.setItem('alquimia-verbal:classroom-id', id);
    window.sessionStorage.setItem('alquimia-verbal:classroom-name', name);
    window.sessionStorage.setItem('alquimia-verbal:student-name', student);
  }, [classroomId, classroomName, studentName]);

  await page.goto(`/#/play/${MODULE_ID}`);
  await finishRun(page, responseText);
}

async function finishRun(page, responseText) {
  let answeredSteps = 0;

  for (let attempt = 0; attempt < 20; attempt++) {
    if (await page.getByText('Parabens!').isVisible()) return;

    if (await page.locator('.open-text-renderer').isVisible()) {
      await page.getByPlaceholder('Escreva sua resposta aqui...').fill(responseText);
      await page.getByRole('button', { name: 'Enviar resposta' }).click();
      await page.waitForTimeout(250);
      answeredSteps += 1;
      continue;
    }

    if (await page.locator('.true-false-renderer').isVisible()) {
      await page.getByRole('button', { name: 'Verdadeiro' }).click();
      await page.getByRole('button', { name: 'Confirmar' }).click();
      await page.waitForTimeout(900);
      answeredSteps += 1;
      if (answeredSteps >= 2) break;
      continue;
    }

    await page.waitForTimeout(250);
  }

  await expect(page.getByText('Parabens!')).toBeVisible();
}

test('fecha o ciclo de resposta aberta com turma, correcao, exclusao e ranking separado', async ({ page }) => {
  let responseCount = 0;
  let attemptCount = 0;
  let openTextResponses = [];
  let moduleAttempts = [];

  await page.route('**/rest/v1/classrooms*', async (route, request) => {
    if (request.method() !== 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    const url = new URL(request.url());
    const activeFilter = url.searchParams.get('active');
    const rows = activeFilter === 'eq.true'
      ? [CLASSROOM_A, CLASSROOM_B].filter((row) => row.active)
      : [CLASSROOM_A, CLASSROOM_B];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(rows),
    });
  });

  await page.route('**/rest/v1/modules*', async (route, request) => {
    if (request.method() !== 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    const url = new URL(request.url());
    const acceptHeader = request.headers().accept || '';
    const idFilter = url.searchParams.get('id') || '';
    const isSingle = acceptHeader.includes('application/vnd.pgrst.object+json') || idFilter.startsWith('eq.');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isSingle ? moduleRow : modulesListResponse),
    });
  });

  await page.route('**/rest/v1/challenges*', async (route, request) => {
    if (request.method() !== 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(challengesResponse),
    });
  });

  await page.route('**/rest/v1/open_text_responses*', async (route, request) => {
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'POST') {
      const rows = toRows(request.postDataJSON()).map((row) => ({
        id: `response-${++responseCount}`,
        module_id: row.module_id,
        challenge_id: row.challenge_id,
        classroom_id: row.classroom_id || null,
        classroom_name: row.classroom_name || '',
        student_name: row.student_name,
        response_text: row.response_text,
        status: row.status || 'pending',
        teacher_feedback: row.teacher_feedback || '',
        reviewed_at: row.reviewed_at || null,
        created_at: `2026-03-21T10:00:0${responseCount}.000Z`,
      }));

      openTextResponses = [...rows, ...openTextResponses];

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(rows),
      });
      return;
    }

    if (method === 'PATCH') {
      const responseId = getEqParam(url, 'id');
      const payload = request.postDataJSON();

      openTextResponses = openTextResponses.map((row) =>
        row.id === responseId ? { ...row, ...payload } : row
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (method === 'DELETE') {
      const responseId = getEqParam(url, 'id');
      openTextResponses = openTextResponses.filter((row) => row.id !== responseId);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (method === 'GET') {
      const moduleId = getEqParam(url, 'module_id');
      const studentName = getEqParam(url, 'student_name');
      const rawOrFilter = url.searchParams.get('or') || '';
      const classroomMatch = rawOrFilter.match(/classroom_id\.eq\.([^,)\s]+)/);
      const classroomId = classroomMatch?.[1] || '';

      let rows = [...openTextResponses];

      if (moduleId) {
        rows = rows.filter((row) => row.module_id === moduleId);
      }

      if (studentName) {
        rows = rows.filter((row) => row.student_name === studentName);
      }

      if (classroomId) {
        rows = rows.filter((row) => row.classroom_id === classroomId || row.classroom_id == null);
      }

      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rows),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route('**/rest/v1/module_attempts*', async (route, request) => {
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'POST') {
      const rows = toRows(request.postDataJSON()).map((row) => ({
        ...row,
        id: `attempt-${++attemptCount}`,
        created_at: `2026-03-21T11:00:0${attemptCount}.000Z`,
      }));

      moduleAttempts = [...rows, ...moduleAttempts];

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(rows),
      });
      return;
    }

    if (method === 'GET') {
      const moduleId = getEqParam(url, 'module_id');
      const rows = moduleId
        ? moduleAttempts.filter((row) => row.module_id === moduleId)
        : moduleAttempts;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rows),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await startRunFromMenu(page, CLASSROOM_A.name, 'Alex', 'Resposta da turma A');
  await startRunFromSession(page, CLASSROOM_B.id, CLASSROOM_B.name, 'Alex', 'Resposta da turma B');

  await page.goto('/#/editor');
  await page.getByPlaceholder('Senha').fill('prof2026');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('button', { name: /📝 Respostas/i }).click();

  await expect(page.getByText(CLASSROOM_B.name).first()).toBeVisible();
  await expect(page.getByText(CLASSROOM_A.name).first()).toBeVisible();

  await expect(page.getByText('Resposta da turma B')).toBeVisible();
  await page.getByLabel('Status da correcao').selectOption('correta');
  await page.getByLabel('Feedback do professor (opcional)').fill('Boa resposta, turma B.');
  await page.getByRole('button', { name: 'Salvar correcao' }).click();
  await expect(page.getByText('Correcao salva com sucesso.')).toBeVisible();

  await page.getByRole('button', { name: /Ano 7 - Turma A/ }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Excluir resposta' }).click();

  await expect(page.getByRole('button', { name: /Ano 7 - Turma A/ })).toHaveCount(0);
  await expect(page.getByText('Resposta da turma B')).toBeVisible();

  await page.goto('/');
  await page.getByRole('button', { name: /Ver minhas corre/i }).click();

  await expect(page.getByText(CLASSROOM_B.name).first()).toBeVisible();
  await expect(page.getByText('Boa resposta, turma B.')).toBeVisible();
  await expect(page.getByText('Resposta da turma B')).toBeVisible();
  await expect(page.getByText('Resposta da turma A')).toHaveCount(0);

  await page.getByRole('button', { name: /Voltar/i }).click();
  await page.getByRole('button', { name: /placar/i }).click();

  await expect(page.getByText(CLASSROOM_A.name).first()).toBeVisible();
  await expect(page.getByText(CLASSROOM_B.name).first()).toBeVisible();
});
