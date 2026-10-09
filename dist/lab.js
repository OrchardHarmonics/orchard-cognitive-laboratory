/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
/* Minimal experiment host. Registration is developer-installed, not self-modification. */
(function () {
  'use strict';
  const modules = new Map();
  let active = null;
  let ready = false;
  const required = ['id', 'title', 'version', 'contractVersion', 'mount', 'run'];
  function register(definition) {
    if (!definition || required.some(k => !Object.prototype.hasOwnProperty.call(definition, k))) throw new Error('Incomplete experiment module.');
    if (!/^[a-z][a-z0-9-]*$/.test(definition.id) || modules.has(definition.id)) throw new Error('Invalid or duplicate experiment ID.');
    if (definition.contractVersion !== 1 || typeof definition.mount !== 'function' || typeof definition.run !== 'function' || typeof definition.title !== 'string' || !definition.title.trim() || typeof definition.version !== 'string') throw new Error('Unsupported experiment contract.');
    modules.set(definition.id, Object.freeze({ ...definition }));
    if (ready) { drawNav(); if (!active) open(definition.id); }
  }
  function drawNav() {
    const nav = document.getElementById('experiment-nav');
    nav.replaceChildren();
    const homeButton=document.createElement("button");homeButton.type="button";homeButton.className="experiment-tab";homeButton.textContent="Welcome to the Orchard";homeButton.setAttribute("aria-current",String(!active));homeButton.addEventListener("click",showHome);nav.appendChild(homeButton);
    for (const definition of modules.values()) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'experiment-tab';
      button.textContent = definition.title;
      button.setAttribute('aria-current', String(active && active.id === definition.id || false));
      button.addEventListener('click', () => open(definition.id));
      nav.appendChild(button);
    }
    const runButton = document.getElementById('run-sequence');
    if (runButton) runButton.textContent = 'Run installed sequence · ' + modules.size + (modules.size === 1 ? ' experiment' : ' experiments');
  }
  function open(id) {
    if (!modules.has(id)) throw new Error('Unknown experiment.');
    if (active && active.id === id) return;
    if (active) active.instance.dispose();
    const container = document.getElementById('experiment-root');
    container.replaceChildren();
    const front=document.getElementById("laboratory-front");if(front)front.hidden=true;container.hidden=false;for(const section of document.querySelectorAll("[data-lab-only]"))section.hidden=false;
    const definition = modules.get(id);
    const instance = definition.mount({ container, contractVersion: 1 });
    if (!instance || typeof instance.dispose !== 'function' || typeof instance.snapshot !== 'function') throw new Error('Experiment must provide dispose and snapshot.');
    active = { id, instance }; drawNav();
    if(window.location && window.location.hash!=="#"+id)window.location.hash=id;
  }
  function showHome(){
    if(active){active.instance.dispose();active=null;}
    const root=document.getElementById('experiment-root');if(root){root.replaceChildren();root.hidden=true;}
    const front=document.getElementById('laboratory-front');if(front)front.hidden=false;
    for(const section of document.querySelectorAll('[data-lab-only]'))section.hidden=true;
    drawNav();if(window.location&&window.location.hash!=='#home')window.location.hash='home';
  }
  function followHash(){const key=window.location?window.location.hash.slice(1):'';if(modules.has(key))open(key);else if(!key||key==='home')showHome();}
  function runSequence(ids) {
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !modules.has(id))) throw new Error('Choose a nonempty sequence of distinct installed experiments.');
    let previous = null;
    const results = [];
    for (const id of ids) {
      const output = modules.get(id).run(Object.freeze({ protocol: 'orchard-lab/1', previous }));
      if (!output || output.protocol !== 'orchard-lab/1' || output.experiment !== id || typeof output.passed !== 'boolean' || typeof output.summary !== 'string') throw new Error('Invalid experiment result envelope.');
      previous = deepFreeze(JSON.parse(JSON.stringify(output))); results.push(previous);
      if (!previous.passed) break;
    }
    return results;
  }
  function deepFreeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
    return value;
  }
  window.OrchardLab = Object.freeze({ register, open, showHome, runSequence, list: () => [...modules.values()].map(({ id, title, version }) => ({ id, title, version })),
    snapshot: () => active ? { experiment: active.id, ...active.instance.snapshot() } : null });
  if(typeof window.addEventListener==='function')window.addEventListener('hashchange',()=>{if(ready)followHash();});
  document.addEventListener('DOMContentLoaded', () => {
    ready = true; drawNav();
    if (modules.size) followHash();
    else document.getElementById('experiment-root').textContent = 'No experiment modules have been installed.';
    const runButton = document.getElementById('run-sequence');
    if (runButton) runButton.addEventListener('click', () => {
      const status = document.getElementById('sequence-result');
      const rows = document.getElementById('sequence-results');
      rows.replaceChildren();
      try {
        const results = runSequence([...modules.keys()]);
        status.textContent = results.every(r => r.passed) ? 'Installed sequence passed. Each stage checked its declared inputs and ran its scoped fixture; the rows below state the transfers and limits. Live controls are unchanged.' : 'The sequence stopped at a failed milestone. Later stages were not run.';
        rows.hidden = false;
        for (const result of results) {
          const row = document.createElement('li');
          row.textContent = modules.get(result.experiment).title + ': ' + (result.passed ? 'Passed. ' : 'Failed. ') + result.summary;
          rows.appendChild(row);
        }
      } catch (error) { status.textContent = 'Sequence could not run: ' + error.message; rows.hidden = true; }
    });
  });
})();
