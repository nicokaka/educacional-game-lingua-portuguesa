import { test, expect } from '@playwright/test';

function getEqParam(url, key) {
  const raw = url.searchParams.get(key) || '';
  return raw.startsWith('eq.') ? raw.slice(3) : '';
}

async function startPlaySession(page, moduleId) {
  await page.goto('/');
  await page.evaluate(() => {
    window.sessionStorage.setItem('alquimia-verbal:classroom-id', 'class-test');
    window.sessionStorage.setItem('alquimia-verbal:classroom-name', 'Turma Teste');
    window.sessionStorage.setItem('alquimia-verbal:student-name', 'Aluno Teste');
  });
  await page.goto(`/#/play/${moduleId}`);
}

async function loginToEditor(page) {
  await page.goto('/#/editor');
  await page.getByPlaceholder('Senha').fill('prof2026');
  await page.getByRole('button', { name: 'Entrar' }).click();
}

function createModuleRoutes(page, { moduleId, title, author, challenges }) {
  const modulesListResponse = [
    {
      id: moduleId,
      title,
      author,
      created_at: '2026-03-14T00:00:00.000Z',
      updated_at: '2026-03-14T00:00:00.000Z',
      challenges: [{ count: challenges.length }],
    },
  ];

  const moduleSingleResponse = {
    id: moduleId,
    title,
    author,
    created_at: '2026-03-14T00:00:00.000Z',
    updated_at: '2026-03-14T00:00:00.000Z',
  };

  return Promise.all([
    page.route('**/rest/v1/modules*', async (route, request) => {
      const acceptHeader = request.headers().accept || '';
      const url = new URL(request.url());
      const isSingle = acceptHeader.includes('application/vnd.pgrst.object+json') || url.searchParams.has('id');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingle ? moduleSingleResponse : modulesListResponse),
      });
    }),
    page.route('**/rest/v1/challenges*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(challenges),
      });
    }),
  ]);
}

async function answerCurrentChallengeCorrectly(page) {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (
      await page.locator('.multiple-choice-renderer, .drag-drop-renderer, .ordering-renderer, .true-false-renderer').isVisible()
    ) {
      break;
    }
    await page.waitForTimeout(150);
  }

  if (await page.locator('.multiple-choice-renderer').isVisible()) {
    const optionButton = page.getByRole('button', { name: 'Alternativa correta' });
    await expect(optionButton).toBeEnabled({ timeout: 5000 });
    await optionButton.click();
    const confirmButton = page.getByRole('button', { name: 'Confirmar' });
    await expect(confirmButton).toBeEnabled({ timeout: 5000 });
    await confirmButton.click();
    return;
  }

  if (await page.locator('.drag-drop-renderer').isVisible()) {
    const wordButton = page.getByRole('button', { name: 'correta' });
    await expect(wordButton).toBeEnabled({ timeout: 5000 });
    await wordButton.click();
    const confirmButton = page.getByRole('button', { name: 'Confirmar' });
    await expect(confirmButton).toBeEnabled({ timeout: 5000 });
    await confirmButton.click();
    return;
  }

  if (await page.locator('.ordering-renderer').isVisible()) {
    const confirmButton = page.getByRole('button', { name: 'Confirmar' });
    await expect(confirmButton).toBeEnabled({ timeout: 5000 });
    await confirmButton.click();
    return;
  }

  if (await page.locator('.true-false-renderer').isVisible()) {
    const promptText = await page.locator('.statement-text').first().innerText();
    const shouldBeTrue = promptText.includes('verdadeira');
    const answerButton = page.getByRole('button', { name: shouldBeTrue ? 'Verdadeiro' : 'Falso' });
    await expect(answerButton).toBeEnabled({ timeout: 5000 });
    await answerButton.click();
    const confirmButton = page.getByRole('button', { name: 'Confirmar' });
    await expect(confirmButton).toBeEnabled({ timeout: 5000 });
    await confirmButton.click();
    return;
  }

  throw new Error('Nenhum tipo de desafio reconhecido na tela.');
}

async function readMonsterHp(page) {
  const hpText = (await page.locator('.monster-hp-text').innerText()).trim();
  const [currentRaw, maxRaw] = hpText.split('/');
  return {
    current: Number(currentRaw),
    max: Number(maxRaw),
  };
}

