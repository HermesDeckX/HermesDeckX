import '@testing-library/jest-dom/vitest';

// jsdom does not implement scrollIntoView — stub it so CustomSelect dropdown tests work
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => {};
}
