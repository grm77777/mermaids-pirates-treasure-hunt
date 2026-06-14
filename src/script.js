// NOTE: This file expects `API_BASE_URL` to be available (configured in index.html).
(function(){
  const container = document.getElementById('clue-container');
  const SCORE_STORAGE_KEY = 'mermaids-pirates-treasure-hunt-score-state';

  function qs(name){
    return new URLSearchParams(location.search).get(name);
  }

  const clueId = qs('id') || '1';

  function loadGameState(){
    const fallback = { totalPoints: 0, attemptsByClue: {}, completedClues: {} };
    try{
      const raw = localStorage.getItem(SCORE_STORAGE_KEY);
      if(!raw) return fallback;
      const parsed = JSON.parse(raw);
      return {
        totalPoints: Number(parsed.totalPoints) || 0,
        attemptsByClue: parsed.attemptsByClue && typeof parsed.attemptsByClue === 'object' ? parsed.attemptsByClue : {},
        completedClues: parsed.completedClues && typeof parsed.completedClues === 'object' ? parsed.completedClues : {}
      };
    }catch(err){
      return fallback;
    }
  }

  const gameState = loadGameState();

  function saveGameState(){
    try{
      localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(gameState));
    }catch(err){
      // Ignore storage failures so gameplay still works without persistence.
    }
  }

  function getClueKey(clueIdValue){
    return String(clueIdValue);
  }

  function getAttemptCount(clueIdValue){
    return Number(gameState.attemptsByClue[getClueKey(clueIdValue)]) || 0;
  }

  function recordAttempt(clueIdValue){
    const clueKey = getClueKey(clueIdValue);
    const nextAttempt = getAttemptCount(clueIdValue) + 1;
    gameState.attemptsByClue[clueKey] = nextAttempt;
    saveGameState();
    return nextAttempt;
  }

  function getPointsForAttempt(attemptNumber){
    if(attemptNumber === 1) return 100;
    if(attemptNumber === 2) return 80;
    if(attemptNumber === 3) return 60;
    return 40;
  }

  function formatPoints(points){
    return `${points} point${points === 1 ? '' : 's'}`;
  }

  function isClueCompleted(clueIdValue){
    return Boolean(gameState.completedClues[getClueKey(clueIdValue)]);
  }

  function getCompletedPoints(clueIdValue){
    return Number(gameState.completedClues[getClueKey(clueIdValue)]) || 0;
  }

  function markClueCompleted(clueIdValue, points){
    const clueKey = getClueKey(clueIdValue);
    if(gameState.completedClues[clueKey]) return false;
    gameState.completedClues[clueKey] = points;
    gameState.totalPoints += points;
    saveGameState();
    return true;
  }

  function updateScoreDisplay(){
    const scoreEl = document.getElementById('score-display');
    if(scoreEl){
      scoreEl.textContent = `Total score: ${formatPoints(gameState.totalPoints)}`;
    }
  }

  function lockQuestion(choicesEl, submitButton){
    Array.from(choicesEl.querySelectorAll('button')).forEach(button => {
      button.disabled = true;
    });
    submitButton.disabled = true;
  }

  function el(tag, props={}, ...children){
    const e = document.createElement(tag);
    Object.assign(e, props);
    children.forEach(c=>{ if(typeof c==='string') e.appendChild(document.createTextNode(c)); else if(c) e.appendChild(c);});
    return e;
  }

  async function loadSeed(){
    const res = await fetch('seed/seed.json');
    if(!res.ok) throw new Error('Cannot load seed/seed.json');
    return res.json();
  }

  async function fetchClueFromApi(id){
    try{
      if(!(typeof API_BASE_URL==='string' && API_BASE_URL.trim())) return null;
      const url = `${API_BASE_URL.replace(/\/$/,'')}/clue?id=${encodeURIComponent(id)}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if(!res.ok) return null;
      return res.json();
    }catch(e){ return null; }
  }

  function render(clue){
    container.innerHTML = '';
    const score = el('div',{className:'feedback',id:'score-display'}, `Total score: ${formatPoints(gameState.totalPoints)}`);
    const q = el('div',{className:'card'},
      el('div',{className:'question'},clue.question),
      renderChoices(clue),
      score
    );
    container.appendChild(q);
  }

  function renderChoices(clue){
    const wrapper = el('div',{className:'choices card-inner'});
    const clueKey = getClueKey(clue.id);
    const clueAlreadyCompleted = isClueCompleted(clueKey);
    let selected = null;
    const choices = el('div',{className:'choices'});
    clue.choices.forEach(choice => {
      const btn = el('button',{className:'choice-btn',type:'button'}, choice);
      btn.addEventListener('click',()=>{
        // toggle
        Array.from(choices.children).forEach(ch=>ch.classList.remove('selected'));
        btn.classList.add('selected');
        selected = choice;
      });
      choices.appendChild(btn);
    });

    const submitButton = el('button',{className:'btn',type:'button'}, 'Submit');
    const controls = el('div',{className:'controls'},
      submitButton
    );

    submitButton.addEventListener('click',()=>submitAnswer(clue, selected, { choices, submitButton }));

    const feedback = el('div',{className:'feedback',id:'feedback'});
    wrapper.appendChild(choices);
    wrapper.appendChild(controls);
    wrapper.appendChild(feedback);

    if(clueAlreadyCompleted){
      feedback.textContent = `Solved already. You earned ${formatPoints(getCompletedPoints(clueKey))} for this clue.`;
      lockQuestion(choices, submitButton);
    }

    return wrapper;
  }

  async function submitAnswer(clue, answer, ui){
    const fb = document.getElementById('feedback');
    if(isClueCompleted(clue.id)){
      fb.textContent = `This clue is already solved. You earned ${formatPoints(getCompletedPoints(clue.id))}.`;
      if(ui){ lockQuestion(ui.choices, ui.submitButton); }
      return;
    }

    if(!answer){ fb.textContent = 'Please select an answer.'; return; }

    const attemptNumber = recordAttempt(clue.id);

    // If API_BASE_URL configured, POST to remote answer endpoint
    if(typeof API_BASE_URL==='string' && API_BASE_URL.trim()){
      try{
        const res = await fetch((API_BASE_URL.replace(/\/$/,'') + '/answer'),{
          method:'POST',headers:{'Content-Type':'application/json'},
          body: JSON.stringify({clueId:clue.id, answer})
        });
        const json = await res.json();
            fb.textContent = json.message || (json.correct ? 'Correct!' : 'Incorrect.');
            // If correct and there's a next clue, show the hint without auto-navigating.
            if (json.correct) {
              const points = getPointsForAttempt(attemptNumber);
              markClueCompleted(clue.id, points);
              updateScoreDisplay();
              if(ui){ lockQuestion(ui.choices, ui.submitButton); }
              if (json.nextClueId) {
                const hintText = json.hint || '';
                fb.innerHTML = `${json.message || 'Correct!'} +${formatPoints(points)} <div class="small">${hintText}</div>`;
              } else {
                fb.textContent = `${json.message || 'Correct! You found the treasure — well done!'} +${formatPoints(points)}`;
              }
            }
      }catch(err){ fb.textContent = 'Error contacting the API.'; }
      return;
    }

    // Local validation fallback (uses seed.json correctAnswer)
    if(answer === clue.correctAnswer){
      const points = getPointsForAttempt(attemptNumber);
      markClueCompleted(clue.id, points);
      updateScoreDisplay();
      if(ui){ lockQuestion(ui.choices, ui.submitButton); }
      // Show hint instead of auto-navigate
      if(clue.nextClueId){
        fb.innerHTML = `Correct! +${formatPoints(points)} <div class="small">` + (clue.hint || '') + '</div>';
      } else {
        fb.textContent = `Correct! You found the treasure — well done! +${formatPoints(points)}`;
      }
    } else {
      fb.textContent = 'Incorrect — try again.';
    }
  }

  // Boot: try API for the clue first, fall back to local seed.json
  (async function boot(){
    let clue = null;
    // try API
    clue = await fetchClueFromApi(clueId);
    if(clue){ render(clue); return; }
    // fallback to seed
    try{
      const data = await loadSeed();
      clue = data.find(c=>String(c.id) === String(clueId));
      if(!clue){ container.innerHTML = '<div class="card">Clue not found.</div>'; return; }
      render(clue);
    }catch(err){ container.innerHTML = `<div class="card">Failed to load clues: ${err.message}</div>`; }
  })();

})();
