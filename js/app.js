// MPC Global - Application Controller & State Manager

class MPCApplication {
  constructor() {
    this.currentDate = new Date(2026, 8, 2); // 02-09-2026
    this.activeTab = "availability-calendar";
    this.gridRenderer = null;
    this.selectedDoctorForBooking = null;
    this.selectedServiceForBooking = null;
    this.selectedAppointmentForModal = null;
  }

  init() {
    // 1. Initialize Grid Renderer
    this.gridRenderer = new AppointmentGridRenderer('sheet-grid-container');
    this.gridRenderer.render();

    // 1b. Initialize Drag & Drop (delegation — only needs one bind)
    if (window.MPCDragDrop) {
      window.MPCDragDrop.init();
    }

    // 2. Render Service Filters
    this.renderServiceFilters();

    // 3. Setup Tab Navigation
    this.setupTabNavigation();

    // 4. Setup Date Controls
    this.setupDateControls();

    // 5. Setup Global Patient Search & Keyboard Shortcut (Ctrl+K)
    this.setupGlobalSearch();

    // 6. Setup Modals and Drawers
    this.setupQuickBookingDrawer();
    this.setupAppointmentActionModal();
    this.setupAddPatientModal();

    // 7. Render Alternative Views
    this.renderLiveDoctorStatusView();
    this.renderLiveServiceStatusView();
    this.renderAppointmentsTableView();
    this.renderAvailableSlotsView();
  }

