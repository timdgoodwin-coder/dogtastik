// Admin Portal Logic for DogTastik.com

class DogTastikAdmin {
  constructor() {
    this.currentOrder = null;
    this.uploadedFileBase64 = null;
    this.uploadedFileName = null;
    this.emailLogs = [];

    document.addEventListener('DOMContentLoaded', () => this.init());
  }

  init() {
    this.checkSession();
    this.setupDragAndDrop();
  }

  // Session Authentication
  checkSession() {
    const isAdmin = sessionStorage.getItem('dogtastik_admin_logged');
    const authNav = document.getElementById('adminAuthNav');

    if (isAdmin === 'true') {
      document.getElementById('adminLoginView').classList.remove('active');
      document.getElementById('adminDashboardView').classList.add('active');
      
      authNav.innerHTML = `<button onclick="admin.handleLogout()" class="btn btn-secondary btn-sm">Admin Sign Out</button>`;
      
      this.renderDashboard();
    } else {
      document.getElementById('adminLoginView').classList.add('active');
      document.getElementById('adminDashboardView').classList.remove('active');
      authNav.innerHTML = '';
    }
  }

  handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    if (email === 'admin@dogtastik.com' && password === 'dogtastik') {
      sessionStorage.setItem('dogtastik_admin_logged', 'true');
      this.checkSession();
    } else {
      alert('Access Denied. Incorrect admin credentials.');
    }
  }

  handleLogout() {
    sessionStorage.removeItem('dogtastik_admin_logged');
    this.closeModal();
    this.checkSession();
  }

  // Fetch Database
  getOrders() {
    return JSON.parse(localStorage.getItem('dogtastik_orders') || '[]');
  }

  saveOrders(orders) {
    localStorage.setItem('dogtastik_orders', JSON.stringify(orders));
  }

  // Dashboard Stats & Table
  renderDashboard() {
    const orders = this.getOrders();
    
    // Stats calculation
    let totalSales = 0;
    let pendingCount = 0;
    let completedCount = 0;

    orders.forEach(o => {
      if (o.status !== 'placed') {
        totalSales += Number(o.price || 0);
      }
      if (o.status === 'ready' || o.status === 'completed_delivered') {
        completedCount++;
      } else {
        pendingCount++;
      }
    });

    document.getElementById('statTotalEarnings').textContent = `$${totalSales}`;
    document.getElementById('statPendingCount').textContent = pendingCount;
    document.getElementById('statCompletedCount').textContent = completedCount;

    this.filterOrders();
  }

  filterOrders() {
    const orders = this.getOrders();
    const filter = document.getElementById('statusFilter').value;
    const tableBody = document.getElementById('ordersTableBody');
    tableBody.innerHTML = '';

    const filtered = orders.filter(o => {
      if (filter === 'all') return true;
      return o.status === filter;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 40px 0;">No orders found matching filter.</td>
        </tr>
      `;
      return;
    }

    filtered.reverse().forEach(o => {
      const dogName = o.dogDetails ? o.dogDetails.dog_name : '<em>Pending details</em>';
      const statusBadge = this.getStatusBadge(o.status);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${o.id}</strong></td>
        <td>${o.date}</td>
        <td>${o.customerName}<br><span style="font-size: 0.8rem; color: var(--text-muted);">${o.customerEmail}</span></td>
        <td>🐾 ${dogName}</td>
        <td>${o.packageName} ($${o.price})</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="admin.viewOrderDetails('${o.id}')">View Details</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  getStatusBadge(status) {
    let label = 'Placed';
    let className = 'placed';

    if (status === 'paid') { label = 'Paid'; className = 'paid'; }
    else if (status === 'questionnaire') { label = 'Details Sent'; className = 'questionnaire'; }
    else if (status === 'composing') { label = 'Composing'; className = 'composing'; }
    else if (status === 'ready') { label = 'Ready!'; className = 'ready'; }

    return `<span class="status-badge ${className}">${label}</span>`;
  }

  // Modal Detail Operations
  viewOrderDetails(orderId) {
    const orders = this.getOrders();
    this.currentOrder = orders.find(o => o.id === orderId);
    
    if (!this.currentOrder) return;

    // Set modal title
    document.getElementById('modalTitle').textContent = `Order Details: ${this.currentOrder.id}`;
    
    // Load questionnaire info
    const dogList = document.getElementById('modalDogDetails');
    const copyBtn = document.getElementById('copyQuestionnaireBtn');
    const details = this.currentOrder.dogDetails;
    copyBtn.style.display = details ? 'inline-block' : 'none';

    if (details) {
      const traitsHTML = details.personality_traits.map(t => `<span class="tag">${t}</span>`).join('');
      const signatureSounds = [...details.signature_sound, details.signature_sound_other].filter(Boolean).join(', ');

      dogList.innerHTML = `
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
        <div class="info-item" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
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
        <div class="info-item">
          <label>Signature Sound</label>
          <p>${signatureSounds || 'None noted'}</p>
        </div>
      `;
    } else {
      dogList.innerHTML = `
        <div class="info-item" style="text-align: center; padding: 20px 0;">
          <p style="color: var(--text-muted);">Customer has not submitted the questionnaire details yet.</p>
        </div>
      `;
    }

    // Set interactive panel
    document.getElementById('modalStatusSelect').value = this.currentOrder.status;
    document.getElementById('modalLyrics').value = this.currentOrder.lyrics || '';

    // File info resets
    this.uploadedFileBase64 = this.currentOrder.jingleFile;
    this.uploadedFileName = null;
    this.updateUploadZoneUI();
    this.updateModalStatus(); // hide/show file upload depending on selection

    // Load email logs
    this.emailLogs = this.currentOrder.emailLogs || [];
    this.renderEmailLogs();

    // Show modal
    document.getElementById('detailsModal').style.display = 'flex';
  }

  // Copies the questionnaire answers as JSON in the flat shape the lyric-generation
  // skill expects (see doggy-jingle-survey-spec.md) so it can be pasted in directly.
  copyQuestionnaireJSON() {
    const details = this.currentOrder && this.currentOrder.dogDetails;
    if (!details) return;

    const payload = {
      dog_name: details.dog_name,
      dog_breed: details.dog_breed,
      dog_nickname: details.dog_nickname || '',
      personality_traits: details.personality_traits,
      funny_habit: details.funny_habit,
      favorite_thing: details.favorite_thing,
      fear_or_dislike: details.fear_or_dislike,
      favorite_person: details.favorite_person,
      relationship_note: details.relationship_note || '',
      signature_sound: details.signature_sound.join(', '),
      signature_sound_other: details.signature_sound_other || '',
      vibe: details.vibe
    };

    const json = JSON.stringify(payload, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert('Questionnaire JSON copied to clipboard.');
    }).catch(() => {
      alert('Could not copy automatically — here is the JSON:\n\n' + json);
    });
  }

  updateModalStatus() {
    const status = document.getElementById('modalStatusSelect').value;
    const uploadContainer = document.getElementById('fileUploadContainer');
    const sendEmailBtn = document.getElementById('sendEmailBtn');

    if (status === 'ready') {
      uploadContainer.style.display = 'block';
      sendEmailBtn.removeAttribute('disabled');
    } else {
      uploadContainer.style.display = 'none';
      sendEmailBtn.setAttribute('disabled', 'true');
    }
  }

  closeModal() {
    document.getElementById('detailsModal').style.display = 'none';
    this.currentOrder = null;
    this.uploadedFileBase64 = null;
    this.uploadedFileName = null;
  }

  // Drag and drop audio parser helpers
  setupDragAndDrop() {
    const dropZone = document.getElementById('fileDropZone');
    if (!dropZone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length) {
        this.processFile(files[0]);
      }
    }, false);
  }

  handleFileSelect(event) {
    const files = event.target.files;
    if (files.length) {
      this.processFile(files[0]);
    }
  }

  processFile(file) {
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file (.mp3, .wav, etc)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedFileBase64 = e.target.result;
      this.uploadedFileName = file.name;
      this.updateUploadZoneUI();
    };
    reader.readAsDataURL(file);
  }

  updateUploadZoneUI() {
    const zone = document.getElementById('fileDropZone');
    const label = document.getElementById('fileNameLabel');
    const statusText = document.getElementById('uploadStatusText');

    if (this.uploadedFileBase64) {
      zone.classList.add('has-file');
      statusText.textContent = "Audio File Loaded";
      label.style.display = 'block';
      label.textContent = this.uploadedFileName ? `📄 ${this.uploadedFileName}` : '📄 custom_tune.mp3 (Saved)';
    } else {
      zone.classList.remove('has-file');
      statusText.textContent = "Drag & Drop or Click to Upload";
      label.style.display = 'none';
    }
  }

  // Save changes
  saveOrderChanges() {
    if (!this.currentOrder) return;

    const newStatus = document.getElementById('modalStatusSelect').value;
    const lyrics = document.getElementById('modalLyrics').value;

    if (newStatus === 'ready' && !this.uploadedFileBase64) {
      if (!confirm("No audio file uploaded yet. The app will use default synthesized fallback music. Proceed?")) {
        return;
      }
    }

    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === this.currentOrder.id);

    if (idx !== -1) {
      orders[idx].status = newStatus;
      orders[idx].lyrics = lyrics;
      orders[idx].jingleFile = this.uploadedFileBase64;
      orders[idx].emailLogs = this.emailLogs;
      
      this.saveOrders(orders);
      this.currentOrder = orders[idx];
      
      alert('Composer updates saved successfully.');
      this.renderDashboard();
    }
  }

  // Simulate Email notification
  simulateEmailAlert() {
    if (!this.currentOrder || !this.currentOrder.dogDetails) return;

    const dog = this.currentOrder.dogDetails.dog_name;
    const customerName = this.currentOrder.customerName;
    const lyrics = document.getElementById('modalLyrics').value || 'No lyrics sheet.';

    const newMail = {
      to: this.currentOrder.customerEmail,
      subject: `🎵 Your Custom DogTastik Jingle for ${dog} is Ready!`,
      timestamp: new Date().toLocaleString(),
      body: `Hi ${customerName},\n\nFantastic news! The customized jingle for your beloved dog, ${dog}, is complete! Our songwriters loved composing this song for them.\n\nHere are the lyrics:\n"${lyrics}"\n\nTo play and download the MP3 track, simply log into your portal on dogtastik.com.\n\nEnjoy the tune!\n- The DogTastik Team`
    };

    this.emailLogs.unshift(newMail);
    this.renderEmailLogs();
    
    // Auto-save changes to store email log
    this.saveOrderChanges();
    alert(`Mock email notification sent to ${this.currentOrder.customerEmail}!`);
  }

  renderEmailLogs() {
    const container = document.getElementById('emailLogContainer');
    if (this.emailLogs.length === 0) {
      container.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No emails sent for this order yet.</p>`;
      return;
    }

    container.innerHTML = this.emailLogs.map(mail => `
      <div class="email-log-item">
        <strong>Sent:</strong> ${mail.timestamp}<br>
        <strong>Subject:</strong> ${mail.subject}<br>
        <span style="font-size:0.75rem; color:var(--text-muted); white-space: pre-line;">${mail.body}</span>
      </div>
    `).join('');
  }
}

// Global Admin Instance
window.admin = new DogTastikAdmin();
