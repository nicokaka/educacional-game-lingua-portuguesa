import { test, expect } from '@playwright/test';

function createModuleRoutes(page, { moduleId, title, author, challenges }) {
  const modulesListResponse = [
    {
      id: moduleId,
      title,
      author,
      created_at: '2026-03-14T00:00:00.000Z',
      challenges: [{ count: challenges.length }],
    },
  ];

  const moduleSingleResponse = {
    id: moduleId,
    title,
    author,
    created_at: '2026-03-14T00:00:00.000Z',
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

  await page.goto('/');
  await page.getByRole('button', { name: /Modulo Fluxo Completo/i }).click();

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

  await page.goto('/');
  await page.getByRole('button', { name: /Modulo Erro/i }).click();

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

  await page.goto('/');
  await page.getByRole('button', { name: /Modulo Derrota/i }).click();

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
      challenges: [{ count: 1 }],
    },
  ];
  const moduleSingleResponse = {
    id: moduleId,
    title: 'Modulo Original',
    author: 'Profa',
    created_at: '2026-03-14T00:00:00.000Z',
  };
  const challengesResponse = [
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

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(challengesResponse),
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

  await page.goto('/#/editor');
  await page.getByPlaceholder('Senha').fill('prof2026');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByText('Modulo Original')).toBeVisible();
  await page.getByRole('button', { name: /Editar/i }).click();

  await page.getByPlaceholder('Título do Formulário (Ex: Ortografia - 6º Ano)').fill('Modulo Editado');
  await page.locator('.prompt-input').first().fill('Pergunta editada');

  await page.getByRole('button', { name: 'Salvar Módulo' }).click();
  await expect(page.getByText('✅ Salvo!')).toBeVisible();

  expect(updatePayload).toEqual({ title: 'Modulo Editado', author: 'Profa' });
  expect(deleteCallCount).toBe(1);
  expect(Array.isArray(insertedChallengesPayload)).toBe(true);
  expect(insertedChallengesPayload[0].prompt).toBe('Pergunta editada');
});
