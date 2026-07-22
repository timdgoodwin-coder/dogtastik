// Customer App Logic for DogTastik.com

// Package config: Stripe Payment Links (set "after payment" redirect to
// https://dogtastik.com/?package=<key>#questionnaire) and Formspree form IDs.
// Fill in the TODOs once both are created — see plan for setup steps.
const PACKAGES = {
  puppy: {
    name: 'Puppy Jingle',
    price: 29,
    stripeLink: 'https://buy.stripe.com/00wfZg4KedTC4yXelE7g400',
    formspreeId: 'xvzekvpg'
  },
  golden: {
    name: 'Golden Record',
    price: 59,
    stripeLink: 'https://buy.stripe.com/fZu9ASb8C16Qd5t0uO7g401',
    formspreeId: 'xrenpozp'
  }
};

class DogTastikApp {
  constructor() {
    this.activeSampleIndex = null;

    // Maps a personality trait to the vibe it most suggests (used to highlight a suggested vibe card)
    this.TRAIT_TO_VIBE = {
      Goofy: 'Silly & Upbeat', Energetic: 'Silly & Upbeat', Mischievous: 'Quirky & Comedic', Silly: 'Silly & Upbeat', Playful: 'Silly & Upbeat', Adventurous: 'Epic Rock Anthem',
      Loving: 'Sweet & Heartfelt', Cuddly: 'Sweet & Heartfelt', Loyal: 'Sweet & Heartfelt', Gentle: 'Sweet & Heartfelt', Sweet: 'Sweet & Heartfelt', Affectionate: 'Sweet & Heartfelt',
      Chill: 'Fun Country/Folk Sing-Along', 'Laid-back': 'Fun Country/Folk Sing-Along', Dignified: 'Epic Rock Anthem', Independent: 'Fun Country/Folk Sing-Along', Wise: 'Fun Country/Folk Sing-Along', Patient: 'Fun Country/Folk Sing-Along',
      Brave: 'Epic Rock Anthem', Confident: 'Epic Rock Anthem', Protective: 'Epic Rock Anthem', Stubborn: 'Quirky & Comedic', Fearless: 'Epic Rock Anthem', Bossy: 'Quirky & Comedic',
      Anxious: 'Quirky & Comedic', Clingy: 'Sweet & Heartfelt', Dramatic: 'Quirky & Comedic', Nervous: 'Quirky & Comedic', Shy: 'Sweet & Heartfelt', Quirky: 'Quirky & Comedic'
    };

    // Maps the new 5-option vibe field onto the 3 synth playback styles available for the audio preview fallback
    this.VIBE_TO_SYNTH = {
      'Silly & Upbeat': 'playEnergetic',
      'Epic Rock Anthem': 'playEnergetic',
      'Sweet & Heartfelt': 'playSleepy',
      'Fun Country/Folk Sing-Along': 'playPlayful',
      'Quirky & Comedic': 'playPlayful'
    };

    // Bind event listeners
    window.addEventListener('hashchange', () => this.handleRouting());
    document.addEventListener('DOMContentLoaded', () => this.init());
  }

  init() {
    this.handleStripeReturn();
    this.handleRouting();
    this.setupQuestionnaireInteractions();
    this.setupMobileNav();
  }

  // The Desired Vibe question is a Golden Record perk — Puppy Jingle buyers don't
  // pick a vibe (we choose one for them). Hide the section and drop its `required`
  // radio for anything other than the golden package so the form still submits.
  applyPackageToQuestionnaire() {
    const packageKey = sessionStorage.getItem('pending_package');
    const vibeGroup = document.getElementById('vibeGroup');
    if (!vibeGroup) return;

    const showVibe = packageKey === 'golden';
    vibeGroup.hidden = !showVibe;
    vibeGroup.querySelectorAll('input[name="vibe"]').forEach(input => {
      input.disabled = !showVibe;
    });
    // Keep native validation in sync with visibility
    const firstVibe = vibeGroup.querySelector('input[name="vibe"]');
    if (firstVibe) {
      if (showVibe) firstVibe.setAttribute('required', '');
      else firstVibe.removeAttribute('required');
    }
  }

  // Landing back from a Stripe Payment Link (?package=puppy|golden). Remembers
  // which package was bought so the questionnaire can build the order once
  // submitted, then strips the query param so a refresh doesn't re-trigger it.
  handleStripeReturn() {
    const key = new URLSearchParams(location.search).get('package');
    if (!key || !PACKAGES[key]) return;

    sessionStorage.setItem('pending_package', key);
    history.replaceState(null, '', location.pathname + location.hash);
  }

