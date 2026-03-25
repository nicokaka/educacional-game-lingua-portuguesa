import { test, expect } from '@playwright/test';

const MODULE_ID = 'module-1';

async function startPlaySession(page) {
  await page.goto('/');
  await page.evaluate(() => {
    window.sessionStorage.setItem('alquimia-verbal:classroom-id', 'class-test');
    window.sessionStorage.setItem('alquimia-verbal:classroom-name', 'Turma Teste');
    window.sessionStorage.setItem('alquimia-verbal:student-name', 'Aluno Teste');
  });
  await page.goto(`/#/play/${MODULE_ID}`);
}

const modulesListResponse = [
  {
    id: MODULE_ID,
    title: 'Modulo E2E',
    author: 'Teste',
    created_at: '2026-03-13T00:00:00.000Z',
    updated_at: '2026-03-13T00:00:00.000Z',
    challenges: [{ count: 2 }],
  },
];

const moduleSingleResponse = {
  id: MODULE_ID,
  title: 'Modulo E2E',
  author: 'Teste',
  created_at: '2026-03-13T00:00:00.000Z',
  updated_at: '2026-03-13T00:00:00.000Z',
};

const challengesResponse = [
  {
    id: 'challenge-1',
    module_id: MODULE_ID,
    type: 'true_false',
    prompt: 'Primeira pergunta',
    difficulty: 1,
    sort_order: 1,
    data: {
      correctAnswer: true,
      explanation: 'Primeira explicacao',
      monster: { name: 'Monstro de Teste', sprite: 'monster_test' },
    },
  },
  {
    id: 'challenge-2',
    module_id: MODULE_ID,
    type: 'multiple_choice',
    prompt: 'Pergunta sem ids nas alternativas',
    difficulty: 1,
    sort_order: 2,
    data: {
      monster: { name: 'Monstro de Teste', sprite: 'monster_test' },
      options: [
        { text: 'Alternativa errada', correct: false, feedback: '' },
        { text: 'Alternativa certa', correct: true, feedback: '' },
      ],
    },
  },
  {
    id: 'challenge-3',
    module_id: MODULE_ID,
    type: 'true_false',
    prompt: 'Segunda pergunta',
    difficulty: 1,
    sort_order: 3,
    data: {
      correctAnswer: false,
      explanation: 'Segunda explicacao',
      monster: { name: 'Monstro de Teste', sprite: 'monster_test' },
    },
  },
];

test.beforeEach(async ({ page }) => {
  let moduleAttempts = [];
  let attemptCount = 0;

  await page.route('**/rest/v1/modules*', async (route, request) => {
    const acceptHeader = request.headers().accept || '';
    const url = new URL(request.url());
    const isSingle = acceptHeader.includes('application/vnd.pgrst.object+json') || url.searchParams.has('id');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isSingle ? moduleSingleResponse : modulesListResponse),
    });
  });

  await page.route('**/rest/v1/challenges*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(challengesResponse),
    });
  });

  await page.route('**/rest/v1/module_attempts*', async (route, request) => {
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'POST') {
      const payload = request.postDataJSON();
      const rows = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
        ...row,
        id: `attempt-${++attemptCount}`,
        created_at: row.created_at || `2026-03-21T11:00:0${attemptCount}.000Z`,
      }));
      moduleAttempts = [...rows, ...moduleAttempts];

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(rows),
      });
      return;
    }

    if (method === 'PATCH') {
      const idFilter = url.searchParams.get('id') || '';
      const attemptId = idFilter.startsWith('eq.') ? idFilter.slice(3) : '';
      const payload = request.postDataJSON();

      moduleAttempts = moduleAttempts.map((row) =>
        row.id === attemptId ? { ...row, ...payload } : row
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(moduleAttempts.filter((row) => row.id === attemptId)),
      });
      return;
    }

    if (method === 'GET') {
      const moduleIdFilter = url.searchParams.get('module_id') || '';
      const moduleId = moduleIdFilter.startsWith('eq.') ? moduleIdFilter.slice(3) : '';
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

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
});

async function getVisiblePrompt(page) {
  for (let attempt = 0; attempt < 25; attempt++) {
    for (const prompt of ['Primeira pergunta', 'Pergunta sem ids nas alternativas', 'Segunda pergunta']) {
      if (await page.getByText(prompt, { exact: true }).isVisible()) {
        return prompt;
      }
    }

    await page.waitForTimeout(200);
  }

  throw new Error('Nenhuma pergunta esperada apareceu na tela.');
}

async function answerCurrentQuestionCorrectly(page) {
  const prompt = await getVisiblePrompt(page);

  if (prompt === 'Pergunta sem ids nas alternativas') {
    const optionButton = page.getByRole('button', { name: 'Alternativa certa' });
    await expect(optionButton).toBeEnabled({ timeout: 5000 });
    await optionButton.click();
    const confirmButton = page.getByRole('button', { name: /Confirmar/i });
    await expect(confirmButton).toBeEnabled({ timeout: 5000 });
    await confirmButton.click();
    await page.waitForTimeout(900);
    return prompt;
  }

  const answer = prompt === 'Primeira pergunta' ? 'Verdadeiro' : 'Falso';
  const answerButton = page.getByRole('button', { name: answer });
  await expect(answerButton).toBeEnabled({ timeout: 5000 });
  await answerButton.click();
  const confirmButton = page.getByRole('button', { name: 'Confirmar' });
  await expect(confirmButton).toBeEnabled({ timeout: 5000 });
  await confirmButton.click();
  await page.waitForTimeout(900);
  return prompt;
}

