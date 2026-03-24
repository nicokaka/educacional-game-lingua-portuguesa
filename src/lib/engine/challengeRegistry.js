/**
 * Challenge Registry — Strategy Pattern
 *
 * Conecta challenge.type → Renderer (componente Svelte) + Validator (função).
 * Para adicionar um tipo novo: importe o renderer, adicione 1 linha em cada objeto.
 */

import DragDropRenderer from '../components/renderers/DragDropRenderer.svelte';
import MultipleChoiceRenderer from '../components/renderers/MultipleChoiceRenderer.svelte';
import OpenTextRenderer from '../components/renderers/OpenTextRenderer.svelte';
import TrueFalseRenderer from '../components/renderers/TrueFalseRenderer.svelte';
import OrderingRenderer from '../components/renderers/OrderingRenderer.svelte';

const renderers = {
  drag_drop: DragDropRenderer,
  multiple_choice: MultipleChoiceRenderer,
  true_false: TrueFalseRenderer,
  ordering: OrderingRenderer,
  open_text: OpenTextRenderer,
};

const validators = {
  drag_drop: (challenge, answer) => {
    return answer?.toLowerCase?.() === challenge.correctAnswer?.toLowerCase?.();
  },

  multiple_choice: (challenge, answer) => {
    const option = challenge.options.find(o => o.id === answer);
    return option?.correct === true;
  },

  true_false: (challenge, answer) => {
    if (Array.isArray(challenge.statements) && challenge.statements.length > 0) {
      if (!Array.isArray(answer) || answer.length !== challenge.statements.length) return false;
      if (!challenge.statements.every((statement) => typeof statement?.correctAnswer === 'boolean')) {
        return false;
      }
      return challenge.statements.every((statement, index) => answer[index] === statement.correctAnswer);
    }

    if (Array.isArray(answer)) {
      if (typeof challenge.correctAnswer !== 'boolean') return false;
      return answer.length === 1 && answer[0] === challenge.correctAnswer;
    }

    if (typeof challenge.correctAnswer !== 'boolean') return false;
    return answer === challenge.correctAnswer;
  },

  ordering: (challenge, answer) => {
    if (!Array.isArray(answer) || answer.length !== challenge.fragments.length) return false;
    return answer.every((item, i) => item === challenge.fragments[i]);
  },
};

function hasPromptText(challenge) {
  return Boolean(challenge?.prompt?.trim?.());
}

function hasValidOptions(options) {
  return Array.isArray(options) &&
    options.length >= 2 &&
    options.every((option) => Boolean(option?.text?.trim?.()) && Boolean(option?.id));
}

function hasValidTrueFalseContent(challenge) {
  if (Array.isArray(challenge?.statements) && challenge.statements.length > 0) {
    return challenge.statements.every(
      (statement) => Boolean(statement?.text?.trim?.()) && typeof statement?.correctAnswer === 'boolean'
    );
  }

  return hasPromptText(challenge) && typeof challenge?.correctAnswer === 'boolean';
}

function hasValidOrderingContent(challenge) {
  return hasPromptText(challenge) &&
    Array.isArray(challenge?.fragments) &&
    challenge.fragments.length >= 2 &&
    Array.isArray(challenge?.displayFragments) &&
    challenge.displayFragments.length === challenge.fragments.length;
}

const runtimeInspectors = {
  drag_drop: (challenge) => {
    if (!hasPromptText(challenge)) return 'drag_drop_missing_prompt';
    if (!Array.isArray(challenge?.loot) || challenge.loot.length === 0) return 'drag_drop_missing_loot';
    if (!challenge?.correctAnswer?.trim?.()) return 'drag_drop_missing_correct_answer';
    return null;
  },
  multiple_choice: (challenge) => {
    if (!hasPromptText(challenge)) return 'multiple_choice_missing_prompt';
    if (!hasValidOptions(challenge?.options)) return 'multiple_choice_invalid_options';
    return null;
  },
  true_false: (challenge) => {
    if (!hasValidTrueFalseContent(challenge)) return 'true_false_invalid_content';
    return null;
  },
  ordering: (challenge) => {
    if (!hasValidOrderingContent(challenge)) return 'ordering_invalid_content';
    return null;
  },
  open_text: (challenge) => {
    if (!hasPromptText(challenge)) return 'open_text_missing_prompt';
    return null;
  },
};

/**
 * @param {string} type
 * @returns {import('svelte').Component | undefined}
 */
export function getRenderer(type) {
  return renderers[type];
}

/**
 * @param {string} type
 * @returns {((challenge: any, answer: any) => boolean) | undefined}
 */
export function getValidator(type) {
  return validators[type];
}

/**
 * @returns {string[]}
 */
export function getSupportedTypes() {
  return Object.keys(renderers);
}

export function getChallengeRuntimeIssue(challenge) {
  if (!challenge?.type) return 'missing_type';

  const inspect = runtimeInspectors[challenge.type];
  if (!inspect) return `unsupported_type:${challenge.type}`;

  return inspect(challenge);
}
