// MPC Global - High-Craft Healthcare Clinical Appointment Matrix
// Exact PDF Sheet Service-to-Doctor Mapping & Unified Clinic Board

class AppointmentGridRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.activeFilter = "ALL";
    this.searchQuery = "";
  }

  // Calculate live doctor workload & capacity stats
  calculateDoctorStats(doctor, appointments, targetServiceId) {
    const isAll = targetServiceId === "ALL";
    const docApts = appointments.filter(a => a.doctor === doctor.id && a.status !== 'cancelled' && (isAll || a.service === targetServiceId));
    const totalBooked = docApts.length;
    const isAmskDoc = doctor.supportedServices.includes("AMSK") && doctor.primaryService === "AMSK";
    const maxCapacity = isAmskDoc ? 8 : 16;
    const percentage = Math.min(100, Math.round((totalBooked / maxCapacity) * 100));

    const nowMinutes = 12 * 60 + 30; // 12:30 PM simulated
    let isCurrentlyBusy = false;
    let currentApt = null;
    let nextAptTime = "Free";

    for (let apt of docApts) {
      const [sh, sm] = apt.startTime.split(':').map(Number);
      const [eh, em] = apt.endTime.split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;

      if (nowMinutes >= startMins && nowMinutes < endMins) {
        isCurrentlyBusy = true;
        currentApt = apt;
      }

      if (startMins > nowMinutes && nextAptTime === "Free") {
        const hour = sh % 12 || 12;
        const ampm = sh >= 12 ? 'PM' : 'AM';
        nextAptTime = `${hour}:${sm.toString().padStart(2, '0')} ${ampm}`;
      }
    }

    return {
      totalBooked,
      maxCapacity,
      percentage,
      status: isCurrentlyBusy ? "busy" : "available",
      statusLabel: isCurrentlyBusy ? "In Session" : "Available",
      nextLabel: isCurrentlyBusy ? `Next: ${nextAptTime}` : "Free",
      currentPatient: currentApt ? currentApt.patientName : null
    };
  }

  // Format 24h to 12h readable string
  formatTime12(time24) {
    const [h, m] = time24.split(':').map(Number);
    const hour = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  render(data = CLINIC_DATA) {
    if (!this.container) return;

    const isAll = this.activeFilter === "ALL";
    let targetService = null;
    let filteredDoctors = [];
    let activeSlots = data.halfHourTimeSlots;

    if (isAll) {
      targetService = {
        id: "ALL",
        name: "All Clinic Services",
        shortName: "All Services",
        durationLabel: "30m & 1h Mapped"
      };
      filteredDoctors = data.doctors;
      activeSlots = data.halfHourTimeSlots;
    } else if (this.activeFilter === "AMSK") {
      targetService = data.services.find(s => s.id === "AMSK") || data.services[0];
      const amskDocIds = ['doc-vidisha', 'doc-diwakar', 'doc-krishna', 'doc-hardi', 'doc-spoorthi'];
      filteredDoctors = data.doctors.filter(d => amskDocIds.includes(d.id));
      activeSlots = data.amskTimeSlots;
    } else if (this.activeFilter === "THOR") {
      targetService = data.services.find(s => s.id === "THOR") || data.services[2];
      const thorDocIds = ['doc-shifa', 'doc-ankita', 'doc-sakshi-b', 'doc-daniya', 'doc-sakshi-s'];
      filteredDoctors = data.doctors.filter(d => thorDocIds.includes(d.id));
      activeSlots = data.halfHourTimeSlots;
    } else if (this.activeFilter === "DTT") {
      targetService = data.services.find(s => s.id === "DTT") || data.services[1];
      const dttDocIds = ['doc-saurambika', 'doc-sakshi-b', 'doc-daniya', 'doc-anjali-k', 'doc-rati'];
      filteredDoctors = data.doctors.filter(d => dttDocIds.includes(d.id));
      activeSlots = data.halfHourTimeSlots;
    } else {
      targetService = data.services.find(s => s.id === this.activeFilter) || data.services[0];
      filteredDoctors = data.doctors.filter(d => d.supportedServices.includes(this.activeFilter));
      if (filteredDoctors.length === 0) {
        filteredDoctors = data.doctors.slice(0, 5);
      }
      activeSlots = data.halfHourTimeSlots;
    }

    // Overall clinic capacity metrics
    const totalServiceBookings = data.appointments.filter(a => (isAll || a.service === targetService.id) && a.status !== 'cancelled').length;
    const totalCapacity = filteredDoctors.length * (this.activeFilter === "AMSK" ? 8 : 12);
    const clinicUtilization = totalCapacity > 0 ? Math.min(100, Math.round((totalServiceBookings / totalCapacity) * 100)) : 88;

    let html = `
      <table class="sheet-table infographic-grid-table" id="main-sheet-table">
        <thead>
          <tr>
            <!-- Top-Left Corner Cell with Infographic Capacity Gauge -->
            <th class="sheet-corner-cell">
              <div class="corner-infographic-box">
                <div class="corner-head-line">
                  <span class="corner-service-badge">🩺 ${targetService.shortName || targetService.name}</span>
                  <span class="corner-duration-pill">${targetService.durationLabel}</span>
                </div>
                
                <div class="corner-stats-line">
                  <div class="utilization-gauge-wrap">
                    <div class="utilization-label-row">
                      <span class="gauge-title">Clinic Load</span>
                      <span class="gauge-value">${clinicUtilization}% (${totalServiceBookings}/${totalCapacity})</span>
                    </div>
                    <div class="gauge-progress-track">
                      <div class="gauge-progress-bar" style="width: ${clinicUtilization}%"></div>
                    </div>
                  </div>
                </div>

                <div class="corner-footer-meta">
                  <span>👥 ${filteredDoctors.length} Doctors Active</span>
                </div>
              </div>
            </th>
    `;

    // Doctor Column Headers: Big Service Name, Smaller Doctor Name, Clean (No time, No available status)
    filteredDoctors.forEach(doc => {
      const stats = this.calculateDoctorStats(doc, data.appointments, this.activeFilter);
      const primarySvc = doc.primaryServiceLabel || doc.specialty;

      html += `
        <th class="doc-header-cell" data-doctor-id="${doc.id}">
          <div class="doc-header-box">
            <!-- Line 1: Big Prominent Service Name -->
            <div class="doc-service-title-row">
              <span class="doc-service-main-name" title="${primarySvc}">${primarySvc}</span>
            </div>

            <!-- Line 2: Smaller Doctor Name -->
            <div class="doc-identity-sub-line">
              <div class="doc-avatar-mini">${doc.avatar}</div>
              <span class="doc-sub-name" title="${doc.name}">${doc.name}</span>
            </div>

            <!-- Line 3: Clean Doctor Workload Load Bar (No time, No available chip) -->
            <div class="doc-load-footer-line">
              <span class="load-text">${stats.totalBooked} Booked</span>
              <div class="mini-load-bar-track">
                <div class="mini-load-bar-fill" style="width: ${stats.percentage}%"></div>
              </div>
            </div>
          </div>
        </th>
      `;
    });

    html += `
          </tr>
        </thead>
        <tbody>
    `;

    // Time Slot Rows
    activeSlots.forEach((slot) => {
      const isLunchRow = slot.start === "13:30";

      if (isLunchRow) {
        // Clinic Synchronized Lunch Break Divider
        html += `
          <tr class="sheet-time-row lunch-divider-row">
            <td class="time-col-cell lunch-time-cell">
              <div class="time-infographic-box lunch-time-box">
                <span class="slot-time-primary" style="color:#1e293b !important">01:30 PM</span>
                <span class="slot-time-arrow" style="color:#94a3b8 !important">↓</span>
                <span class="slot-time-secondary" style="color:#64748b !important">02:00 PM</span>
              </div>
            </td>
        `;

        filteredDoctors.forEach(doc => {
          html += `
            <td class="sheet-cell lunch-bar-cell" data-doctor-id="${doc.id}">
              <div class="lunch-strip-infographic">
                <span class="lunch-strip-label">LUNCH BREAK</span>
              </div>
            </td>
          `;
        });

        html += `</tr>`;
        return;
      }

      // Standard Time Slot Row
      html += `
        <tr class="sheet-time-row clean-time-row" data-time-start="${slot.start}" data-time-end="${slot.end}">
          <!-- Time Column with Infographic Monospace Badge -->
          <td class="time-col-cell">
            <div class="time-infographic-box">
              <span class="slot-time-primary" style="color:#1e293b !important">${slot.label.split(' - ')[0]}</span>
              <span class="slot-time-arrow" style="color:#94a3b8 !important">↓</span>
              <span class="slot-time-secondary" style="color:#64748b !important">${slot.label.split(' - ')[1]}</span>
            </div>
          </td>
      `;

      // Doctor Cells
      filteredDoctors.forEach(doc => {
        const [slotH, slotM] = slot.start.split(':').map(Number);
        const [docStartH, docStartM] = doc.workingHours.start.split(':').map(Number);
        const [docEndH, docEndM] = doc.workingHours.end.split(':').map(Number);
        const slotMins = slotH * 60 + slotM;
        const docStartMins = docStartH * 60 + docStartM;
        const docEndMins = docEndH * 60 + docEndM;

        // Check if doctor has an appointment starting at this slot
        const apt = data.appointments.find(a => 
          a.doctor === doc.id && 
          a.status !== 'cancelled' && 
          (isAll || a.service === targetService.id) &&
          a.startTime === slot.start
        );

        // Check if this slot is occupied by a 1-hour appointment from the previous half-hour
        if (!apt) {
          const priorApt = data.appointments.find(a => {
            if (a.doctor !== doc.id || a.status === 'cancelled') return false;
            if (!isAll && a.service !== targetService.id) return false;
            const [ash, asm] = a.startTime.split(':').map(Number);
            const [aeh, aem] = a.endTime.split(':').map(Number);
            const aStartM = ash * 60 + asm;
            const aEndM = aeh * 60 + aem;
            return slotMins > aStartM && slotMins < aEndM;
          });

          if (priorApt && isAll) {
            // Already spanned by the prior appointment's rowspan="2". Do not output <td>.
            return;
          }
        }

        // Calculate rowspan for appointments lasting longer than 30 minutes in half-hour view
        let rowSpanAttr = "";
        let isMerged1Hr = false;
        if (apt && isAll) {
          const [ash, asm] = apt.startTime.split(':').map(Number);
          const [aeh, aem] = apt.endTime.split(':').map(Number);
          const durationMins = (aeh * 60 + aem) - (ash * 60 + asm);
          if (durationMins >= 60) {
            const spans = Math.min(4, Math.round(durationMins / 30));
            rowSpanAttr = ` rowspan="${spans}"`;
            isMerged1Hr = true;
          }
        }

        const effectiveServiceId = apt ? apt.service : (doc.supportedServices[0] || "AMSK");

        html += `
          <td class="sheet-cell slot-matrix-cell${isMerged1Hr ? ' merged-1hr-cell' : ''}"${rowSpanAttr}
              data-doctor-id="${doc.id}" 
              data-service-id="${effectiveServiceId}"
              data-time-start="${slot.start}"
              data-time-end="${slot.end}">
        `;

        if (apt) {
          // Clean, Single-Instance Appointment Card (Truly Merged across both slots)
          const statusUpper = apt.status.toUpperCase().replace('_', ' ');

          html += `
            <div class="infographic-apt-card status-${apt.status}${isMerged1Hr ? ' merged-1hr-card' : ''}" 
                 draggable="true" 
                 data-appointment-id="${apt.id}"
                 data-doctor-id="${doc.id}"
                 data-service-id="${apt.service}"
                 title="${apt.patientName} (${apt.timeLabel})${apt.notes ? ` • ${apt.notes}` : ''} [Click to manage]">
              <div class="apt-card-header-row">
                <span class="apt-status-badge ${apt.status}">${statusUpper}</span>
                <span class="apt-time-label">${apt.timeLabel || `${apt.startTime} – ${apt.endTime}`}</span>
              </div>
              <div class="apt-patient-name${isMerged1Hr ? ' merged-patient-name' : ''}">${apt.patientName}</div>
            </div>
          `;
        } else if (slotMins < docStartMins) {
          // Shift Starts Later
          const startHour12 = this.formatTime12(doc.workingHours.start);
          html += `
            <div class="shift-block-card shift-starts-later" title="Dr. ${doc.name.split(' ')[1]}'s shift begins at ${startHour12}">
              <div class="shift-badge-inner">
                <span class="shift-icon">🔒</span>
                <span class="shift-text">Starts ${startHour12}</span>
              </div>
            </div>
          `;
        } else if (slotMins >= docEndMins) {
          // Shift Ended
          const endHour12 = this.formatTime12(doc.workingHours.end);
          html += `
            <div class="shift-block-card shift-ended" title="Dr. ${doc.name.split(' ')[1]}'s shift ended at ${endHour12}">
              <div class="shift-badge-inner">
                <span class="shift-icon">🌙</span>
                <span class="shift-text">Shift Ended</span>
              </div>
            </div>
          `;
        } else {
          // Clean 1-Click Booking Slot Card
          html += `
            <div class="infographic-available-card" 
                 data-doctor-id="${doc.id}" 
                 data-service-id="${doc.supportedServices[0] || 'AMSK'}"
                 data-time-start="${slot.start}"
                 data-time-end="${slot.end}"
                 title="Click to book ${doc.name} at ${slot.label}">
              <span class="avail-label">🟢 Available</span>
              <span class="avail-action-chip">+ Book</span>
            </div>
          `;
        }

        html += `</td>`;
      });

      html += `</tr>`;
    });

    html += `
        </tbody>
      </table>
    `;

    this.container.innerHTML = html;
    this.attachEvents();
  }

  attachEvents() {
    // Available card click -> Quick Booking Drawer
    const availableCards = this.container.querySelectorAll('.infographic-available-card');
    availableCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const docId = card.getAttribute('data-doctor-id');
        const svcId = card.getAttribute('data-service-id');
        const timeStart = card.getAttribute('data-time-start');
        const timeEnd = card.getAttribute('data-time-end');
        if (window.MPCApp) {
          window.MPCApp.openQuickBookingDrawer(docId, svcId, timeStart, timeEnd);
        }
      });
    });

    // Appointment card & in-session span click -> Action Modal
    const aptCards = this.container.querySelectorAll('.infographic-apt-card, .in-session-span-box');
    aptCards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (card.classList.contains('dragging')) return;
        const aptId = card.getAttribute('data-appointment-id');
        if (window.MPCApp && aptId) {
          window.MPCApp.openAppointmentActionModal(aptId);
        }
      });
    });

    if (window.MPCDragDrop) {
      window.MPCDragDrop.init();
    }
  }

  setFilter(serviceId) {
    this.activeFilter = serviceId;
    this.render();
  }
}
