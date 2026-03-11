/**
 * Challenge Registry — Strategy Pattern
 *
 * Conecta challenge.type → Renderer (componente Svelte) + Validator (função).
 * Para adicionar um tipo novo: importe o renderer, adicione 1 linha em cada objeto.
 */

import DragDropRenderer from '../components/renderers/DragDropRenderer.svelte';
import MultipleChoiceRenderer from '../components/renderers/MultipleChoiceRenderer.svelte';
import TrueFalseRenderer from '../components/renderers/TrueFalseRenderer.svelte';
import OrderingRenderer from '../components/renderers/OrderingRenderer.svelte';

const renderers = {
  drag_drop: DragDropRenderer,
  multiple_choice: MultipleChoiceRenderer,
  true_false: TrueFalseRenderer,
  ordering: OrderingRenderer,
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
    return answer === challenge.correctAnswer;
  },

  ordering: (challenge, answer) => {
    if (!Array.isArray(answer) || answer.length !== challenge.fragments.length) return false;
    return answer.every((item, i) => item === challenge.fragments[i]);
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