test('completa modulo com 4 tipos de desafio e chega na vitoria', async ({ page }) => {
  const moduleId = 'module-full-flow';
  const challenges = [
    {
      id: 'tf-1',
      module_id: moduleId,
      type: 'true_false',
      prompt: 'Julgue a afirmacao.',
      difficulty: 1,
      sort_order: 1,
      data: {
        statements: [{ text: 'Esta afirmacao e verdadeira.', correctAnswer: true }],
        explanation: 'Correto.',
        monster: { name: 'Monstro de Teste', sprite: 'monster_01' },
      },
    },
    {
      id: 'mc-1',
      module_id: moduleId,
      type: 'multiple_choice',
      prompt: 'Escolha a alternativa correta',
      difficulty: 1,
      sort_order: 2,
      data: {
        monster: { name: 'Monstro de Teste', sprite: 'monster_02' },
        options: [
          { text: 'Alternativa errada', correct: false, feedback: '' },
          { text: 'Alternativa correta', correct: true, feedback: '' },
        ],
      },
    },
    {
      id: 'dd-1',
      module_id: moduleId,
      type: 'drag_drop',
      prompt: 'A palavra certa e _____.',
      difficulty: 1,
      sort_order: 3,
      data: {
        correctAnswer: 'correta',
        hint: 'Pense na palavra correta.',
        monster: { name: 'Monstro de Teste', sprite: 'monster_03' },
        loot: [
          { text: 'correta', correct: true },
          { text: 'errata', correct: false },
        ],
      },
    },
    {
      id: 'ord-1',
      module_id: moduleId,
      type: 'ordering',
      prompt: 'Organize a frase',
      difficulty: 1,
      sort_order: 4,
      data: {
        fragments: ['eu', 'estudo', 'portugues'],
        shuffled: false,
        monster: { name: 'Monstro de Teste', sprite: 'monster_04' },
      },
    },
  ];

  await createModuleRoutes(page, {
    moduleId,
    title: 'Modulo Fluxo Completo',
    author: 'Teste',
    challenges,
  });

  await startPlaySession(page, moduleId);

  for (let step = 0; step < 4; step++) {
    await answerCurrentChallengeCorrectly(page);
    await page.waitForTimeout(950);
  }

  await expect(page.getByText('Parabens!')).toBeVisible();
  await expect(page.getByText('4', { exact: true })).toBeVisible();
});

