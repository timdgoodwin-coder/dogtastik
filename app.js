// Customer App Logic for DogTastik.com

class DogTastikApp {
  constructor() {
    this.currentUser = null;
    this.currentOrder = null;
    this.activeSampleIndex = null;
    this.dashboardAudio = null; // HTML Audio object for uploaded tunes
    this.dashboardAudioPlaying = false;
    this.dashboardAudioInterval = null;

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
    this.loadSession();
    this.handleRouting();
    this.updateNav();
    this.setupQuestionnaireInteractions();
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
  getUsers() {
    return JSON.parse(localStorage.getItem('dogtastik_users') || '[]');
  }

  saveUsers(users) {
    localStorage.setItem('dogtastik_users', JSON.stringify(users));
  }

  getOrders() {
    return JSON.parse(localStorage.getItem('dogtastik_orders') || '[]');
  }

  saveOrders(orders) {
    localStorage.setItem('dogtastik_orders', JSON.stringify(orders));
  }

  loadSession() {
    const session = localStorage.getItem('dogtastik_session');
    if (session) {
      this.currentUser = JSON.parse(session);
      // Fetch latest active order for this user
      const orders = this.getOrders();
      this.currentOrder = orders.find(o => o.customerEmail === this.currentUser.email && o.status !== 'completed_delivered') || 
                          orders.reverse().find(o => o.customerEmail === this.currentUser.email) || null;
    }
  }

  saveSession(user) {
    this.currentUser = user;
    localStorage.setItem('dogtastik_session', JSON.stringify(user));
    this.updateNav();
  }

  clearSession() {
    this.currentUser = null;
    this.currentOrder = null;
    localStorage.removeItem('dogtastik_session');
    if (this.dashboardAudio) {
      this.dashboardAudio.pause();
      this.dashboardAudio = null;
    }
    window.dogJingleSynth.stop();
    this.updateNav();
    location.hash = '#home';
  }

  // Client-Side Routing
  handleRouting() {
    const hash = location.hash || '#home';
    const views = ['homeView', 'loginView', 'signupView', 'checkoutView', 'questionnaireView', 'dashboardView'];
    
    // Stop any playing synth audio on route change
    window.dogJingleSynth.stop();
    this.resetSamplePlayButtons();

    // Route guards
    if (hash === '#checkout' && !this.currentUser) {
      location.hash = '#login';
      return;
    }

    if (hash === '#questionnaire') {
      if (!this.currentUser) {
        location.hash = '#login';
        return;
      }
      if (!this.currentOrder || this.currentOrder.status === 'placed') {
        location.hash = '#pricing';
        return;
      }
    }

    if (hash === '#dashboard') {
      if (!this.currentUser) {
        location.hash = '#login';
        return;
      }
      this.renderDashboard();
    }

    // Swapping view visibility
    let activeView = 'homeView';
    if (hash === '#login') activeView = 'loginView';
    else if (hash === '#signup') activeView = 'signupView';
    else if (hash === '#checkout') activeView = 'checkoutView';
    else if (hash === '#questionnaire') activeView = 'questionnaireView';
    else if (hash === '#dashboard') activeView = 'dashboardView';

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

  // Navigation UI updates
  updateNav() {
    const authNav = document.getElementById('authNavButtons');
    if (!authNav) return;

    if (this.currentUser) {
      authNav.innerHTML = `
        <span style="font-weight: 500; font-size: 0.9rem; color: var(--text-muted);">Hi, ${this.currentUser.name}</span>
        <a href="#dashboard" class="btn btn-secondary btn-sm">Dashboard</a>
        <button onclick="app.clearSession()" class="btn btn-primary btn-sm">Sign Out</button>
      `;
    } else {
      authNav.innerHTML = `
        <a href="#login" class="btn btn-secondary btn-sm">Sign In</a>
        <a href="#signup" class="btn btn-primary btn-sm">Get Started</a>
      `;
    }
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

  // E-commerce checkout trigger
  buyPackage(packageName, price) {
    if (!this.currentUser) {
      location.hash = '#login';
      return;
    }

    // Store package details for checkout page
    sessionStorage.setItem('pending_package', JSON.stringify({ name: packageName, price: price }));
    
    // Update checkout UI details
    document.getElementById('checkoutPackageName').textContent = packageName;
    document.getElementById('checkoutPriceText').textContent = `$${price}`;
    
    location.hash = '#checkout';
  }

  // Handle Authentication
  handleSignup(event) {
    event.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    const users = this.getUsers();
    if (users.find(u => u.email === email)) {
      alert('An account with this email already exists.');
      return;
    }

    const newUser = { name, email, password };
    users.push(newUser);
    this.saveUsers(users);

    this.saveSession(newUser);
    
    // Check if there was a package pending checkout
    const pending = sessionStorage.getItem('pending_package');
    if (pending) {
      const pkg = JSON.parse(pending);
      this.buyPackage(pkg.name, pkg.price);
    } else {
      location.hash = '#home';
    }
  }

  handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      alert('Invalid email or password.');
      return;
    }

    this.saveSession(user);

    const pending = sessionStorage.getItem('pending_package');
    if (pending) {
      const pkg = JSON.parse(pending);
      this.buyPackage(pkg.name, pkg.price);
    } else {
      // Load current order if they already have one
      const orders = this.getOrders();
      const userOrder = orders.find(o => o.customerEmail === email && o.status !== 'completed_delivered');
      if (userOrder) {
        location.hash = '#dashboard';
      } else {
        location.hash = '#home';
      }
    }
  }

  // Handle Payments (Stripe Simulator)
  handlePaymentSubmit(event) {
    event.preventDefault();
    const overlay = document.getElementById('loadingOverlay');
    const overlayText = document.getElementById('overlayText');
    
    overlayText.textContent = "Connecting to Stripe...";
    overlay.style.display = 'flex';

    setTimeout(() => {
      overlayText.textContent = "Authorizing credit card...";
      
      setTimeout(() => {
        // Payment successful
        overlay.style.display = 'none';
        
        const pending = JSON.parse(sessionStorage.getItem('pending_package') || '{"name":"The Golden Record","price":59}');
        sessionStorage.removeItem('pending_package');

        // Create new order record
        const orders = this.getOrders();
        const newOrder = {
          id: 'DT-' + Math.floor(100000 + Math.random() * 90000),
          customerEmail: this.currentUser.email,
          customerName: this.currentUser.name,
          packageName: pending.name,
          price: pending.price,
          status: 'paid',
          date: new Date().toLocaleDateString(),
          dogDetails: null,
          jingleFile: null,
          lyrics: ''
        };

        orders.push(newOrder);
        this.saveOrders(orders);
        this.currentOrder = newOrder;

        location.hash = '#questionnaire';
      }, 1500);

    }, 1000);
  }

  // Handle Dog Questionnaire Submission
  handleQuestionnaireSubmit(event) {
    event.preventDefault();
    if (!this.currentOrder) return;

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

    const vibeInput = document.querySelector('input[name="vibe"]:checked');
    if (!vibeInput) {
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
      signature_sound: signatureSound,
      signature_sound_other: signatureSoundOther,
      vibe: vibeInput.value
    };

    const orders = this.getOrders();
    const orderIdx = orders.findIndex(o => o.id === this.currentOrder.id);
    
    if (orderIdx !== -1) {
      orders[orderIdx].dogDetails = dogDetails;
      orders[orderIdx].status = 'questionnaire'; // details submitted
      this.saveOrders(orders);
      this.currentOrder = orders[orderIdx];
    }

    // Reset questionnaire form
    document.getElementById('dogQuestionnaireForm').reset();
    location.hash = '#dashboard';
  }

  // Populate Customer Dashboard
  renderDashboard() {
    if (!this.currentUser) return;
    
    const orders = this.getOrders();
    // Fetch latest active order
    this.currentOrder = orders.find(o => o.customerEmail === this.currentUser.email && o.status !== 'completed_delivered') || 
                        orders.reverse().find(o => o.customerEmail === this.currentUser.email) || null;

    const profileCard = document.getElementById('dashboardDogProfile');
    const editBtn = document.getElementById('editQuestionnaireBtn');
    
    // Stop any ongoing dashboard playing audio
    if (this.dashboardAudio) {
      this.dashboardAudio.pause();
      this.dashboardAudio = null;
      this.dashboardAudioPlaying = false;
      this.updateDashboardPlayBtn();
    }
    
    if (!this.currentOrder) {
      document.getElementById('dashboardSub').textContent = "No orders found.";
      profileCard.innerHTML = `<div class="info-item"><p>Select a package on the home page to start!</p></div>`;
      this.updateStepper('none');
      document.getElementById('statusPendingInfo').style.display = 'block';
      document.getElementById('statusCompletedInfo').style.display = 'none';
      return;
    }

    document.getElementById('dashboardSub').textContent = `Order ID: ${this.currentOrder.id} • Package: ${this.currentOrder.packageName}`;
    
    // Render Dog Profile details
    if (this.currentOrder.dogDetails) {
      editBtn.style.display = 'inline-block';
      const details = this.currentOrder.dogDetails;

      const traitsHTML = details.personality_traits.map(t => `<span class="tag">${t}</span>`).join('');
      const signatureSounds = [...details.signature_sound, details.signature_sound_other].filter(Boolean).join(', ');

      profileCard.innerHTML = `
        <div class="info-item">
          <label>Dog Name</label>
          <p>🐾 ${details.dog_name}</p>
        </div>
        <div class="info-item">
          <label>Breed</label>
          <p>${details.dog_breed}</p>
        </div>
        ${details.dog_nickname ? `
        <div class="info-item">
          <label>Nickname(s)</label>
          <p>${details.dog_nickname}</p>
        </div>
        ` : ''}
        <div class="info-item">
          <label>Desired Vibe</label>
          <p style="font-weight: bold; color: var(--primary);">${details.vibe}</p>
        </div>
        <div class="info-item">
          <label>Personality</label>
          <div class="tags-list">${traitsHTML}</div>
        </div>
        <div class="info-item">
          <label>Funniest Habit</label>
          <p>${details.funny_habit}</p>
        </div>
        <div class="info-item" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <label>Loves Most</label>
            <p>${details.favorite_thing}</p>
          </div>
          <div>
            <label>Scared Of / Hates</label>
            <p>${details.fear_or_dislike}</p>
          </div>
        </div>
        <div class="info-item">
          <label>Favorite Person</label>
          <p>${details.favorite_person}${details.relationship_note ? ` — ${details.relationship_note}` : ''}</p>
        </div>
        ${signatureSounds ? `
        <div class="info-item">
          <label>Signature Sound</label>
          <p>${signatureSounds}</p>
        </div>
        ` : ''}
      `;
    } else {
      editBtn.style.display = 'none';
      profileCard.innerHTML = `
        <div class="info-item">
          <label>Dog Name</label>
          <p>Details Not Submitted</p>
          <a href="#questionnaire" class="btn btn-cta btn-sm" style="margin-top: 12px;">Fill Questionnaire</a>
        </div>
      `;
    }

    // Update progress stepper
    this.updateStepper(this.currentOrder.status);

    // Update deliverable card
    const pendingCard = document.getElementById('statusPendingInfo');
    const completedCard = document.getElementById('statusCompletedInfo');

    if (this.currentOrder.status === 'ready') {
      pendingCard.style.display = 'none';
      completedCard.style.display = 'block';

      // Setup lyrics and download URL
      document.getElementById('lyricsContent').innerHTML = this.currentOrder.lyrics ? 
        this.currentOrder.lyrics.replace(/\n/g, '<br>') : 'No lyrics sheets provided.';
      
      const downloadBtn = document.getElementById('downloadJingleLink');
      if (this.currentOrder.jingleFile) {
        downloadBtn.href = this.currentOrder.jingleFile;
        downloadBtn.style.display = 'inline-flex';
      } else {
        // Synth only, hide file download since it is code synthesized
        downloadBtn.style.display = 'none';
      }
    } else {
      pendingCard.style.display = 'block';
      completedCard.style.display = 'none';
      
      // Update text descriptive to exact current status
      const descHeading = pendingCard.querySelector('h4');
      const descText = pendingCard.querySelector('p');

      if (this.currentOrder.status === 'paid') {
        descHeading.textContent = "Questionnaire Needed";
        descText.innerHTML = `Your payment of $${this.currentOrder.price} was received successfully. <br>Please <a href="#questionnaire" style="font-weight:600;">fill out the questionnaire</a> about your dog so we can start composing!`;
      } else if (this.currentOrder.status === 'questionnaire') {
        descHeading.textContent = "Order Received";
        descText.textContent = "Thank you! We've received your dog's profile. We are assigning your order to our song composers now.";
      } else if (this.currentOrder.status === 'composing') {
        descHeading.textContent = "Composing Your Tune";
        descText.textContent = "Our composers are actively recording and tweaking the melodies for your dog. Your tune will be ready soon!";
      }
    }
  }

  // Edit questionnaire handler
  editQuestionnaire() {
    if (!this.currentOrder || !this.currentOrder.dogDetails) return;
    const details = this.currentOrder.dogDetails;

    document.getElementById('dogName').value = details.dog_name;
    document.getElementById('dogBreed').value = details.dog_breed;
    document.getElementById('dogNickname').value = details.dog_nickname || '';
    document.getElementById('funnyHabit').value = details.funny_habit;
    document.getElementById('favoriteThing').value = details.favorite_thing;
    document.getElementById('fearOrDislike').value = details.fear_or_dislike;
    document.getElementById('favoritePerson').value = details.favorite_person;
    document.getElementById('relationshipNote').value = details.relationship_note || '';
    document.getElementById('signatureSoundOther').value = details.signature_sound_other || '';

    document.querySelectorAll('#personalityTraits input[type="checkbox"]').forEach(cb => {
      cb.checked = details.personality_traits.includes(cb.value);
      cb.disabled = false;
    });
    document.getElementById('personalityCount').textContent = `${details.personality_traits.length} of 3 selected`;
    this.updateVibeSuggestion(details.personality_traits);

    document.querySelectorAll('#signatureSound input[type="checkbox"]').forEach(cb => {
      cb.checked = details.signature_sound.includes(cb.value);
    });

    document.querySelectorAll('input[name="vibe"]').forEach(radio => {
      radio.checked = radio.value === details.vibe;
    });

    location.hash = '#questionnaire';
  }

  // Stepper Visual Updates
  updateStepper(status) {
    const nodes = [
      { id: 'stepNode-1', stat: ['placed', 'paid', 'questionnaire', 'composing', 'ready'] },
      { id: 'stepNode-2', stat: ['paid', 'questionnaire', 'composing', 'ready'] },
      { id: 'stepNode-3', stat: ['questionnaire', 'composing', 'ready'] },
      { id: 'stepNode-4', stat: ['composing', 'ready'] },
      { id: 'stepNode-5', stat: ['ready'] }
    ];

    let progressPct = 0;
    if (status === 'placed') progressPct = 0;
    else if (status === 'paid') progressPct = 25;
    else if (status === 'questionnaire') progressPct = 50;
    else if (status === 'composing') progressPct = 75;
    else if (status === 'ready') progressPct = 100;

    document.getElementById('stepperProgress').style.width = `${progressPct}%`;

    nodes.forEach((node, idx) => {
      const el = document.getElementById(node.id);
      if (!el) return;

      if (status === 'none') {
        el.className = 'step-node';
        return;
      }

      el.classList.remove('active', 'completed');
      
      const nodeStatusIndex = node.stat.indexOf(status);
      
      if (nodeStatusIndex > 0) {
        el.classList.add('completed');
      } else if (nodeStatusIndex === 0) {
        el.classList.add('active');
      }
    });
  }

  // Dashboard Completed Tune Player
  playCompletedTune() {
    if (!this.currentOrder || this.currentOrder.status !== 'ready') return;
    
    const playBtn = document.getElementById('playBtn-dashboard');
    const progressBar = document.getElementById('progress-dashboard');
    const timeDisplay = document.getElementById('time-dashboard');

    // Case 1: Custom audio file uploaded by Admin
    if (this.currentOrder.jingleFile) {
      if (this.dashboardAudioPlaying) {
        this.dashboardAudio.pause();
        this.dashboardAudioPlaying = false;
        this.updateDashboardPlayBtn();
        if (this.dashboardAudioInterval) clearInterval(this.dashboardAudioInterval);
        return;
      }

      if (!this.dashboardAudio) {
        this.dashboardAudio = new Audio(this.currentOrder.jingleFile);
        this.dashboardAudio.addEventListener('ended', () => {
          this.dashboardAudioPlaying = false;
          this.updateDashboardPlayBtn();
          progressBar.style.width = '0%';
          timeDisplay.textContent = '0:00';
          if (this.dashboardAudioInterval) clearInterval(this.dashboardAudioInterval);
        });
      }

      this.dashboardAudio.play();
      this.dashboardAudioPlaying = true;
      this.updateDashboardPlayBtn();

      // Track progress
      this.dashboardAudioInterval = setInterval(() => {
        const duration = this.dashboardAudio.duration || 10;
        const current = this.dashboardAudio.currentTime;
        const pct = (current / duration) * 100;
        progressBar.style.width = `${pct}%`;
        
        const m = Math.floor(current / 60);
        const s = Math.floor(current % 60).toString().padStart(2, '0');
        timeDisplay.textContent = `${m}:${s}`;
      }, 100);

    } else {
      // Case 2: Fallback to interactive synthesis based on selected vibe
      const vibe = this.currentOrder.dogDetails ? this.currentOrder.dogDetails.vibe : null;
      const synthMethod = this.VIBE_TO_SYNTH[vibe] || 'playEnergetic';

      if (window.dogJingleSynth.isPlaying) {
        window.dogJingleSynth.stop();
        this.dashboardAudioPlaying = false;
        this.updateDashboardPlayBtn();
        progressBar.style.width = '0%';
        timeDisplay.textContent = '0:00';
        return;
      }

      this.dashboardAudioPlaying = true;
      this.updateDashboardPlayBtn();

      const progressCallback = (pct) => {
        progressBar.style.width = `${pct}%`;
        const secs = Math.floor((pct / 100) * 10);
        timeDisplay.textContent = `0:${secs.toString().padStart(2, '0')}`;
      };

      const endedCallback = () => {
        this.dashboardAudioPlaying = false;
        this.updateDashboardPlayBtn();
        progressBar.style.width = '0%';
        timeDisplay.textContent = '0:00';
      };

      window.dogJingleSynth[synthMethod](progressCallback, endedCallback);
    }
  }

  updateDashboardPlayBtn() {
    const playBtn = document.getElementById('playBtn-dashboard');
    if (!playBtn) return;

    if (this.dashboardAudioPlaying) {
      playBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      `;
    } else {
      playBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
    }
  }

  seekCompletedTune(event) {
    if (!this.dashboardAudio) return;
    const bar = event.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    const pct = clickX / width;
    
    if (this.currentOrder.jingleFile && this.dashboardAudio) {
      this.dashboardAudio.currentTime = pct * this.dashboardAudio.duration;
    }
  }
}

// Global App Instance
window.app = new DogTastikApp();
