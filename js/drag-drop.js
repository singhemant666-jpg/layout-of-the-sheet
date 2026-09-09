// MPC Global - Drag & Drop Appointment Shifting Engine
// Hold ALT (Win/Linux) or ⌥ Option (Mac) to drag and shift appointments.

class DragDropEngine {
  constructor() {
    this.draggedAptId = null;
    this.draggedAppointment = null;
    this.sourceCell = null;
    this._bound = false;
    this.isAltPressed = false;
    this._dropSuccess = false; // tracks if drop landed correctly (Mac workaround)
  }

  init() {
    if (this._bound) return;
    this._bound = true;

    const container = document.getElementById('sheet-grid-container');
    if (!container) return;

    // ── ALT / OPTION KEY TRACKING ────────────────────────────────────
    // Mac: Option key fires as 'Alt'. Track it with a dedicated flag.
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Alt') {
        this.isAltPressed = true;
        document.body.classList.add('alt-drag-mode');
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Alt') {
        this.isAltPressed = false;
        document.body.classList.remove('alt-drag-mode');
      }
    });

    // Clear when tab loses focus (handles Mac Option-Tab edge case)
    window.addEventListener('blur', () => {
      this.isAltPressed = false;
      document.body.classList.remove('alt-drag-mode');
    });

    // ── DRAG START ───────────────────────────────────────────────────
    container.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.infographic-apt-card');
      if (!card) return;

      // Mac: e.altKey is unreliable at dragstart — use our tracked flag
      const altHeld = this.isAltPressed || e.altKey;

      if (!altHeld) {
        e.preventDefault();
        return false;
      }

      this._dropSuccess = false;

      this.draggedAptId = card.getAttribute('data-appointment-id');
      this.draggedAppointment = CLINIC_DATA.appointments.find(a => a.id === this.draggedAptId);
      this.sourceCell = card.closest('.slot-matrix-cell');

      card.classList.add('dragging');

      // CRITICAL for Mac: must call setData() for drop to fire
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', this.draggedAptId);
      } catch (err) {
        // Safari fallback
        e.dataTransfer.setData('Text', this.draggedAptId);
      }
    });

    // ── DRAG END ────────────────────────────────────────────────────
    container.addEventListener('dragend', (e) => {
      const card = e.target.closest('.infographic-apt-card');
      if (card) card.classList.remove('dragging');
      this.clearDropHighlights(container);
      // If drop did NOT succeed (e.g. dropped outside), do nothing — data already unchanged
      this.draggedAptId = null;
      this.draggedAppointment = null;
      this.sourceCell = null;
    });

    // ── DRAG OVER ───────────────────────────────────────────────────
    container.addEventListener('dragover', (e) => {
      const zone = e.target.closest('.slot-matrix-cell');
      if (!zone || !this.draggedAppointment) return;
      if (zone === this.sourceCell) return;

      // MUST call preventDefault() to allow drop
      e.preventDefault();
      // MUST set dropEffect so Mac doesn't snap back
      e.dataTransfer.dropEffect = 'move';

      const targetDocId = zone.getAttribute('data-doctor-id');
      const targetTimeStart = zone.getAttribute('data-time-start');
      const validation = this.validateShift(this.draggedAppointment, targetDocId, targetTimeStart);

      const shouldBeValid = validation.valid;
      if (shouldBeValid && !zone.classList.contains('drag-over-valid')) {
        this.clearDropHighlights(container);
        zone.classList.add('drag-over-valid');
      } else if (!shouldBeValid && !zone.classList.contains('drag-over-invalid')) {
        this.clearDropHighlights(container);
        zone.classList.add('drag-over-invalid');
      }
    });

    // ── DRAG ENTER ──────────────────────────────────────────────────
    // Needed on some Mac browsers to enable drop on the target
    container.addEventListener('dragenter', (e) => {
      const zone = e.target.closest('.slot-matrix-cell');
      if (!zone || !this.draggedAppointment) return;
      e.preventDefault();
    });

    // ── DRAG LEAVE ──────────────────────────────────────────────────
    container.addEventListener('dragleave', (e) => {
      const zone = e.target.closest('.slot-matrix-cell');
      if (!zone) return;
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove('drag-over-valid', 'drag-over-invalid');
      }
    });

    // ── DROP ────────────────────────────────────────────────────────
    container.addEventListener('drop', (e) => {
      const zone = e.target.closest('.slot-matrix-cell');
      if (!zone) return;

      // CRITICAL: prevent browser default (Mac snaps back without this)
      e.preventDefault();
      e.stopPropagation();

      zone.classList.remove('drag-over-valid', 'drag-over-invalid');

      if (!this.draggedAptId) return;
      if (zone === this.sourceCell) return;

      const apt = CLINIC_DATA.appointments.find(a => a.id === this.draggedAptId);
      if (!apt) return;

      const targetDocId = zone.getAttribute('data-doctor-id');
      const targetTimeStart = zone.getAttribute('data-time-start');
      const validation = this.validateShift(apt, targetDocId, targetTimeStart);

      if (validation.valid) {
        this._dropSuccess = true;

        const newDoc = CLINIC_DATA.doctors.find(d => d.id === targetDocId);
        const newDocName = newDoc?.name || 'Doctor';
        const oldDocName = CLINIC_DATA.doctors.find(d => d.id === apt.doctor)?.name || 'Doctor';

        // Calculate duration and new times
        const [origSH, origSM] = apt.startTime.split(':').map(Number);
        const [origEH, origEM] = apt.endTime.split(':').map(Number);
        const durationMins = (origEH * 60 + origEM) - (origSH * 60 + origSM);

        const [newSH, newSM] = targetTimeStart.split(':').map(Number);
        const newEndTotalMins = newSH * 60 + newSM + durationMins;
        const newEH = Math.floor(newEndTotalMins / 60);
        const newEM = newEndTotalMins % 60;

        apt.doctor = targetDocId;
        apt.startTime = targetTimeStart;
        apt.endTime = `${String(newEH).padStart(2, '0')}:${String(newEM).padStart(2, '0')}`;

        const fmt = (h, m) => {
          const hr = h % 12 || 12;
          const ap = h >= 12 ? 'PM' : 'AM';
          return `${hr}:${String(m).padStart(2, '0')} ${ap}`;
        };
        apt.timeLabel = `${fmt(newSH, newSM)} – ${fmt(newEH, newEM)}`;

        if (newDoc?.primaryService) apt.service = newDoc.primaryService;
        else if (newDoc?.supportedServices?.length > 0) apt.service = newDoc.supportedServices[0];

        if (window.MPCApp?.gridRenderer) {
          window.MPCApp.gridRenderer.render();
        }

        const oldLast = oldDocName.split(' ').pop();
        const newLast = newDocName.split(' ').pop();
        window.MPCApp?.showToast(
          `✓ ${apt.patientName} → Dr. ${newLast} at ${apt.timeLabel}`,
          'success'
        );
      } else {
        window.MPCApp?.showToast(`✕ Cannot shift: ${validation.reason}`, 'error');
      }
    });
  }

  // ── VALIDATION ────────────────────────────────────────────────────
  validateShift(appointment, targetDocId, targetTimeStart) {
    if (appointment.doctor === targetDocId && appointment.startTime === targetTimeStart) {
      return { valid: false, reason: 'Same doctor and time slot' };
    }

    const targetDoc = CLINIC_DATA.doctors.find(d => d.id === targetDocId);
    if (!targetDoc) return { valid: false, reason: 'Target doctor not found' };

    const [slotH, slotM] = targetTimeStart.split(':').map(Number);
    const [docSH, docSM] = targetDoc.workingHours.start.split(':').map(Number);
    const [docEH, docEM] = targetDoc.workingHours.end.split(':').map(Number);
    const slotMins     = slotH  * 60 + slotM;
    const docStartMins = docSH  * 60 + docSM;
    const docEndMins   = docEH  * 60 + docEM;

    if (slotMins < docStartMins) {
      return { valid: false, reason: `Dr. ${targetDoc.name.split(' ').pop()}'s shift hasn't started yet` };
    }
    if (slotMins >= docEndMins) {
      return { valid: false, reason: `Dr. ${targetDoc.name.split(' ').pop()}'s shift has ended` };
    }

    const [oSH, oSM] = appointment.startTime.split(':').map(Number);
    const [oEH, oEM] = appointment.endTime.split(':').map(Number);
    const durMins = (oEH * 60 + oEM) - (oSH * 60 + oSM);
    const newEndMins = slotMins + durMins;

    if (targetDoc.lunchTime) {
      const [lSH, lSM] = targetDoc.lunchTime.start.split(':').map(Number);
      const [lEH, lEM] = targetDoc.lunchTime.end.split(':').map(Number);
      if (slotMins < (lEH * 60 + lEM) && newEndMins > (lSH * 60 + lSM)) {
        return { valid: false, reason: 'Conflicts with lunch break (1:30–2:00 PM)' };
      }
    }

    const conflicts = CLINIC_DATA.appointments.filter(a =>
      a.doctor === targetDocId &&
      a.id !== appointment.id &&
      a.status !== 'cancelled'
    );

    for (const other of conflicts) {
      const [sSH, sSM] = other.startTime.split(':').map(Number);
      const [sEH, sEM] = other.endTime.split(':').map(Number);
      const oStart = sSH * 60 + sSM;
      const oEnd   = sEH * 60 + sEM;
      if (slotMins < oEnd && newEndMins > oStart) {
        return {
          valid: false,
          reason: `Overlaps with ${other.patientName} (${other.startTime}–${other.endTime})`
        };
      }
    }

    return { valid: true };
  }

  clearDropHighlights(container) {
    (container || document).querySelectorAll('.slot-matrix-cell').forEach(cell => {
      cell.classList.remove('drag-over-valid', 'drag-over-invalid');
    });
  }
}

window.MPCDragDrop = new DragDropEngine();