test('resposta errada aumenta hp do monstro apos ele tomar dano', async ({ page }) => {
  const moduleId = 'module-wrong-answer';
  const challenges = [
    {
      id: 'tf-1',
      module_id: moduleId,
      type: 'true_false',
      prompt: 'Primeira',
      difficulty: 1,
      sort_order: 1,
      data: {
        statements: [{ text: 'Esta afirmacao e verdadeira.', correctAnswer: true }],
        explanation: 'Primeira explicacao',
        monster: { name: 'Monstro de Teste', sprite: 'monster_01' },
      },
    },
    {
      id: 'tf-2',
      module_id: moduleId,
      type: 'true_false',
      prompt: 'Segunda',
      difficulty: 1,
      sort_order: 2,
      data: {
        statements: [{ text: 'Esta afirmacao e falsa.', correctAnswer: false }],
        explanation: 'Segunda explicacao',
        monster: { name: 'Monstro de Teste', sprite: 'monster_01' },
      },
    },
  ];

  await createModuleRoutes(page, {
    moduleId,
    title: 'Modulo Erro',
    author: 'Teste',
    challenges,
  });

  await startPlaySession(page, moduleId);

  const firstStatementText = await page.locator('.statement-text').first().innerText();
  const firstCorrectIsTrue = firstStatementText.includes('verdadeira');
  await page.getByRole('button', { name: firstCorrectIsTrue ? 'Verdadeiro' : 'Falso' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await page.waitForTimeout(950);

  const hpAfterCorrect = await readMonsterHp(page);

  const secondStatementText = await page.locator('.statement-text').first().innerText();
  const secondCorrectIsTrue = secondStatementText.includes('verdadeira');
  await page.getByRole('button', { name: secondCorrectIsTrue ? 'Falso' : 'Verdadeiro' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.locator('.bizu-label')).toBeVisible();

  const hpAfterWrong = await readMonsterHp(page);
  expect(hpAfterWrong.current).toBeGreaterThan(hpAfterCorrect.current);
  expect(hpAfterWrong.current).toBeLessThanOrEqual(hpAfterWrong.max);
});

test('entra em game over apos sequencia de erros', async ({ page }) => {
  const moduleId = 'module-game-over';
  const challenges = [
    {
      id: 'tf-game-over',
      module_id: moduleId,
      type: 'true_false',
      prompt: 'Unico desafio',
      difficulty: 3,
      sort_order: 1,
      data: {
        statements: [{ text: 'Esta afirmacao e verdadeira.', correctAnswer: true }],
        explanation: 'Explicacao',
        monster: { name: 'Monstro de Teste', sprite: 'monster_01' },
      },
    },
  ];

  await createModuleRoutes(page, {
    moduleId,
    title: 'Modulo Derrota',
    author: 'Teste',
    challenges,
  });

  await startPlaySession(page, moduleId);

  for (let attempt = 0; attempt < 8; attempt++) {
    if (await page.getByRole('heading', { name: 'Quase la!' }).isVisible()) break;

    const wrongButton = page.getByRole('button', { name: 'Falso' });
    if (await wrongButton.isVisible()) {
      await wrongButton.click();
      await page.getByRole('button', { name: 'Confirmar' }).click();
      await page.waitForTimeout(1000);
    }
  }

  await expect(page.getByRole('heading', { name: 'Quase la!' })).toBeVisible();
  await expect(page.getByAltText('Professor orientando tentar novamente')).toBeVisible();
});

test('edita modulo existente e persiste no backend', async ({ page }) => {
  const moduleId = 'module-edit-1';
  const modulesListResponse = [
    {
      id: moduleId,
      title: 'Modulo Original',
      author: 'Profa',
      created_at: '2026-03-14T00:00:00.000Z',
      updated_at: '2026-03-14T00:00:00.000Z',
      challenges: [{ count: 1 }],
    },
  ];
  const moduleSingleResponse = {
    id: moduleId,
    title: 'Modulo Original',
    author: 'Profa',
    created_at: '2026-03-14T00:00:00.000Z',
    updated_at: '2026-03-14T00:00:00.000Z',
  };
  let challengesResponse = [
    {
      id: 'challenge-edit-1',
      module_id: moduleId,
      type: 'multiple_choice',
      prompt: 'Pergunta original',
      difficulty: 1,
      sort_order: 1,
      data: {
        monster: { name: 'Monstro de Teste', sprite: 'monster_01' },
        options: [
          { id: 'a', text: 'Errada', correct: false, feedback: '' },
          { id: 'b', text: 'Certa', correct: true, feedback: '' },
        ],
      },
    },
  ];

  let updatePayload = null;
  let deleteCallCount = 0;
  let insertedChallengesPayload = null;
  let updatedChallengeRequests = [];

  await page.route('**/rest/v1/modules*', async (route, request) => {
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'GET') {
      const acceptHeader = request.headers().accept || '';
      const isSingle = acceptHeader.includes('application/vnd.pgrst.object+json') || url.searchParams.has('id');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingle ? moduleSingleResponse : modulesListResponse),
      });
      return;
    }

    if (method === 'PATCH') {
      updatePayload = request.postDataJSON();
      moduleSingleResponse.title = updatePayload.title;
      moduleSingleResponse.author = updatePayload.author;
      modulesListResponse[0].title = updatePayload.title;
      modulesListResponse[0].author = updatePayload.author;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route('**/rest/v1/challenges*', async (route, request) => {
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(challengesResponse),
      });
      return;
    }

    if (method === 'PATCH') {
      const challengeId = getEqParam(url, 'id');
      const payload = request.postDataJSON();
      updatedChallengeRequests.push({ challengeId, payload });
      challengesResponse = challengesResponse.map((row) =>
        row.id === challengeId ? { ...row, ...payload } : row
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (method === 'DELETE') {
      deleteCallCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (method === 'POST') {
      insertedChallengesPayload = request.postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(insertedChallengesPayload),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await loginToEditor(page);

  await expect(page.getByText('Modulo Original')).toBeVisible();
  await page.getByRole('button', { name: /Editar/i }).click();

  await page.getByPlaceholder('Título do Formulário (Ex: Ortografia - 6º Ano)').fill('Modulo Editado');
  await page.locator('.prompt-input').first().fill('Pergunta editada');

  await page.getByRole('button', { name: 'Salvar Módulo' }).click();
  await expect(page.getByText('✅ Salvo!')).toBeVisible();

  expect(updatePayload).toEqual({ title: 'Modulo Editado', author: 'Profa' });
  expect(deleteCallCount).toBe(0);
  expect(insertedChallengesPayload).toBeNull();
  expect(updatedChallengeRequests).toEqual([
    {
      challengeId: 'challenge-edit-1',
      payload: {
        module_id: moduleId,
        type: 'multiple_choice',
        prompt: 'Pergunta editada',
        difficulty: 1,
        data: {
          monster: { name: 'Monstro de Teste', sprite: 'monster_01' },
          options: [
            { id: 'a', text: 'Errada', correct: false, feedback: '' },
            { id: 'b', text: 'Certa', correct: true, feedback: '' },
          ],
        },
        sort_order: 1,
      },
    },
  ]);
});

test('mantem challenge_id valido para open_text apos editar modulo sem recriar a linha', async ({ page, context }) => {
  const moduleId = 'module-open-text-stable';
  const moduleRow = {
    id: moduleId,
    title: 'Modulo Aberto',
    author: 'Profa',
    created_at: '2026-03-14T00:00:00.000Z',
    updated_at: '2026-03-14T00:00:00.000Z',
  };
  const modulesListResponse = [{ ...moduleRow, challenges: [{ count: 1 }] }];
  let challengeRows = [
    {
      id: 'challenge-open-text-1',
      module_id: moduleId,
      type: 'open_text',
      prompt: 'Escreva uma frase com sujeito simples.',
      difficulty: 1,
      sort_order: 1,
      data: {
        monster: { name: 'Monstro de Teste', sprite: 'monster_01' },
      },
    },
  ];

  const validChallengeIds = new Set(challengeRows.map((row) => row.id));
  const submittedChallengeIds = [];

  await context.route('**/rest/v1/modules*', async (route, request) => {
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'GET') {
      const acceptHeader = request.headers().accept || '';
      const isSingle = acceptHeader.includes('application/vnd.pgrst.object+json') || url.searchParams.has('id');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingle ? moduleRow : modulesListResponse),
      });
      return;
    }

    if (method === 'PATCH') {
      const payload = request.postDataJSON();
      moduleRow.title = payload.title;
      moduleRow.author = payload.author;
      modulesListResponse[0].title = payload.title;
      modulesListResponse[0].author = payload.author;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await context.route('**/rest/v1/challenges*', async (route, request) => {
    const method = request.method();
    const url = new URL(request.url());

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(challengeRows),
      });
      return;
    }

    if (method === 'PATCH') {
      const challengeId = getEqParam(url, 'id');
      const payload = request.postDataJSON();
      challengeRows = challengeRows.map((row) => row.id === challengeId ? { ...row, ...payload } : row);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    if (method === 'POST') {
      const rows = Array.isArray(request.postDataJSON()) ? request.postDataJSON() : [request.postDataJSON()];
      for (const [index, row] of rows.entries()) {
        const newId = `new-challenge-${index + 1}`;
        challengeRows.push({ ...row, id: newId });
        validChallengeIds.add(newId);
      }
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    if (method === 'DELETE') {
      const ids = (url.searchParams.get('id') || '')
        .replace(/^in\.\(/, '')
        .replace(/\)$/, '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      challengeRows = challengeRows.filter((row) => !ids.includes(row.id));
      ids.forEach((id) => validChallengeIds.delete(id));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await context.route('**/rest/v1/open_text_responses*', async (route, request) => {
    if (request.method() !== 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    const payload = request.postDataJSON();
    submittedChallengeIds.push(payload.challenge_id);

    if (!validChallengeIds.has(payload.challenge_id)) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'insert or update on table open_text_responses violates foreign key constraint open_text_responses_challenge_id_fkey',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'response-1', ...payload }]),
    });
  });

  const studentPage = page;
  await startPlaySession(studentPage, moduleId);
  await expect(studentPage.locator('.open-text-renderer')).toBeVisible();

  const teacherPage = await context.newPage();
  await loginToEditor(teacherPage);
  await teacherPage.getByRole('button', { name: /Editar/i }).click();
  await teacherPage.locator('.prompt-input').first().fill('Escreva uma frase com sujeito composto.');
  await teacherPage.getByRole('button', { name: /Salvar/i }).click();
  await expect(teacherPage.getByText(/Salvo/i)).toBeVisible();

  await studentPage.getByPlaceholder('Escreva sua resposta aqui...').fill('Os alunos estudaram.');
  await studentPage.getByRole('button', { name: 'Enviar resposta' }).click();
  await expect(studentPage.getByText('Parabens!')).toBeVisible();

  expect(submittedChallengeIds).toEqual(['challenge-open-text-1']);
});

test('bloqueia salvar drag_drop sem a lacuna obrigatoria', async ({ page }) => {
  const modulesListResponse = [
    {
      id: 'existing-module',
      title: 'Modulo Ja Existente',
      author: 'Profa',
      created_at: '2026-03-14T00:00:00.000Z',
      updated_at: '2026-03-14T00:00:00.000Z',
      challenges: [{ count: 1 }],
    },
  ];
  let modulePostCount = 0;
  let challengePostCount = 0;

  await page.route('**/rest/v1/modules*', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(modulesListResponse) });
      return;
    }

    modulePostCount += 1;
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 'new-module' }]) });
  });

  await page.route('**/rest/v1/challenges*', async (route, request) => {
    if (request.method() === 'POST') {
      challengePostCount += 1;
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await loginToEditor(page);
  await page.locator('.page-header .new-btn').nth(1).click();

  await page.locator('.title-input').fill('Modulo Drag Drop');
  await page.getByRole('button', { name: /Adicionar Pergunta/i }).click();
  await page.locator('#type-select').selectOption('drag_drop');
  await page.locator('.prompt-input').first().fill('Complete a frase sem lacuna marcada');
  await page.getByPlaceholder('Palavra que preenche a lacuna').fill('correta');
  await page.getByPlaceholder('Opcao da mochila 1').fill('errada');
  await page.getByPlaceholder('Opcao da mochila 2').fill('outra');

  await page.getByRole('button', { name: /Salvar/i }).click();
  await expect(page.locator('.save-error')).toContainText('Use "_____" no enunciado para marcar a lacuna da resposta.');
  expect(modulePostCount).toBe(0);
  expect(challengePostCount).toBe(0);
});

test('bloqueia salvar true_false com afirmacao vazia', async ({ page }) => {
  const modulesListResponse = [
    {
      id: 'existing-module',
      title: 'Modulo Ja Existente',
      author: 'Profa',
      created_at: '2026-03-14T00:00:00.000Z',
      updated_at: '2026-03-14T00:00:00.000Z',
      challenges: [{ count: 1 }],
    },
  ];

  await page.route('**/rest/v1/modules*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(modulesListResponse) });
  });

  await page.route('**/rest/v1/challenges*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await loginToEditor(page);
  await page.locator('.page-header .new-btn').nth(1).click();

  await page.locator('.title-input').fill('Modulo True False');
  await page.getByRole('button', { name: /Adicionar Pergunta/i }).click();
  await page.locator('#type-select').selectOption('true_false');
  await page.locator('.prompt-input').first().fill('Julgue as afirmacoes abaixo.');

  await page.getByRole('button', { name: /Salvar/i }).click();
  await expect(page.locator('.save-error')).toContainText('Preencha a afirmacao 1.');
});

test('mantem prompt visivel quando a questao possui imagem', async ({ page }) => {
  const moduleId = 'module-image-prompt';
  const imageDataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const challenges = [
    {
      id: 'mc-image-1',
      module_id: moduleId,
      type: 'multiple_choice',
      prompt: 'Leia a imagem e marque a alternativa correta.',
      difficulty: 1,
      sort_order: 1,
      data: {
        imageUrl: imageDataUrl,
        imageAlt: 'Imagem de teste',
        imageCaption: 'Legenda de teste',
        monster: { name: 'Monstro de Teste', sprite: 'monster_01' },
        options: [
          { text: 'Alternativa errada', correct: false, feedback: '' },
          { text: 'Alternativa correta', correct: true, feedback: '' },
        ],
      },
    },
  ];

  await createModuleRoutes(page, {
    moduleId,
    title: 'Modulo com Imagem',
    author: 'Teste',
    challenges,
  });

  await startPlaySession(page, moduleId);

  await expect(page.getByText('Leia a imagem e marque a alternativa correta.')).toBeVisible();
  await expect(page.getByAltText('Imagem de teste')).toBeVisible();
  await expect(page.getByText('Legenda de teste')).toBeVisible();
});

test('placar mostra nao concluiu para tentativa salva com completed false', async ({ page }) => {
  const moduleId = 'module-leaderboard-status';
  const classroom = {
    id: 'class-test',
    name: 'Turma Teste',
    sort_order: 1,
    active: true,
    created_at: '2026-03-20T10:00:00.000Z',
  };
  const modulesListResponse = [
    {
      id: moduleId,
      title: 'Modulo Placar',
      author: 'Teste',
      created_at: '2026-03-14T00:00:00.000Z',
      updated_at: '2026-03-14T00:00:00.000Z',
      challenges: [{ count: 1 }],
    },
  ];
  const attemptsResponse = [
    {
      id: 'attempt-1',
      module_id: moduleId,
      classroom_id: classroom.id,
      classroom_name: classroom.name,
      student_name: 'Aluno Teste',
      score: 10,
      max_score: 30,
      completed: false,
      created_at: '2026-03-21T11:00:00.000Z',
    },
  ];

  await page.route('**/rest/v1/classrooms*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([classroom]),
    });
  });

  await page.route('**/rest/v1/modules*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(modulesListResponse),
    });
  });

  await page.route('**/rest/v1/module_attempts*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(attemptsResponse),
    });
  });

  await page.goto('/');
  await page.evaluate(() => {
    window.sessionStorage.setItem('alquimia-verbal:classroom-id', 'class-test');
    window.sessionStorage.setItem('alquimia-verbal:classroom-name', 'Turma Teste');
    window.sessionStorage.setItem('alquimia-verbal:student-name', 'Aluno Teste');
  });
  await page.goto('/');

  await page.locator('.module-rank-btn').click();
  await expect(page.getByText('Nao concluiu')).toHaveCount(2);
  await expect(page.getByText('Em andamento')).toHaveCount(0);
});

