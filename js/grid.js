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
    } else if (this.activeFilter === "CAT_MSK" || this.activeFilter === "CAT_AMSK" || this.activeFilter === "AMSK") {
      targetService = data.services.find(s => s.id === "AMSK") || { name: "Advanced MSK", shortName: "Advanced MSK", durationLabel: "1 Hour Slots" };
      const amskDocIds = ['doc-vidisha', 'doc-diwakar', 'doc-krishna', 'doc-hardi', 'doc-spoorthi'];
      filteredDoctors = data.doctors.filter(d => amskDocIds.includes(d.id));
      activeSlots = data.amskTimeSlots;
    } else if (this.activeFilter === "CAT_MODALITIES") {
      targetService = {
        id: "CAT_MODALITIES",
        name: "Modalities & Machines",
        shortName: "Modalities & Machines",
        durationLabel: "30 Min Slots"
      };
      const modDocIds = ['doc-saurambika', 'doc-sakshi-b', 'doc-anjali-k', 'doc-shifa', 'doc-daniya', 'doc-ankita', 'doc-sakshi-s', 'doc-spine-d'];
      filteredDoctors = data.doctors.filter(d => modDocIds.includes(d.id));
      activeSlots = data.halfHourTimeSlots;
    } else if (this.activeFilter === "CAT_WELLNESS") {
      targetService = {
        id: "CAT_WELLNESS",
        name: "Wellness & Recovery",
        shortName: "Wellness & Recovery",
        durationLabel: "Dedicated Machine Slots"
      };
      const wellnessDocIds = ['doc-hbot-hard', 'doc-hbot-soft', 'doc-red-light', 'doc-foot-insoles', 'doc-pelvic-chair'];
      filteredDoctors = data.doctors.filter(d => wellnessDocIds.includes(d.id));
      activeSlots = data.halfHourTimeSlots;
    } else if (this.activeFilter === "THOR") {
      targetService = data.services.find(s => s.id === "THOR") || data.services[2];
      const thorDocIds = ['doc-shifa', 'doc-ankita', 'doc-sakshi-b', 'doc-daniya', 'doc-sakshi-s'];
      filteredDoctors = data.doctors.filter(d => thorDocIds.includes(d.id));
      activeSlots = data.halfHourTimeSlots;
    } else if (this.activeFilter === "DTT") {
      targetService = data.services.find(s => s.id === "DTT") || data.services[1];
      const dttDocIds = ['doc-saurambika', 'doc-sakshi-b', 'doc-daniya', 'doc-anjali-k'];
      filteredDoctors = data.doctors.filter(d => dttDocIds.includes(d.id));
      activeSlots = data.halfHourTimeSlots;
    } else if (this.activeFilter === "HBOT_HARD") {
      targetService = data.services.find(s => s.id === "HBOT_HARD");
      filteredDoctors = data.doctors.filter(d => d.id === 'doc-hbot-hard');
      activeSlots = data.amskTimeSlots;
    } else if (this.activeFilter === "HBOT_SOFT") {
      targetService = data.services.find(s => s.id === "HBOT_SOFT");
      filteredDoctors = data.doctors.filter(d => d.id === 'doc-hbot-soft');
      activeSlots = data.amskTimeSlots;
    } else if (this.activeFilter === "RED_LIGHT") {
      targetService = data.services.find(s => s.id === "RED_LIGHT");
      filteredDoctors = data.doctors.filter(d => d.id === 'doc-red-light');
      activeSlots = data.halfHourTimeSlots;
    } else if (this.activeFilter === "RED_FOOT_INSOLES") {
      targetService = data.services.find(s => s.id === "RED_FOOT_INSOLES");
      filteredDoctors = data.doctors.filter(d => d.id === 'doc-foot-insoles');
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

    // ------- Pre-compute shift-block rowspan skip maps -------
    // For each doctor, find consecutive "before shift" slot indices and consecutive "after shift" slot indices.
    // Store: skipMap[docId][slotIndex] = true  → means "skip this <td>, covered by a rowspan above"
    //        spanMap[docId][slotIndex] = N      → means "emit this <td> with rowspan=N"

    const shiftSkipMap   = {}; // slot indices to skip per doctor
    const shiftSpanMap   = {}; // slot indices where we emit a rowspan cell per doctor

    filteredDoctors.forEach(doc => {
      shiftSkipMap[doc.id]  = {};
      shiftSpanMap[doc.id]  = {};

      const [dsh, dsm] = doc.workingHours.start.split(':').map(Number);
      const [deh, dem] = doc.workingHours.end.split(':').map(Number);
      const docStartMins = dsh * 60 + dsm;
      const docEndMins   = deh * 60 + dem;

      // --- Before-shift block ---
      // Collect consecutive indices where slotMins < docStartMins
      let runStart = -1;
      let runLen   = 0;
      activeSlots.forEach((s, idx) => {
        const [sh, sm] = s.start.split(':').map(Number);
        const slotMins = sh * 60 + sm;
        if (slotMins < docStartMins) {
          if (runStart === -1) runStart = idx;
          runLen++;
        } else {
          if (runStart !== -1 && runLen > 1) {
            shiftSpanMap[doc.id][runStart] = runLen;
            for (let i = runStart + 1; i < runStart + runLen; i++) {
              shiftSkipMap[doc.id][i] = true;
            }
          }
          runStart = -1; runLen = 0;
        }
      });
      // flush
      if (runStart !== -1 && runLen > 1) {
        shiftSpanMap[doc.id][runStart] = runLen;
        for (let i = runStart + 1; i < runStart + runLen; i++) {
          shiftSkipMap[doc.id][i] = true;
        }
      }

      // --- After-shift block ---
      runStart = -1; runLen = 0;
      activeSlots.forEach((s, idx) => {
        const [sh, sm] = s.start.split(':').map(Number);
        const slotMins = sh * 60 + sm;
        if (slotMins >= docEndMins) {
          if (runStart === -1) runStart = idx;
          runLen++;
        } else {
          runStart = -1; runLen = 0;
        }
      });
      // flush (only the last run matters for shift-ended)
      if (runStart !== -1 && runLen > 1) {
        shiftSpanMap[doc.id][runStart] = runLen;
        for (let i = runStart + 1; i < runStart + runLen; i++) {
          shiftSkipMap[doc.id][i] = true;
        }
      }
    });
    // ----------------------------------------------------------

    // Time Slot Rows
    activeSlots.forEach((slot, slotIdx) => {
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

        // --- Shift-block skip: covered by a rowspan above ---
        if (shiftSkipMap[doc.id][slotIdx]) {
          return; // no <td> emitted
        }

        // Check if doctor has an appointment starting at this slot
        const apt = data.appointments.find(a => 
          a.doctor === doc.id && 
          a.status !== 'cancelled' && 
          a.startTime === slot.start
        );

        // Check if this slot is occupied by a 1-hour appointment from the previous half-hour
        if (!apt) {
          const priorApt = data.appointments.find(a => {
            if (a.doctor !== doc.id || a.status === 'cancelled') return false;
            const [ash, asm] = a.startTime.split(':').map(Number);
            const [aeh, aem] = a.endTime.split(':').map(Number);
            const aStartM = ash * 60 + asm;
            const aEndM = aeh * 60 + aem;
            return slotMins > aStartM && slotMins < aEndM;
          });

          if (priorApt) {
            // Already spanned by the prior appointment's rowspan="2". Do not output <td>.
            return;
          }
        }

        // Determine if this doctor / service is a 1-hour session service
        const primarySvcId = doc.primaryService;
        const svcDef = data.services.find(s => s.id === primarySvcId);
        const is1HrDocService = svcDef ? svcDef.durationMinutes >= 60 : (primarySvcId === 'HBOT_HARD' || primarySvcId === 'HBOT_SOFT' || primarySvcId === 'AMSK');

        // For 1-hour services without appointment: check if covered by previous 1-hour available slot or should span 2 rows
        let is1HrAvailMerged = false;
        let availEnd = slot.end;

        if (!apt && is1HrDocService && activeSlots.length > 12) {
          const [sh, sm] = slot.start.split(':').map(Number);
          
          // If starting at an odd half-hour (e.g. 09:30, 10:30, 11:30, 14:30), check if previous :00 had no appointment
          if (sm === 30 && slotMins >= docStartMins && slotMins < docEndMins) {
            const prevStartMins = slotMins - 30;
            const prevH = Math.floor(prevStartMins / 60);
            const prevM = prevStartMins % 60;
            const prevStartStr = `${prevH.toString().padStart(2, '0')}:${prevM.toString().padStart(2, '0')}`;
            
            const prevApt = data.appointments.find(a => a.doctor === doc.id && a.status !== 'cancelled' && a.startTime === prevStartStr);
            if (!prevApt) {
              // Covered by the 1-hour available slot emitted at :00 above! Skip this <td>.
              return;
            }
          }

          // If starting at an even hour (e.g. 09:00, 10:00, 11:00, 14:00), merge next 30m slot if available
          if (sm === 0 && slotMins >= docStartMins && (slotMins + 60) <= docEndMins) {
            const nextStartMins = slotMins + 30;
            const nextH = Math.floor(nextStartMins / 60);
            const nextM = nextStartMins % 60;
            const nextStartStr = `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;
            
            const nextApt = data.appointments.find(a => a.doctor === doc.id && a.status !== 'cancelled' && a.startTime === nextStartStr);
            if (!nextApt) {
              is1HrAvailMerged = true;
              const endH = Math.floor((slotMins + 60) / 60);
              const endM = (slotMins + 60) % 60;
              availEnd = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
            }
          }
        }

        // Calculate rowspan for appointments lasting longer than 30 minutes in half-hour view
        let rowSpanAttr = "";
        let isMerged1Hr = false;
        if (apt) {
          const [ash, asm] = apt.startTime.split(':').map(Number);
          const [aeh, aem] = apt.endTime.split(':').map(Number);
          const durationMins = (aeh * 60 + aem) - (ash * 60 + asm);
          if (durationMins >= 60) {
            const spans = Math.min(4, Math.round(durationMins / 30));
            rowSpanAttr = ` rowspan="${spans}"`;
            isMerged1Hr = true;
          }
        } else if (is1HrAvailMerged) {
          rowSpanAttr = ` rowspan="2"`;
          isMerged1Hr = true;
        }

        // Shift-block rowspan for before/after shift merged cells
        let shiftRowSpanAttr = "";
        if (shiftSpanMap[doc.id][slotIdx]) {
          shiftRowSpanAttr = ` rowspan="${shiftSpanMap[doc.id][slotIdx]}"`;
        }

        const effectiveServiceId = apt ? apt.service : (doc.supportedServices[0] || "AMSK");

        html += `
          <td class="sheet-cell slot-matrix-cell${isMerged1Hr ? ' merged-1hr-cell' : ''}"${rowSpanAttr}${!apt && !is1HrAvailMerged ? shiftRowSpanAttr : ""}
              data-doctor-id="${doc.id}" 
              data-service-id="${effectiveServiceId}"
              data-time-start="${slot.start}"
              data-time-end="${is1HrAvailMerged ? availEnd : slot.end}">
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
          // Shift Starts Later – merged block
          const startHour12 = this.formatTime12(doc.workingHours.start);
          const isFirstOfRun = !!shiftSpanMap[doc.id][slotIdx];
          html += `
            <div class="shift-block-card shift-starts-later${isFirstOfRun ? ' shift-merged-top' : ''}" title="Dr. ${doc.name.split(' ')[1]}'s shift begins at ${startHour12}">
              <div class="shift-badge-inner">
                <span class="shift-icon">🔒</span>
                <span class="shift-text">Starts ${startHour12}</span>
              </div>
            </div>
          `;
        } else if (slotMins >= docEndMins) {
          // Shift Ended – merged block
          const endHour12 = this.formatTime12(doc.workingHours.end);
          const isFirstOfRun = !!shiftSpanMap[doc.id][slotIdx];
          html += `
            <div class="shift-block-card shift-ended${isFirstOfRun ? ' shift-merged-top' : ''}" title="Dr. ${doc.name.split(' ')[1]}'s shift ended at ${endHour12}">
              <div class="shift-badge-inner">
                <span class="shift-icon">🌙</span>
                <span class="shift-text">Shift Ended</span>
              </div>
            </div>
          `;
        } else {
          // Clean 1-Click Booking Slot Card
          const start12 = this.formatTime12(slot.start);
          const end12 = this.formatTime12(is1HrAvailMerged ? availEnd : slot.end);
          const slotDurationLabel = is1HrAvailMerged ? `${start12} – ${end12}` : slot.label;
          
          html += `
            <div class="infographic-available-card${is1HrAvailMerged ? ' avail-1hr-card' : ''}" 
                 data-doctor-id="${doc.id}" 
                 data-service-id="${doc.supportedServices[0] || 'AMSK'}"
                 data-time-start="${slot.start}"
                 data-time-end="${is1HrAvailMerged ? availEnd : slot.end}"
                 title="Click to book ${doc.name} at ${slotDurationLabel}">
              <span class="avail-label">🟢 Available${is1HrAvailMerged ? ' (1 Hour)' : ''}</span>
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
