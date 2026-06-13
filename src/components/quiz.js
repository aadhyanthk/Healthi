import { parseWellnessLog } from '../services/gemini.js';
import { addLog } from '../services/storage.js';
import { showToast } from '../utils/toast.js';

export async function render() {
  return `
    <main class="centered-state" style="align-items:start;padding-top:clamp(24px,7vw,80px)">
      <section style="width:min(100%,760px)">
        <a class="brand" href="#/dashboard" style="margin-bottom:38px"><span class="brand-mark">H</span><span>Healthi</span></a>
        <p class="eyebrow">Daily check-in</p>
        <h1>How are you feeling today?</h1>
        <p class="muted" style="max-width:620px">Use your own words. Mention symptoms, medicines, sleep, food, movement, or anything that felt different.</p>

        <div class="card" style="margin-top:28px">
          <label for="wellness-input">Tell Healthi what happened</label>
          <textarea id="wellness-input" rows="7" style="margin-top:9px;font-size:1.08rem" placeholder="I had a mild headache this morning, slept about five hours, and forgot to drink much water..."></textarea>
          <div class="tag-row" style="margin-top:14px">
            <button class="prompt-chip" type="button" data-text="I slept ">Sleep</button>
            <button class="prompt-chip" type="button" data-text="My pain today was ">Pain</button>
            <button class="prompt-chip" type="button" data-text="I took my medicine ">Medicine</button>
            <button class="prompt-chip" type="button" data-text="My blood pressure was ">Reading</button>
          </div>
          <div style="display:flex;gap:10px;align-items:center;margin-top:24px;flex-wrap:wrap">
            <button id="submit-log" class="btn btn-primary" style="flex:1">Understand and save</button>
            <button id="voice-btn" class="btn btn-secondary" type="button" aria-label="Start voice input">Use voice</button>
          </div>
          <div id="loading-indicator" class="muted" style="display:none;margin-top:14px;text-align:center">Turning your note into a clear health entry...</div>
        </div>
        <p class="privacy-note">Healthi helps organize your information. It does not diagnose conditions or replace medical advice.</p>
      </section>
    </main>`;
}

export function init() {
  const input = document.getElementById('wellness-input');
  const submit = document.getElementById('submit-log');
  const loading = document.getElementById('loading-indicator');

  document.querySelectorAll('.prompt-chip').forEach((button) => {
    button.addEventListener('click', () => {
      input.value += button.dataset.text;
      input.focus();
    });
  });

  document.getElementById('voice-btn')?.addEventListener('click', () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      showToast('Voice input is not supported in this browser.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      input.value = `${input.value} ${event.results[0][0].transcript}`.trim();
    };
    recognition.start();
    showToast('Listening...');
  });

  submit.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) {
      showToast('Please tell us how you are feeling first.');
      input.focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Saving...';
    loading.style.display = 'block';
    try {
      await addLog({ raw_text: text, parsed_data: await parseWellnessLog(text) });
      showToast('Your health ledger is up to date.');
      window.location.hash = '#/dashboard';
    } catch (error) {
      showToast(error.message);
      submit.disabled = false;
      submit.textContent = 'Understand and save';
      loading.style.display = 'none';
    }
  });
}