test('placar abre sem nome do aluno e mostra a classificacao completa da turma', async ({ page }) => {
  const moduleId = 'module-leaderboard-without-name';
  const classroom = {
    id: 'class-test',
    name: 'Turma Teste',
    sort_order: 1,
    active: true,
    created_at: '2026-03-20T10:00:00.000Z',
  };
  const modulesListResponse = [
    {
      id: moduleId,
      title: 'Modulo Placar Sem Nome',
      author: 'Teste',
      created_at: '2026-03-14T00:00:00.000Z',
      updated_at: '2026-03-14T00:00:00.000Z',
      challenges: [{ count: 1 }],
    },
  ];
  const attemptsResponse = [
    {
      id: 'attempt-1',
      module_id: moduleId,
      classroom_id: classroom.id,
      classroom_name: classroom.name,
      student_name: 'Ana',
      score: 30,
      max_score: 30,
      completed: true,
      created_at: '2026-03-21T11:00:00.000Z',
    },
    {
      id: 'attempt-2',
      module_id: moduleId,
      classroom_id: classroom.id,
      classroom_name: classroom.name,
      student_name: 'Bruno',
      score: 25,
      max_score: 30,
      completed: true,
      created_at: '2026-03-21T10:00:00.000Z',
    },
    {
      id: 'attempt-3',
      module_id: moduleId,
      classroom_id: classroom.id,
      classroom_name: classroom.name,
      student_name: 'Carla',
      score: 20,
      max_score: 30,
      completed: false,
      created_at: '2026-03-21T09:00:00.000Z',
    },
    {
      id: 'attempt-4',
      module_id: moduleId,
      classroom_id: classroom.id,
      classroom_name: classroom.name,
      student_name: 'Diego',
      score: 15,
      max_score: 30,
      completed: false,
      created_at: '2026-03-21T08:00:00.000Z',
    },
  ];

  await page.route('**/rest/v1/classrooms*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([classroom]),
    });
  });

  await page.route('**/rest/v1/modules*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(modulesListResponse),
    });
  });

  await page.route('**/rest/v1/module_attempts*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(attemptsResponse),
    });
  });

  await page.goto('/');
  await page.evaluate(() => {
    window.sessionStorage.setItem('alquimia-verbal:classroom-id', 'class-test');
    window.sessionStorage.setItem('alquimia-verbal:classroom-name', 'Turma Teste');
    window.sessionStorage.removeItem('alquimia-verbal:student-name');
  });
  await page.goto('/');

  await page.locator('.module-rank-btn').click();

  await expect(page.getByRole('dialog', { name: 'Placar do modulo' })).toBeVisible();
  await expect(page.getByText('Ana')).toBeVisible();
  await expect(page.getByText('Bruno')).toBeVisible();
  await expect(page.getByText('Carla')).toBeVisible();
  await expect(page.getByText('Diego')).toBeVisible();
  await expect(page.getByText('Digite seu nome para destacar sua posicao no ranking.')).toBeVisible();
  await expect(page.getByText('Sem nome informado: mostrando a classificacao completa da turma.')).toBeVisible();
  await expect(page.locator('.leaderboard-entry.current-student')).toHaveCount(0);
  await expect(page.getByLabel('Informar nome do aluno')).toHaveCount(0);
});

