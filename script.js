// NOTE: This file expects `API_BASE_URL` to be available (configured in index.html).
(function(){
  const container = document.getElementById('clue-container');

  function qs(name){
    return new URLSearchParams(location.search).get(name);
  }

  const clueId = qs('id') || '1';

  function el(tag, props={}, ...children){
    const e = document.createElement(tag);
    Object.assign(e, props);
    children.forEach(c=>{ if(typeof c==='string') e.appendChild(document.createTextNode(c)); else if(c) e.appendChild(c);});
    return e;
  }

  function buildClueUrl(id){
    return `${location.origin}/clue?id=${encodeURIComponent(id)}`;
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
    const q = el('div',{className:'card'},
      el('div',{className:'question'},clue.question),
      renderChoices(clue),
      el('div',{className:'small'},`Clue ID: ${clue.id}`)
    );
    container.appendChild(q);
  }

  function renderChoices(clue){
    const wrapper = el('div',{className:'choices card-inner'});
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

    const controls = el('div',{className:'controls'},
      el('button',{className:'btn secondary',type:'button'}, 'Show QR URL'),
      el('button',{className:'btn',type:'button'}, 'Submit')
    );

    controls.children[0].addEventListener('click',()=>{
      const url = buildClueUrl(clue.id);
      navigator.clipboard?.writeText(url).then(()=>alert('Clue URL copied to clipboard'))
        .catch(()=>prompt('Clue URL (copy):', url));
    });

    controls.children[1].addEventListener('click',()=>submitAnswer(clue, selected));

    const feedback = el('div',{className:'feedback',id:'feedback'});
    wrapper.appendChild(choices);
    wrapper.appendChild(controls);
    wrapper.appendChild(feedback);
    return wrapper;
  }

  async function submitAnswer(clue, answer){
    const fb = document.getElementById('feedback');
    if(!answer){ fb.textContent = 'Please select an answer.'; return; }

    // If API_BASE_URL configured, POST to remote answer endpoint
    if(typeof API_BASE_URL==='string' && API_BASE_URL.trim()){
      try{
        const res = await fetch((API_BASE_URL.replace(/\/$/,'') + '/answer'),{
          method:'POST',headers:{'Content-Type':'application/json'},
          body: JSON.stringify({clueId:clue.id, answer})
        });
        const json = await res.json();
            fb.textContent = json.message || (json.correct ? 'Correct!' : 'Incorrect.');
            // If correct and there's a next clue, show the hint and provide the next QR URL (do not auto-navigate)
            if (json.correct) {
              if (json.nextClueId) {
                const hintText = json.hint || '';
                const nextUrl = buildClueUrl(json.nextClueId);
                fb.innerHTML = `${json.message || 'Correct!'} <div class="small">${hintText}</div>`;
                // add copy button
                const copyBtn = el('button',{className:'btn',type:'button'}, 'Copy Next QR URL');
                copyBtn.addEventListener('click',()=>{
                  navigator.clipboard?.writeText(nextUrl).then(()=>alert('Next clue URL copied'))
                    .catch(()=>prompt('Next clue URL:', nextUrl));
                });
                fb.appendChild(copyBtn);
              } else {
                fb.textContent = (json.message || 'Correct! You found the treasure — well done!');
              }
            }
      }catch(err){ fb.textContent = 'Error contacting the API.'; }
      return;
    }

    // Local validation fallback (uses seed.json correctAnswer)
    if(answer === clue.correctAnswer){
      // Show hint instead of auto-navigate
      if(clue.nextClueId){
        fb.innerHTML = 'Correct! <div class="small">' + (clue.hint || '') + '</div>';
        const nextUrl = buildClueUrl(clue.nextClueId);
        const copyBtn = el('button',{className:'btn',type:'button'}, 'Copy Next QR URL');
        copyBtn.addEventListener('click',()=>{
          navigator.clipboard?.writeText(nextUrl).then(()=>alert('Next clue URL copied'))
            .catch(()=>prompt('Next clue URL:', nextUrl));
        });
        fb.appendChild(copyBtn);
      } else {
        fb.textContent = 'Correct! You found the treasure — well done!';
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
