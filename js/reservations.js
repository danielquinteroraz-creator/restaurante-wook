(() => {
  const form = document.querySelector('#booking-form');
  const find = id => document.getElementById(id);
  const calendar = find('calendar');
  const times = find('times');
  const guests = find('guests');
  const error = find('booking-error');
  const confirmation = find('confirmation');
  const submit = form.querySelector('[type="submit"]');
  const copy = window.WookLanguage;
  const timeZone = 'Europe/Madrid';
  const madrid = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
  });
  const now = Object.fromEntries(madrid.formatToParts(new Date()).map(part => [part.type, Number(part.value)]));
  // UTC arithmetic represents Madrid calendar dates without daylight-saving gaps.
  const today = new Date(Date.UTC(now.year, now.month - 1, now.day));
  const add = (day, count) => new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + count));
  const limit = add(today, 60);
  const firstOf = (day, offset = 0) => new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + offset, 1));
  const iso = day => day.toISOString().slice(0, 10);
  const format = (day, options) => new Intl.DateTimeFormat(copy.intl, { timeZone: 'UTC', ...options }).format(day);
  const longDate = day => format(day, { dateStyle: 'full' });
  const label = {
    outside: ['Fuera del plazo de reserva', 'Outside the booking window'],
    closed: ['Cerrado', 'Closed'],
    full: ['Completo', 'Fully booked']
  };
  const messages = {
    date: ['Elige una fecha disponible.', 'Choose an available date.'],
    time: ['Elige una hora de llegada.', 'Choose an arrival time.'],
    group: ['Contacte para grupos de más de 10 personas.', 'Please contact us for parties of more than 10.'],
    name: ['Introduce tu nombre completo.', 'Enter your full name.'],
    email: ['Introduce un correo electrónico válido.', 'Enter a valid email address.'],
    phone: ['Introduce un teléfono válido de 7 a 15 dígitos.', 'Enter a valid phone number with 7 to 15 digits.']
  };
  const say = pair => copy.text(...pair);
  let month = firstOf(today);
  let cursor = today;
  let selected = null;
  let arrival = null;
  let issue = null;
  let code = null;

  function slots(day) {
    if (!day || day.getUTCDay() === 1) return [];
    const weekday = day.getUTCDay();
    const service = weekday === 0 ? [[780, 1020]] : [[780, 960], [1170, weekday >= 5 ? 1470 : 1410]];
    return service.flatMap(([start, end]) => {
      const starts = [];
      for (let min = start; min < end; min += 30) {
        if (+day === +today && min <= now.hour * 60 + now.minute) continue;
        const hour = String(Math.floor(min / 60) % 24).padStart(2, '0');
        starts.push(hour + ':' + String(min % 60).padStart(2, '0'));
      }
      return starts;
    });
  }

  function status(day) {
    if (day < today || day > limit) return 'outside';
    if (day.getUTCDay() === 1) return 'closed';
    if ((day.getUTCDate() + 3 * (day.getUTCMonth() + 1)) % 8 === 0 || !slots(day).length) return 'full';
    return '';
  }

  function renderCalendar() {
    const monthLabel = format(month, { month: 'long', year: 'numeric' });
    find('month').textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
    find('prev').disabled = +month <= +firstOf(today);
    find('next').disabled = +month >= +firstOf(limit);
    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'calendar-row';
    weekdayRow.setAttribute('role', 'row');
    for (let offset = 0; offset < 7; offset++) {
      const weekday = add(new Date(Date.UTC(2024, 0, 1)), offset);
      const heading = document.createElement('span');
      heading.className = 'weekday';
      heading.setAttribute('role', 'columnheader');
      heading.setAttribute('aria-label', format(weekday, { weekday: 'long' }));
      heading.textContent = format(weekday, { weekday: 'short' });
      weekdayRow.append(heading);
    }
    calendar.replaceChildren(weekdayRow);
    const padding = (month.getUTCDay() + 6) % 7;
    const size = add(firstOf(month, 1), -1).getUTCDate();
    for (let index = 0; index < padding + size; index += 7) {
      const row = document.createElement('div');
      row.className = 'calendar-row';
      row.setAttribute('role', 'row');
      for (let column = 0; column < 7; column++) {
        const number = index + column - padding + 1;
        const cell = document.createElement('div');
        cell.setAttribute('role', 'gridcell');
        row.append(cell);
        if (number < 1 || number > size) continue;
        const day = add(month, number - 1);
        const state = status(day);
        const active = selected && +day === +selected;
        cell.setAttribute('aria-selected', String(Boolean(active)));
        const button = document.createElement('button');
        button.type = 'button';
        button.className = ['day', state, active ? 'selected' : ''].join(' ');
        button.dataset.date = iso(day);
        button.tabIndex = +day === +cursor ? 0 : -1;
        button.textContent = number;
        button.setAttribute('aria-label', longDate(day) + (state ? ' · ' + say(label[state]) : ''));
        if (+day === +today) button.setAttribute('aria-current', 'date');
        if (state) button.setAttribute('aria-disabled', 'true');
        cell.append(button);
      }
      calendar.append(row);
    }
  }

  function renderTimes() {
    times.replaceChildren();
    if (!selected) {
      const hint = document.createElement('p');
      hint.textContent = copy.text('Selecciona un día para ver las horas.', 'Select a date to see arrival times.');
      times.append(hint);
      return;
    }
    slots(selected).forEach(slot => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time';
      button.dataset.time = slot;
      button.textContent = slot;
      button.setAttribute('aria-pressed', String(slot === arrival));
      times.append(button);
    });
  }

  function renderSummary() {
    const group = guests.value === 'group';
    const groupText = copy.text('Más de 10', 'More than 10');
    find('group-note').hidden = !group;
    submit.disabled = group;
    find('summary-date').textContent = selected ? longDate(selected) : '—';
    find('summary-time').textContent = arrival || '—';
    find('summary-guests').textContent = group ? groupText : guests.value;
    error.hidden = !issue;
    error.textContent = issue ? say(messages[issue]) : '';
    confirmation.hidden = !code;
    if (code) {
      const heading = document.createElement('h3');
      heading.textContent = copy.text('Reserva demo confirmada', 'Demo booking confirmed');
      const message = document.createElement('p');
      message.textContent = copy.text('Código ficticio de confirmación', 'Fictional confirmation code');
      const token = document.createElement('strong');
      token.textContent = code;
      confirmation.replaceChildren(heading, message, token);
    }
  }

  function focusCursor() {
    calendar.querySelector('[data-date="' + iso(cursor) + '"]')?.focus();
  }

  function moveMonth(offset) {
    const target = firstOf(month, offset);
    if (target < firstOf(today) || target > firstOf(limit)) return;
    month = target;
    cursor = target < today ? today : target;
    renderCalendar();
    if (find(offset < 0 ? 'prev' : 'next').disabled) focusCursor();
  }

  find('prev').addEventListener('click', () => moveMonth(-1));
  find('next').addEventListener('click', () => moveMonth(1));
  calendar.addEventListener('keydown', event => {
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const button = event.target.closest('[data-date]');
    if (!button || !(event.key in offsets)) return;
    event.preventDefault();
    const day = new Date(button.dataset.date + 'T00:00:00Z');
    const target = add(day, offsets[event.key]);
    if (target < firstOf(today) || target >= firstOf(limit, 1)) return;
    cursor = target;
    month = firstOf(cursor);
    renderCalendar();
    focusCursor();
  });
  calendar.addEventListener('click', event => {
    const button = event.target.closest('[data-date]');
    if (!button || button.getAttribute('aria-disabled') === 'true') return;
    cursor = new Date(button.dataset.date + 'T00:00:00Z');
    if (+cursor !== +selected) arrival = null;
    selected = cursor;
    if (issue === 'date') issue = null;
    code = null;
    renderCalendar();
    renderTimes();
    renderSummary();
    focusCursor();
  });
  times.addEventListener('click', event => {
    const button = event.target.closest('[data-time]');
    if (!button) return;
    arrival = button.dataset.time;
    if (issue === 'time') issue = null;
    code = null;
    times.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    renderSummary();
  });
  form.addEventListener('input', event => {
    if (issue === event.target.id) issue = null;
    event.target.removeAttribute('aria-invalid');
    event.target.removeAttribute('aria-describedby');
    code = null;
    renderSummary();
  });

  function validate() {
    if (!selected || status(selected)) return 'date';
    if (!slots(selected).includes(arrival)) return 'time';
    if (guests.value === 'group') return 'group';
    if (find('name').value.trim().length < 2) return 'name';
    if (!find('email').validity.valid) return 'email';
    const phone = find('phone').value.trim();
    const digits = phone.replace(/\D/g, '');
    if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) return 'phone';
    return null;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    issue = validate();
    if (issue) {
      code = null;
      renderSummary();
      if (issue === 'date') focusCursor();
      else if (issue === 'time') times.querySelector('button')?.focus();
      else {
        const field = find(issue === 'group' ? 'guests' : issue);
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', 'booking-error');
        field.focus();
      }
      return;
    }
    code ||= 'WOOK-' + Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
    renderSummary();
    confirmation.focus();
  });

  function render() {
    renderCalendar();
    renderTimes();
    renderSummary();
  }
  document.addEventListener('wook:language', render);
  render();
})();