test('placar permite trocar de turma depois de abrir o ranking', async ({ page }) => {
  const moduleId = 'module-leaderboard-change-classroom';
  const classrooms = [
    {
      id: 'class-a',
      name: 'Turma A',
      sort_order: 1,
      active: true,
      created_at: '2026-03-20T10:00:00.000Z',
    },
    {
      id: 'class-b',
      name: 'Turma B',
      sort_order: 2,
      active: true,
      created_at: '2026-03-20T10:01:00.000Z',
    },
  ];
  const modulesListResponse = [
    {
      id: moduleId,
      title: 'Modulo Placar Troca Turma',
      author: 'Teste',
      created_at: '2026-03-14T00:00:00.000Z',
      updated_at: '2026-03-14T00:00:00.000Z',
      challenges: [{ count: 1 }],
    },
  ];

  await page.route('**/rest/v1/classrooms*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(classrooms),
    });
  });

  await page.route('**/rest/v1/modules*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(modulesListResponse),
    });
  });

  await page.route('**/rest/v1/module_attempts*', async (route, request) => {
    const url = new URL(request.url());
    const rawOrFilter = url.searchParams.get('or') || '';
    const classroomMatch = rawOrFilter.match(/classroom_id\.eq\.([^,)\s]+)/);
    const classroomId = classroomMatch?.[1] || '';

    const rows = classroomId === 'class-b'
      ? [
          {
            id: 'attempt-b',
            module_id: moduleId,
            classroom_id: 'class-b',
            classroom_name: 'Turma B',
            student_name: 'Bruna',
            score: 20,
            max_score: 20,
            completed: true,
            created_at: '2026-03-21T11:00:00.000Z',
          },
        ]
      : [
          {
            id: 'attempt-a',
            module_id: moduleId,
            classroom_id: 'class-a',
            classroom_name: 'Turma A',
            student_name: 'Ana',
            score: 10,
            max_score: 20,
            completed: false,
            created_at: '2026-03-21T11:00:00.000Z',
          },
        ];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(rows),
    });
  });

  await page.goto('/');
  await page.evaluate(() => {
    window.sessionStorage.setItem('alquimia-verbal:classroom-id', 'class-a');
    window.sessionStorage.setItem('alquimia-verbal:classroom-name', 'Turma A');
    window.sessionStorage.removeItem('alquimia-verbal:student-name');
  });
  await page.goto('/');

  await page.locator('.module-rank-btn').click();
  await expect(page.locator('.leaderboard-chip.classroom')).toHaveText('Turma A');
  await expect(page.getByText('Ana')).toBeVisible();

  await page.getByRole('button', { name: 'Ajustar filtro' }).click();
  await expect(page.getByLabel('Informar nome do aluno')).toBeVisible();
  await page.locator('#student-classroom-select').selectOption({ label: 'Turma B' });
  await page.locator('#student-name-input').fill('');
  await page.getByRole('button', { name: 'Ver placar' }).click();

  await expect(page.locator('.leaderboard-chip.classroom')).toHaveText('Turma B');
  await expect(page.getByText('Bruna')).toBeVisible();
  await expect(page.getByText('Ana')).toHaveCount(0);
});