  // Mobile hamburger menu: toggle open/closed, close on link click or outside tap
  setupMobileNav() {
    const toggle = document.getElementById('navToggle');
    const panel = document.getElementById('navPanel');
    if (!toggle || !panel) return;

    const closeNav = () => {
      panel.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    panel.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNav));
    document.addEventListener('click', (e) => {
      if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== toggle) {
        closeNav();
      }
    });
    window.addEventListener('hashchange', closeNav);
  }

  // Enforces the "pick exactly 3" trait limit and surfaces a suggested vibe card
  setupQuestionnaireInteractions() {
    const traitsContainer = document.getElementById('personalityTraits');
    const countLabel = document.getElementById('personalityCount');
    const form = document.getElementById('dogQuestionnaireForm');
    if (!traitsContainer || !form) return;

    const traitCheckboxes = () => Array.from(traitsContainer.querySelectorAll('input[type="checkbox"]'));

    const updateTraitLimit = () => {
      const checked = traitCheckboxes().filter(cb => cb.checked);
      countLabel.textContent = `${checked.length} of 3 selected`;
      traitCheckboxes().forEach(cb => { cb.disabled = checked.length >= 3 && !cb.checked; });
      this.updateVibeSuggestion(checked.map(cb => cb.value));
    };

    traitsContainer.addEventListener('change', updateTraitLimit);
    form.addEventListener('reset', () => setTimeout(updateTraitLimit, 0));
  }

  updateVibeSuggestion(selectedTraits) {
    document.querySelectorAll('.vibe-card').forEach(card => card.classList.remove('suggested'));
    if (!selectedTraits.length) return;

    const tally = {};
    selectedTraits.forEach(t => {
      const vibe = this.TRAIT_TO_VIBE[t];
      if (vibe) tally[vibe] = (tally[vibe] || 0) + 1;
    });

    const topVibe = Object.keys(tally).reduce((best, vibe) => (!best || tally[vibe] > tally[best]) ? vibe : best, null);
    if (!topVibe) return;

    const card = Array.from(document.querySelectorAll('.vibe-card')).find(c => c.querySelector('input').value === topVibe);
    if (card) card.classList.add('suggested');
  }

  // Database / LocalStorage Helpers
  getOrders() {
    return JSON.parse(localStorage.getItem('dogtastik_orders') || '[]');
  }

  saveOrders(orders) {
    localStorage.setItem('dogtastik_orders', JSON.stringify(orders));
  }

  // Client-Side Routing
  handleRouting() {
    const hash = location.hash || '#home';
    const views = ['homeView', 'questionnaireView', 'thankyouView'];

    // Stop any playing synth audio on route change
    window.dogJingleSynth.stop();
    this.resetSamplePlayButtons();

    // Route guards
    if (hash === '#questionnaire' && !sessionStorage.getItem('pending_package')) {
      location.hash = '#pricing';
      return;
    }

    // Swapping view visibility
    let activeView = 'homeView';
    if (hash === '#questionnaire') activeView = 'questionnaireView';
    else if (hash === '#thankyou') activeView = 'thankyouView';

    if (activeView === 'questionnaireView') this.applyPackageToQuestionnaire();

    views.forEach(v => {
      const el = document.getElementById(v);
      if (el) {
        if (v === activeView) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });

    // Scroll to top of window
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Interactive Samples Playback
  playSample(index) {
    const card = document.getElementById(`sampleCard-${index}`);
    const playBtn = document.getElementById(`playBtn-${index}`);
    const progressBar = document.getElementById(`progress-${index}`);
    const timeDisplay = document.getElementById(`time-${index}`);
    const audioSrc = card.dataset.audioSrc;
    const style = card.dataset.style;

    // If clicking the active playing sample, stop it
    if (this.activeSampleIndex === index && (this.sampleAudio || window.dogJingleSynth.isPlaying)) {
      this.stopActiveSample();
      return;
    }

    this.stopActiveSample();
    this.activeSampleIndex = index;

    // Change active play icon to pause
    playBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
      </svg>
    `;

    const progressCallback = (pct) => {
      progressBar.style.width = `${pct}%`;
    };

    const endedCallback = () => {
      this.resetSamplePlayButtons();
    };

    if (audioSrc) {
      // Play the real uploaded jingle
      const audio = new Audio(audioSrc);
      this.sampleAudio = audio;

      audio.addEventListener('ended', endedCallback);
      audio.play();

      this.sampleAudioInterval = setInterval(() => {
        if (!audio.duration) return;
        progressCallback((audio.currentTime / audio.duration) * 100);
        const m = Math.floor(audio.currentTime / 60);
        const s = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
        timeDisplay.textContent = `${m}:${s}`;
      }, 100);
    } else {
      // Fall back to live synthesis for samples without a real recording yet
      window.dogJingleSynth[
        style === 'energetic' ? 'playEnergetic' : style === 'sleepy' ? 'playSleepy' : 'playPlayful'
      ](progressCallback, endedCallback);
    }
  }

  stopActiveSample() {
    if (this.sampleAudio) {
      this.sampleAudio.pause();
      this.sampleAudio = null;
    }
    if (this.sampleAudioInterval) {
      clearInterval(this.sampleAudioInterval);
      this.sampleAudioInterval = null;
    }
    window.dogJingleSynth.stop();
    this.resetSamplePlayButtons();
  }

  resetSamplePlayButtons() {
    this.activeSampleIndex = null;
    const playSVG = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;
    [1, 2, 3].forEach(idx => {
      const btn = document.getElementById(`playBtn-${idx}`);
      const progress = document.getElementById(`progress-${idx}`);
      const timeDisplay = document.getElementById(`time-${idx}`);
      const card = document.getElementById(`sampleCard-${idx}`);
      if (btn) btn.innerHTML = playSVG;
      if (progress) progress.style.width = '0%';
      if (timeDisplay && card) timeDisplay.textContent = card.dataset.durationLabel || '0:10';
    });
  }

  seekSample(event, index) {
    // If not active, do nothing
    if (this.activeSampleIndex !== index) return;

    if (this.sampleAudio && this.sampleAudio.duration) {
      const bar = event.currentTarget;
      const pct = (event.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth;
      this.sampleAudio.currentTime = pct * this.sampleAudio.duration;
      return;
    }

    // Live synthesis doesn't support seeking, only restart
    this.playSample(index);
  }

  // E-commerce checkout trigger — sends the customer to the real Stripe Payment Link
  buyPackage(key) {
    sessionStorage.setItem('pending_package', key);
    window.location.href = PACKAGES[key].stripeLink;
  }

  // Handle Dog Questionnaire Submission
  handleQuestionnaireSubmit(event) {
    event.preventDefault();
    const packageKey = sessionStorage.getItem('pending_package');
    if (!packageKey || !PACKAGES[packageKey]) {
      location.hash = '#pricing';
      return;
    }

    const ownerName = document.getElementById('ownerName').value;
    const ownerEmail = document.getElementById('ownerEmail').value;

    const personalityTraits = Array.from(document.querySelectorAll('#personalityTraits input:checked')).map(el => el.value);
    if (personalityTraits.length !== 3) {
      alert('Please select exactly 3 personality traits.');
      return;
    }

    const signatureSound = Array.from(document.querySelectorAll('#signatureSound input:checked')).map(el => el.value);
    const signatureSoundOther = document.getElementById('signatureSoundOther').value.trim();
    if (signatureSound.length === 0 && !signatureSoundOther) {
      alert("Please select at least one signature sound, or describe your dog's own.");
      return;
    }

    // Desired vibe is a Golden Record-only question; Puppy Jingle skips it.
    const isGolden = packageKey === 'golden';
    const vibeInput = document.querySelector('input[name="vibe"]:checked');
    if (isGolden && !vibeInput) {
      alert('Please pick a desired vibe.');
      return;
    }

    const dogDetails = {
      dog_name: document.getElementById('dogName').value,
      dog_breed: document.getElementById('dogBreed').value,
      dog_nickname: document.getElementById('dogNickname').value,
      personality_traits: personalityTraits,
      funny_habit: document.getElementById('funnyHabit').value,
      favorite_thing: document.getElementById('favoriteThing').value,
      fear_or_dislike: document.getElementById('fearOrDislike').value,
      favorite_person: document.getElementById('favoritePerson').value,
      relationship_note: document.getElementById('relationshipNote').value,
      social_handle: document.getElementById('socialHandle').value.trim(),
      signature_sound: signatureSound,
      signature_sound_other: signatureSoundOther,
      vibe: vibeInput ? vibeInput.value : ''
    };

    const pkg = PACKAGES[packageKey];
    const newOrder = {
      id: 'DT-' + Math.floor(100000 + Math.random() * 90000),
      customerName: ownerName,
      customerEmail: ownerEmail,
      packageName: pkg.name,
      packageKey: packageKey,
      price: pkg.price,
      status: 'questionnaire',
      date: new Date().toLocaleDateString(),
      dogDetails: dogDetails,
      jingleFile: null,
      lyrics: ''
    };

    const orders = this.getOrders();
    orders.push(newOrder);
    this.saveOrders(orders);

    this.sendQuestionnaireToFormspree(newOrder);
    sessionStorage.removeItem('pending_package');

    // Reset questionnaire form
    document.getElementById('dogQuestionnaireForm').reset();
    location.hash = '#thankyou';
  }

  // Emails the questionnaire answers to the business inbox via Formspree, routed
  // to the form for the package that was purchased. Non-blocking — a failure here
  // shouldn't stop the customer from reaching the thank-you page.
  sendQuestionnaireToFormspree(order) {
    const formspreeId = PACKAGES[order.packageKey].formspreeId;
    if (!formspreeId) {
      console.warn('No Formspree form configured for package', order.packageName);
      return;
    }

    fetch(`https://formspree.io/f/${formspreeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        order_id: order.id,
        package: order.packageName,
        price: order.price,
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        ...order.dogDetails
      })
    }).catch(err => console.warn('Formspree submission failed', err));
  }
}

// Global App Instance
window.app = new DogTastikApp();