test('entra no modulo sem loading infinito e avanca para a segunda pergunta', async ({ page }) => {
  await startPlaySession(page);
  await expect(page.getByText('Carregando desafios...')).toHaveCount(0);

  const promptBefore = await getVisiblePrompt(page);
  expect(promptBefore).toBe('Primeira pergunta');
  await answerCurrentQuestionCorrectly(page);

  await expect(page.getByText('2/3')).toBeVisible({ timeout: 5000 });
  const promptAfter = await getVisiblePrompt(page);

  expect(promptAfter).toBe('Pergunta sem ids nas alternativas');
});

test('consegue renderizar e responder multiple choice mesmo quando o Supabase nao envia ids nas opcoes', async ({ page }) => {
  await startPlaySession(page);
  while ((await getVisiblePrompt(page)) !== 'Pergunta sem ids nas alternativas') {
    await answerCurrentQuestionCorrectly(page);
  }

  await expect(page.getByRole('button', { name: 'Alternativa certa' })).toBeVisible();

  await page.getByRole('button', { name: 'Alternativa certa' }).click();
  await page.getByRole('button', { name: /Confirmar/i }).click();
  await page.waitForTimeout(900);

  await expect(page.getByText('Pergunta sem ids nas alternativas')).toHaveCount(0);

  const isVictory = await page.getByText('Parabens!').isVisible();
  if (!isVictory) {
    const promptAfter = await getVisiblePrompt(page);
    expect(promptAfter).not.toBe('Pergunta sem ids nas alternativas');
  }
});

test('salva module_attempts imediatamente ao acertar a ultima pergunta', async ({ page }) => {
  let postCount = 0;
  let patchCount = 0;

  await page.route('**/rest/v1/module_attempts*', async (route, request) => {
    if (request.method() === 'POST') {
      postCount++;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([{ id: `attempt-${postCount}` }]),
      });
      return;
    }

    if (request.method() === 'PATCH') {
      patchCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'attempt-1' }]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await startPlaySession(page);

  while ((await getVisiblePrompt(page)) !== 'Segunda pergunta') {
    await answerCurrentQuestionCorrectly(page);
  }

  const attemptRequest = page.waitForRequest(
    (request) =>
      request.url().includes('/rest/v1/module_attempts') &&
      request.method() === 'PATCH' &&
      String(request.postData() || '').includes('"completed":true'),
    { timeout: 2500 }
  );

  await page.getByRole('button', { name: 'Falso' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();

  await attemptRequest;
  await expect(page.getByText('Parabens!')).toBeVisible();
  expect(postCount).toBe(1);
  expect(patchCount).toBeGreaterThan(0);
});

test('run perfeita chega ao maximo de pontos com conta intuitiva', async ({ page }) => {
  await startPlaySession(page);

  while (!await page.getByText('Parabens!').isVisible()) {
    await answerCurrentQuestionCorrectly(page);
  }

  await expect(page.locator('.score-ratio')).toContainText('30');
  await expect(page.locator('.score-ratio')).toContainText('/');
  await expect(page.locator('.score-ratio')).toContainText('30');
});

test('placar mostra aluno em andamento antes de terminar o modulo', async ({ page }) => {
  await startPlaySession(page);
  await expect(page.getByText('Primeira pergunta')).toBeVisible();

  await page.goto('/');
  await page.locator('.module-rank-btn').click();

  await expect(page.getByText('Aluno Teste').first()).toBeVisible();
  await expect(page.getByText('Em andamento').first()).toBeVisible();
});

test('mostra aviso visual e tenta salvar novamente ao sair apos falha no salvamento final', async ({ page }) => {
  let postCount = 0;
  let finalPatchCount = 0;

  await page.route('**/rest/v1/module_attempts*', async (route, request) => {
    if (request.method() === 'POST') {
      postCount++;

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([{ id: `attempt-${postCount}` }]),
      });
      return;
    }

    if (request.method() === 'PATCH') {
      const payload = request.postDataJSON();
      const isFinalSave = payload?.completed === true && payload?.finished_at;

      if (isFinalSave) {
        finalPatchCount++;

        if (finalPatchCount === 1) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'temporary failure' }),
          });
          return;
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'attempt-1' }]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await startPlaySession(page);

  while (true) {
    const prompt = await getVisiblePrompt(page);

    if (prompt === 'Segunda pergunta') {
      await page.getByRole('button', { name: 'Falso' }).click();
      await page.getByRole('button', { name: 'Confirmar' }).click();
      break;
    }

    await answerCurrentQuestionCorrectly(page);
  }

  await expect(page.getByText('Parabens!')).toBeVisible();
  await expect(page.getByText('Nao foi possivel salvar seu resultado agora. Vamos tentar novamente quando voce sair desta tela.')).toBeVisible();

  await page.getByRole('button', { name: 'Escolher Outro Modulo' }).click();

  await expect(page).toHaveURL(/#\/$/);
  expect(postCount).toBe(1);
  expect(finalPatchCount).toBe(2);
});