  // Render Horizontal Category Group Filters
  renderServiceFilters() {
    const container = document.getElementById('service-filter-bar');
    if (!container) return;

    const apts = CLINIC_DATA.appointments;

    // Category definitions
    const categories = [
      {
        id: 'ALL',
        label: 'All Services',
        icon: '⊞',
        serviceIds: null, // null = all
        accent: '#2563eb'
      },
      {
        id: 'CAT_AMSK',
        label: 'Advanced MSK',
        icon: '🦴',
        serviceIds: ['AMSK', 'BMSK'],
        accent: '#1155cc'
      },
      {
        id: 'CAT_MODALITIES',
        label: 'Modalities & Machines',
        icon: '⚡',
        serviceIds: ['DTT', 'ACW', 'THOR', 'MAGNETO', 'RBA', 'HIL', 'FOCUSED_SW', 'SPINE_D', 'PELVIC_CHAIR', 'CONSULTATION'],
        accent: '#7c3aed'
      },
      {
        id: 'CAT_WELLNESS',
        label: 'Wellness & Recovery',
        icon: '🫧',
        serviceIds: ['HBOT_HARD', 'HBOT_SOFT', 'RED_LIGHT', 'RED_FOOT_INSOLES', 'PELVIC_CHAIR', 'ICE_BATH', 'CRYOTHERAPY'],
        accent: '#0891b2'
      }
    ];

    let html = '';
    categories.forEach(cat => {
      const count = cat.serviceIds === null
        ? apts.length
        : apts.filter(a => cat.serviceIds.includes(a.service)).length;

      html += `
        <div class="cat-filter-tab" data-service-id="${cat.id}" style="--cat-accent: ${cat.accent}">
          <span class="cat-tab-icon">${cat.icon}</span>
          <span class="cat-tab-label">${cat.label}</span>
          <span class="cat-tab-count">${count}</span>
        </div>
      `;
    });

    container.innerHTML = html;

    // Set first tab active
    const first = container.querySelector('.cat-filter-tab');
    if (first) first.classList.add('active');

    // Attach click events
    container.querySelectorAll('.cat-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.cat-filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const svcId = tab.getAttribute('data-service-id');
        this.gridRenderer.setFilter(svcId);
      });
    });
  }

  // Setup Navigation Tabs
  setupTabNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const targetView = tab.getAttribute('data-view');
        this.switchView(targetView);
      });
    });
  }

  switchView(viewName) {
    this.activeTab = viewName;
    
    // Hide all views
    document.getElementById('sheet-view-wrapper').style.display = 'none';
    document.querySelectorAll('.tab-content-container').forEach(c => c.classList.remove('active'));

    if (viewName === 'availability-calendar') {
      document.getElementById('sheet-view-wrapper').style.display = 'flex';
      this.gridRenderer.render();
    } else if (viewName === 'live-doctor-status') {
      const el = document.getElementById('view-live-doctor-status');
      if (el) {
        el.classList.add('active');
        this.renderLiveDoctorStatusView();
      }
    } else if (viewName === 'live-service-status') {
      const el = document.getElementById('view-live-service-status');
      if (el) {
        el.classList.add('active');
        this.renderLiveServiceStatusView();
      }
    } else if (viewName === 'appointments-tab') {
      const el = document.getElementById('view-appointments-tab');
      if (el) {
        el.classList.add('active');
        this.renderAppointmentsTableView();
      }
    } else if (viewName === 'available-slots') {
      const el = document.getElementById('view-available-slots');
      if (el) {
        el.classList.add('active');
        this.renderAvailableSlotsView();
      }
    }
  }

  // Date Controls
  setupDateControls() {
    const prevBtn = document.getElementById('btn-date-prev');
    const nextBtn = document.getElementById('btn-date-next');
    const todayBtn = document.getElementById('btn-date-today');
    const dateDisplay = document.getElementById('date-display-text');

    const updateDateDisplay = () => {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = days[this.currentDate.getDay()];
      const d = this.currentDate.getDate().toString().padStart(2, '0');
      const m = (this.currentDate.getMonth() + 1).toString().padStart(2, '0');
      const y = this.currentDate.getFullYear();
      if (dateDisplay) {
        dateDisplay.textContent = `${dayName}  [ ${d}-${m}-${y} 📅 ]`;
      }
    };

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentDate.setDate(this.currentDate.getDate() - 1);
        updateDateDisplay();
        this.showToast(`Switched date to ${this.currentDate.toLocaleDateString()}`);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentDate.setDate(this.currentDate.getDate() + 1);
        updateDateDisplay();
        this.showToast(`Switched date to ${this.currentDate.toLocaleDateString()}`);
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        this.currentDate = new Date(2026, 8, 2);
        updateDateDisplay();
        this.showToast("Returned to Wednesday, 02-09-2026");
      });
    }

    updateDateDisplay();
  }

  // Global Search & Autocomplete
  setupGlobalSearch() {
    const searchInput = document.getElementById('global-patient-search');
    
    // Shortcut Ctrl+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput?.focus();
        searchInput?.select();
      }
    });

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (q.length >= 2) {
          const matched = CLINIC_DATA.patients.filter(p => 
            p.name.toLowerCase().includes(q) || p.mobile.includes(q)
          );
          if (matched.length > 0) {
            console.log("Matched patients:", matched);
          }
        }
      });
    }
  }

  // 9. Quick Booking Drawer Logic
  setupQuickBookingDrawer() {
    const drawer = document.getElementById('quick-booking-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    const closeBtn = document.getElementById('btn-close-booking-drawer');
    const cancelBtn = document.getElementById('btn-cancel-booking');
    const form = document.getElementById('quick-booking-form');
    const patientSearchInput = document.getElementById('booking-patient-search');
    const autoList = document.getElementById('booking-autocomplete-list');

    const closeDrawer = () => {
      drawer?.classList.remove('open');
      backdrop?.classList.remove('active');
    };

    closeBtn?.addEventListener('click', closeDrawer);
    cancelBtn?.addEventListener('click', closeDrawer);
    backdrop?.addEventListener('click', closeDrawer);

    // Patient search autocomplete inside drawer
    patientSearchInput?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (q.length < 1) {
        if (autoList) autoList.innerHTML = '';
        return;
      }

      const matches = CLINIC_DATA.patients.filter(p => 
        p.name.toLowerCase().includes(q) || p.mobile.includes(q)
      );

      if (matches.length > 0 && autoList) {
        let html = '';
        matches.forEach(p => {
          html += `
            <div class="patient-autocomplete-item" data-patient-id="${p.id}" data-patient-name="${p.name}" data-package="${p.package}" data-remaining="${p.sessionsRemaining}">
              <div>
                <div class="auto-patient-name">${p.name}</div>
                <div class="auto-patient-sub">📱 ${p.mobile} | ${p.package}</div>
              </div>
              <span class="package-pill-info">${p.sessionsRemaining} left</span>
            </div>
          `;
        });
        autoList.innerHTML = html;

        autoList.querySelectorAll('.patient-autocomplete-item').forEach(item => {
          item.addEventListener('click', () => {
            const pName = item.getAttribute('data-patient-name');
            const pPkg = item.getAttribute('data-package');
            const pRem = item.getAttribute('data-remaining');
            
            patientSearchInput.value = pName;
            document.getElementById('booking-patient-name').value = pName;
            document.getElementById('booking-package-info').textContent = `${pPkg} (${pRem} sessions remaining)`;
            autoList.innerHTML = '';
          });
        });
      }
    });

    // Dynamic Time Slot updater when service dropdown changes
    const svcSelectEl = document.getElementById('booking-service-select');
    const timeSelectEl = document.getElementById('booking-time-select');
    
    svcSelectEl?.addEventListener('change', (e) => {
      const selectedSvcId = e.target.value;
      const isAmsk = selectedSvcId === 'AMSK';
      const slotList = isAmsk ? CLINIC_DATA.amskTimeSlots : CLINIC_DATA.halfHourTimeSlots;

      if (timeSelectEl) {
        timeSelectEl.innerHTML = slotList
          .filter(t => t.start !== "13:30") // exclude lunch slot from regular booking
          .map(t => `<option value="${t.start}-${t.end}">${t.label}</option>`)
          .join('');
      }
    });

    // Handle Quick Booking Form Submit
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const patientName = document.getElementById('booking-patient-name')?.value || patientSearchInput?.value;
      const docId = document.getElementById('booking-doctor-select')?.value;
      const svcId = document.getElementById('booking-service-select')?.value;
      const timeSlot = document.getElementById('booking-time-select')?.value;
      const notes = document.getElementById('booking-notes')?.value;

      if (!patientName || !docId || !svcId || !timeSlot) {
        this.showToast("Please fill in all required fields", "error");
        return;
      }

      const [startTime, endTime] = timeSlot.split('-');
      const serviceObj = CLINIC_DATA.services.find(s => s.id === svcId);
      const doctorObj = CLINIC_DATA.doctors.find(d => d.id === docId);

      // Create new appointment
      const newApt = {
        id: `apt-${Date.now()}`,
        patientId: `p-${Date.now()}`,
        patientName: patientName.toUpperCase(),
        doctor: docId,
        service: svcId,
        startTime: startTime,
        endTime: endTime,
        timeLabel: `${startTime} – ${endTime}`,
        status: "booked",
        notes: notes || "Quick booking created via Sheet",
        packageRemaining: "Active package",
        phone: "+91 98200 00000"
      };

      CLINIC_DATA.appointments.push(newApt);
      this.gridRenderer.render();
      closeDrawer();
      this.showToast(`✓ Booked ${patientName} with ${doctorObj?.name} for ${serviceObj?.name}!`, "success");
    });
  }

  // Open Quick Booking Drawer with preselected doctor, service, and time
  openQuickBookingDrawer(docId, svcId, timeStart = null, timeEnd = null) {
    const drawer = document.getElementById('quick-booking-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    const docSelect = document.getElementById('booking-doctor-select');
    const svcSelect = document.getElementById('booking-service-select');
    const timeSelect = document.getElementById('booking-time-select');
    const summaryCard = document.getElementById('drawer-slot-summary');

    // Populate Doctor Dropdown
    if (docSelect) {
      docSelect.innerHTML = CLINIC_DATA.doctors.map(d => 
        `<option value="${d.id}" ${d.id === docId ? 'selected' : ''}>${d.name} (${d.floor.split('-')[0].trim()})</option>`
      ).join('');
    }

    // Populate Service Dropdown
    if (svcSelect) {
      svcSelect.innerHTML = CLINIC_DATA.services.map(s => 
        `<option value="${s.id}" ${s.id === svcId ? 'selected' : ''}>${s.name} (${s.durationLabel})</option>`
      ).join('');
    }

    // Populate Time Slots (1-Hour slots for AMSK, 30-min for others)
    const isAmsk = svcId === 'AMSK';
    const slotList = isAmsk ? CLINIC_DATA.amskTimeSlots : CLINIC_DATA.halfHourTimeSlots;

    if (timeSelect) {
      timeSelect.innerHTML = slotList
        .filter(t => t.start !== "13:30")
        .map(t => {
          const isMatch = timeStart && (t.start === timeStart);
          return `<option value="${t.start}-${t.end}" ${isMatch ? 'selected' : ''}>${t.label}</option>`;
        }).join('');
    }

    const docObj = CLINIC_DATA.doctors.find(d => d.id === docId);
    const svcObj = CLINIC_DATA.services.find(s => s.id === svcId);

    if (summaryCard && docObj && svcObj) {
      summaryCard.innerHTML = `
        <div class="summary-row">
          <span class="summary-service-name">${svcObj.name}</span>
          <span class="summary-doctor-badge">👨‍⚕️ ${docObj.name}</span>
        </div>
        <div class="summary-meta">
          <span>⏱️ Duration: <strong>${svcObj.durationLabel}</strong></span>
          <span>📍 ${docObj.floor}</span>
          ${timeStart ? `<span>🕒 Slot: <strong>${timeStart} – ${timeEnd || ''}</strong></span>` : ''}
        </div>
      `;
    }

    // Reset fields
    document.getElementById('booking-patient-search').value = '';
    document.getElementById('booking-patient-name').value = '';
    document.getElementById('booking-package-info').textContent = 'Auto-detect on patient select';
    document.getElementById('booking-autocomplete-list').innerHTML = '';

    drawer?.classList.add('open');
    backdrop?.classList.add('active');
    document.getElementById('booking-patient-search')?.focus();
  }

  // 10. Setup Appointment Action Modal
  setupAppointmentActionModal() {
    const backdrop = document.getElementById('modal-backdrop');
    const closeBtn = document.getElementById('btn-close-action-modal');

    const closeModal = () => {
      backdrop?.classList.remove('active');
      this.selectedAppointmentForModal = null;
    };

    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // Action button clicks inside modal
    document.getElementById('btn-action-reschedule')?.addEventListener('click', () => {
      if (this.selectedAppointmentForModal) {
        const newTime = prompt("Enter new time (e.g. 04:00 PM – 05:00 PM):", this.selectedAppointmentForModal.timeLabel);
        if (newTime) {
          this.selectedAppointmentForModal.timeLabel = newTime;
          this.gridRenderer.render();
          closeModal();
          this.showToast("✓ Rescheduled appointment time!", "success");
        }
      }
    });

    document.getElementById('btn-action-cancel-apt')?.addEventListener('click', () => {
      if (this.selectedAppointmentForModal) {
        if (confirm(`Are you sure you want to cancel appointment for ${this.selectedAppointmentForModal.patientName}?`)) {
          this.selectedAppointmentForModal.status = 'cancelled';
          this.gridRenderer.render();
          closeModal();
          this.showToast("Appointment marked as Cancelled", "error");
        }
      }
    });

    // Status changer pills in modal
    document.querySelectorAll('.modal-status-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const newStatus = btn.getAttribute('data-status');
        if (this.selectedAppointmentForModal) {
          this.selectedAppointmentForModal.status = newStatus;
          this.gridRenderer.render();
          closeModal();
          this.showToast(`Updated status to ${newStatus.toUpperCase()}`, "success");
        }
      });
    });
  }

  // Open Appointment Action Modal
  openAppointmentActionModal(aptId) {
    const apt = CLINIC_DATA.appointments.find(a => a.id === aptId);
    if (!apt) return;

    this.selectedAppointmentForModal = apt;
    const backdrop = document.getElementById('modal-backdrop');
    const doctorObj = CLINIC_DATA.doctors.find(d => d.id === apt.doctor);
    const serviceObj = CLINIC_DATA.services.find(s => s.id === apt.service);

    document.getElementById('modal-patient-name-display').textContent = apt.patientName;
    document.getElementById('modal-patient-meta-display').textContent = `📱 ${apt.phone || '+91 98200 11223'} | ${apt.packageRemaining || 'Standard Package'}`;
    document.getElementById('modal-apt-service-display').textContent = serviceObj?.name || apt.service;
    document.getElementById('modal-apt-doctor-display').textContent = doctorObj?.name || apt.doctor;
    document.getElementById('modal-apt-time-display').textContent = apt.timeLabel;
    document.getElementById('modal-apt-notes-display').textContent = apt.notes || 'No special instructions recorded.';

    backdrop?.classList.add('active');
  }

  // Add Patient Modal
  setupAddPatientModal() {
    const btnOpen = document.getElementById('btn-open-add-patient');
    const backdrop = document.getElementById('add-patient-backdrop');
    const btnClose = document.getElementById('btn-close-add-patient');
    const form = document.getElementById('add-patient-form');

    const closeModal = () => backdrop?.classList.remove('active');

    btnOpen?.addEventListener('click', () => backdrop?.classList.add('active'));
    btnClose?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('new-patient-name').value;
      const mobile = document.getElementById('new-patient-mobile').value;
      const pkg = document.getElementById('new-patient-package').value;

      CLINIC_DATA.patients.push({
        id: `p-${Date.now()}`,
        name: name.toUpperCase(),
        mobile: mobile,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        package: pkg,
        sessionsRemaining: 10,
        lastVisit: "Today (New Patient)"
      });

      closeModal();
      this.showToast(`✓ Added new patient ${name}!`, "success");
      form.reset();
    });
  }

  // Render Alternative Views
  renderLiveDoctorStatusView() {
    const container = document.getElementById('live-doctor-status-grid');
    if (!container) return;

    let html = '';
    CLINIC_DATA.doctors.forEach(doc => {
      const stats = this.gridRenderer.calculateDoctorLiveStats(doc, CLINIC_DATA.appointments);
      const docApts = CLINIC_DATA.appointments.filter(a => a.doctor === doc.id && a.status !== 'cancelled');

      html += `
        <div class="doc-live-card">
          <div class="doc-live-header">
            <div class="doc-live-avatar">${doc.avatar}</div>
            <div style="flex: 1;">
              <div class="doc-live-name">${doc.name}</div>
              <div class="doc-live-specialty">${doc.specialty} • ${doc.floor}</div>
            </div>
            <span class="doc-live-status-pill ${stats.status}">${stats.statusLabel}</span>
          </div>

          <div class="doc-stats-table">
            <div class="doc-stat-item">
              <span class="doc-stat-label">Free For</span>
              <span class="doc-stat-val">${stats.freeFor}</span>
            </div>
            <div class="doc-stat-item">
              <span class="doc-stat-label">Next Slot</span>
              <span class="doc-stat-val">${stats.nextAppointment}</span>
            </div>
            <div class="doc-stat-item">
              <span class="doc-stat-label">Total Today</span>
              <span class="doc-stat-val">${docApts.length} Patients</span>
            </div>
            <div class="doc-stat-item">
              <span class="doc-stat-label">Hours</span>
              <span class="doc-stat-val">${doc.workingHours.start} - ${doc.workingHours.end}</span>
            </div>
          </div>

          <div style="font-size: 11px; color: #475569;">
            <strong>Services:</strong> ${doc.supportedServices.join(', ')}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  renderLiveServiceStatusView() {
    const container = document.getElementById('live-service-status-grid');
    if (!container) return;

    let html = '';
    CLINIC_DATA.services.forEach(svc => {
      const apts = CLINIC_DATA.appointments.filter(a => a.service === svc.id && a.status !== 'cancelled');
      const certifiedDocs = CLINIC_DATA.doctors.filter(d => d.supportedServices.includes(svc.id));

      html += `
        <div class="doc-live-card" style="border-top: 4px solid ${svc.color};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div class="doc-live-name">${svc.name}</div>
              <div class="doc-live-specialty">Category: ${svc.category} • ⏱️ ${svc.durationLabel}</div>
            </div>
            <span class="package-pill-info">${apts.length} Booked Today</span>
          </div>

          <p style="font-size: 11.5px; color: #64748b;">${svc.description}</p>

          <div class="doc-stats-table">
            <div class="doc-stat-item">
              <span class="doc-stat-label">Certified Doctors</span>
              <span class="doc-stat-val">${certifiedDocs.length} Specialists</span>
            </div>
            <div class="doc-stat-item">
              <span class="doc-stat-label">Capacity Utilized</span>
              <span class="doc-stat-val">${Math.min(100, Math.round((apts.length / 12) * 100))}%</span>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  renderAppointmentsTableView() {
    const container = document.getElementById('appointments-table-body');
    if (!container) return;

    let html = '';
    CLINIC_DATA.appointments.forEach((apt, index) => {
      const doc = CLINIC_DATA.doctors.find(d => d.id === apt.doctor);
      const svc = CLINIC_DATA.services.find(s => s.id === apt.service);

      html += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-family: monospace; font-weight: bold;">#${index + 1}</td>
          <td style="padding: 10px 12px; font-weight: bold;">${apt.patientName}</td>
          <td style="padding: 10px 12px;"><span style="background: ${svc?.color || '#2563eb'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${svc?.name || apt.service}</span></td>
          <td style="padding: 10px 12px;">${doc?.name || apt.doctor}</td>
          <td style="padding: 10px 12px; font-family: monospace;">${apt.timeLabel}</td>
          <td style="padding: 10px 12px;"><span class="legend-box ${apt.status}" style="display:inline-block; vertical-align:middle; margin-right:4px;"></span>${apt.status.toUpperCase()}</td>
          <td style="padding: 10px 12px; color: #64748b; font-size: 11px;">${apt.notes || '-'}</td>
        </tr>
      `;
    });

    container.innerHTML = html;
  }

  renderAvailableSlotsView() {
    const container = document.getElementById('available-slots-container');
    if (!container) return;

    let html = `
      <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1;">
        <h3 style="margin-bottom: 12px; color: #0f172a;">Smart Real-time Available Slot Finder</h3>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 16px;">Quickly locate open gaps across all specialist doctors for any treatment.</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px;">
    `;

    CLINIC_DATA.doctors.forEach(doc => {
      html += `
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background: #f8fafc;">
          <div style="font-weight: bold; color: #0f172a; margin-bottom: 6px;">${doc.name}</div>
          <div style="font-size: 11px; color: #16a34a; font-weight: 600; margin-bottom: 8px;">🟢 Open: 2:00 PM, 3:30 PM, 5:30 PM</div>
          <button class="btn-primary" style="padding: 4px 10px; font-size: 11px; width: 100%;" onclick="window.MPCApp.openQuickBookingDrawer('${doc.id}', '${doc.supportedServices[0]}')">Quick Book Open Slot</button>
        </div>
      `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
  }

  // Toast System
  showToast(message, type = "normal") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Global App Instance
window.MPCApp = new MPCApplication();

document.addEventListener('DOMContentLoaded', () => {
  window.MPCApp.init();
});
