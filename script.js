const tg = window.Telegram.WebApp;

// --- State & Data (Replace with actual data fetching/storage) ---
let currentSelectedDate = new Date(); // Defaults to today
let currentView = 'today'; // 'today', 'calendar', 'log', 'articles', 'partner', 'settings', etc.
let historyStack = ['screen-today']; // For back button functionality
let cycleData = { // Example structure - Fetch or calculate this
    '2025-03-27': { cycleDay: 11, isPeriod: false, isFertile: true, isOvulation: false, possibleSymptoms: ['🔋','🎯','➕'], discharge: 'Слизистые', chance: 'medium' },
    '2025-03-28': { cycleDay: 12, isPeriod: false, isFertile: true, isOvulation: false, possibleSymptoms: ['😊','💧','🤔'], discharge: 'Слизистые', chance: 'medium' },
    '2025-04-02': { cycleDay: 17, isPeriod: false, isFertile: false, isOvulation: true, possibleSymptoms: ['😊','💖','😓'], discharge: 'Слизистые', chance: 'high' },
    // ... add more dates including period days
};
let userLogs = { // Example structure
    '2025-03-27': { symptoms: ['Радостная'], discharge: ['Кремообразные', 'Липкие', 'Слизистые'], sex: ['Секс без защиты', 'Оральный секс'], steps: 630, distance: 0.5 },
    // ... other dates
};
let cycleHistory = [ // Example for charts
    { startDate: '2024-07-12', endDate: '2024-09-14', length: 65, periodLength: 6 },
    { startDate: '2024-09-15', endDate: '2024-10-14', length: 30, periodLength: 6 },
    { startDate: '2024-10-15', endDate: '2024-11-08', length: 25, periodLength: 6 },
    { startDate: '2024-11-09', endDate: '2024-12-20', length: 42, periodLength: 6 },
    { startDate: '2024-12-21', endDate: '2025-01-13', length: 24, periodLength: 6 },
    { startDate: '2025-01-14', endDate: '2025-02-12', length: 30, periodLength: 6 },
    { startDate: '2025-02-13', endDate: '2025-03-16', length: 32, periodLength: 6 },
    { startDate: '2025-03-17', endDate: null, length: 11, periodLength: null }, // Current cycle
];


// --- Utils ---
function formatDateKey(date) { return date.toISOString().split('T')[0]; }
function formatDisplayDate(date, format = { month: 'long', day: 'numeric' }) { return date.toLocaleDateString('ru-RU', format); }
function getDayLetter(date) { return date.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase()[0]; }
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); } // 0=Sun, 1=Mon

function applyThemeStyles() {
    const themeParams = tg.themeParams;
    const root = document.documentElement;
    // Apply Telegram theme variables (as before)
    root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color || '#f0f0f5');
    root.style.setProperty('--tg-theme-text-color', themeParams.text_color || '#000000');
    root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color || '#8e8e93');
    root.style.setProperty('--tg-theme-link-color', themeParams.link_color || '#ff3b30'); // Use Flo's pink/red
    root.style.setProperty('--tg-theme-button-color', themeParams.button_color || '#ff3b30');
    root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color || '#ffffff');
    root.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color || '#ffffff');
    updateActiveGoalButtonStyles(); // Re-apply styles based on theme
}

function updateActiveGoalButtonStyles() {
    // Style goal buttons in settings (as before)
    const activeGoalBtn = document.querySelector('#screen-settings .goal-btn.active');
    if (activeGoalBtn) {
        const activeColor = getComputedStyle(document.documentElement).getPropertyValue('--flo-pink-primary').trim();
        const lightBgColor = getComputedStyle(document.documentElement).getPropertyValue('--flo-pink-period-bg').trim();
        activeGoalBtn.style.borderColor = activeColor;
        activeGoalBtn.style.color = activeColor;
        activeGoalBtn.style.backgroundColor = lightBgColor;
    }
    document.querySelectorAll('#screen-settings .goal-btn:not(.active)').forEach(btn => {
        btn.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--flo-grey-border').trim();
        btn.style.color = getComputedStyle(document.documentElement).getPropertyValue('--flo-grey-text-primary').trim();
        btn.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--tg-theme-secondary-bg-color').trim();
    });
}

// --- Screen Navigation ---
function showScreen(screenId, addHistory = true) {
    const targetScreen = document.getElementById(screenId);
    if (!targetScreen || targetScreen.classList.contains('active')) return; // Don't reload same screen

    const currentActiveScreen = document.querySelector('.screen.active');
    if (currentActiveScreen) currentActiveScreen.classList.remove('active');

    targetScreen.classList.add('active');
    currentView = screenId;

    if (addHistory && historyStack[historyStack.length - 1] !== screenId) {
        historyStack.push(screenId);
    }
    // Limit history stack size if needed
    // if (historyStack.length > 10) historyStack.shift();

    // Scroll to top
    const contentArea = document.querySelector('.content');
    if (contentArea) contentArea.scrollTop = 0;

    // Specific screen initializations
    if (screenId === 'screen-today') { updateTodayScreen(currentSelectedDate); }
    if (screenId === 'screen-calendar-view') { renderCalendarMonth(currentSelectedDate.getFullYear(), currentSelectedDate.getMonth()); }
    if (screenId === 'screen-log-symptoms') { loadLogScreenData(currentSelectedDate); }
    if (screenId === 'screen-chart-cycle-length-detail') { renderCycleLengthChart(); }
    if (screenId === 'screen-charts-reports') { /* Maybe load report summaries */ }
    if (screenId === 'screen-doctor-report-view') { /* Load/render report */ }


    updateBottomNav(screenId);
    feather.replace(); // Re-apply icons for the new screen
    console.log("Navigated to:", screenId, "History:", historyStack);
}

function goBack() {
    if (historyStack.length <= 1) {
        console.log("No previous screen in history.");
        // Optionally close the app if at the root?
        // tg.close();
        return;
    }
    historyStack.pop(); // Remove current screen
    const previousScreenId = historyStack[historyStack.length - 1];
    showScreen(previousScreenId, false); // Show previous without adding to history
}

function updateBottomNav(activeScreenId) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    let targetNavButton = null;

    // Map screens to bottom nav buttons
    const screenMappings = {
        'screen-today': 'screen-today',
        'screen-calendar-view': 'screen-today', // Calendar opens from Today's header initially
        'screen-articles': 'screen-articles',
        'screen-log-symptoms': 'screen-log-symptoms', // Target the central '+' button
        'screen-partner': 'screen-partner',
        'screen-settings': 'screen-settings',
        'screen-charts-reports': 'screen-settings', // Charts accessed via Settings/Menu
        'screen-chart-cycle-length-detail': 'screen-settings',
        'screen-doctor-report-view': 'screen-settings',
        // Add other mappings if needed
    };

    const mappedTarget = screenMappings[activeScreenId];
    if (mappedTarget) {
        targetNavButton = document.querySelector(`.nav-btn[data-target="${mappedTarget}"]`);
    }

    if (targetNavButton) {
        targetNavButton.classList.add('active');
    } else {
        // If no direct map, maybe default to 'Today' or 'Menu'?
        document.querySelector('.nav-btn[data-target="screen-today"]')?.classList.add('active');
    }
}

// --- Today Screen Logic ---
function updateTodayScreen(date) {
    currentSelectedDate = date;
    renderDayNavigation(date);
    updateMainVisual(date);
    updateDailyCards(date);
    // Update "My Cycles" - this is usually static, but could refresh if data changes
    feather.replace();
}

function renderDayNavigation(centerDate) {
    const container = document.querySelector('.day-nav-items');
    if (!container) return;
    container.innerHTML = ''; // Clear existing

    for (let i = -3; i <= 3; i++) {
        const date = new Date(centerDate);
        date.setDate(centerDate.getDate() + i);

        const item = document.createElement('div');
        item.className = 'day-nav-item';
        item.dataset.date = formatDateKey(date);

        const dayLetterSpan = document.createElement('span');
        dayLetterSpan.className = 'day-letter';

        const dayNumSpan = document.createElement('span');
        dayNumSpan.className = 'day-num';
        dayNumSpan.textContent = date.getDate();

        if (i === 0) {
            item.classList.add('current');
            dayLetterSpan.textContent = 'СЕГОДНЯ';
        } else {
            dayLetterSpan.textContent = getDayLetter(date);
        }

        item.appendChild(dayLetterSpan);
        item.appendChild(dayNumSpan);
        item.addEventListener('click', () => updateTodayScreen(date));
        container.appendChild(item);
    }
}

function updateMainVisual(date) {
    const dateKey = formatDateKey(date);
    const data = cycleData[dateKey] || {}; // Get data for the date
    const isToday = formatDateKey(new Date()) === dateKey;

    const primaryStatusEl = document.querySelector('.cycle-status-primary');
    const secondaryStatusEl = document.querySelector('.cycle-status-secondary');
    const logButton = document.getElementById('log-period-today');

    // --- Determine Status (Simplified Logic - Needs proper cycle calculation) ---
    let primaryText = "";
    let secondaryText = "";
    let buttonText = "Отметить месячные";
    let isPeriodLogged = userLogs[dateKey]?.isPeriod; // Check if period logged for this day

    // Example conditions (replace with actual prediction logic)
    const dayDiffToOvulation = 6; // Example: Get from calculation
    const dayDiffToPeriod = 9; // Example
    const isPredictedOvulation = data.isOvulation;
    const isPredictedPeriodStart = data.isPeriod; // Assuming cycleData has period predictions
    const isPredictedFertile = data.isFertile;
    const periodDay = data.cycleDay <= 6 ? data.cycleDay : null; // Example period length


    if (isPeriodLogged || (isPredictedPeriodStart && !isPeriodLogged)) { // If period is logged or predicted today
         primaryText = `Месячные: <span class="days-count">${periodDay || '?'} день</span>`;
         secondaryText = `Низкая вероятность забеременеть`;
         buttonText = isPeriodLogged ? "Редактировать месячные" : "Отметить месячные";
    } else if (isPredictedOvulation) {
        primaryText = `Прогноз: день <span class="days-count">Овуляции</span>`;
        secondaryText = "Высокая вероятность забеременеть";
    } else if (isPredictedFertile && dayDiffToOvulation > 0) {
        primaryText = `Овуляция через <span class="days-count">${dayDiffToOvulation} ${dayDiffToOvulation > 1 ? 'дней' : 'день'}</span>`;
        secondaryText = "Вероятность забеременеть"; // Or High/Medium based on proximity
    } else if (dayDiffToPeriod > 0) {
         primaryText = `Месячные через <span class="days-count">${dayDiffToPeriod} ${dayDiffToPeriod > 1 ? 'дней' : 'день'}</span>`;
         secondaryText = "Низкая вероятность забеременеть";
    } else {
        // Default or luteal phase
        primaryText = `${data.cycleDay || '?'} день цикла`;
        secondaryText = "Низкая вероятность забеременеть";
    }

    primaryStatusEl.innerHTML = primaryText;
    secondaryStatusEl.textContent = secondaryText;
    logButton.textContent = buttonText;

    // Update wave background color based on phase (Example)
    const waveBg = document.querySelector('.main-visual');
    if (isPeriodLogged || isPredictedPeriodStart) waveBg.style.background = 'var(--flo-pink-period-bg)';
    else if (isPredictedFertile || isPredictedOvulation) waveBg.style.background = 'var(--flo-teal-bg-wave)';
    else waveBg.style.background = 'var(--flo-grey-background)'; // Default grey for luteal

     // Update header background too
     const header = document.querySelector('.today-header');
     if (header) header.style.background = waveBg.style.background;
}

function updateDailyCards(date) {
    const dateKey = formatDateKey(date);
    const data = cycleData[dateKey] || {};
    const logs = userLogs[dateKey] || {};
    const isToday = formatDateKey(new Date()) === dateKey;
    const dateLabel = isToday ? 'Сегодня' : formatDisplayDate(date, { day: 'numeric', month: 'short' });
    document.querySelector('.daily-cards-section .dynamic-date-label').textContent = dateLabel;

    // --- Update Individual Cards (Example for discharge card) ---
    const dischargeCard = document.querySelector('.discharge-card');
    if (dischargeCard) {
        const loggedDischarge = logs.discharge ? logs.discharge.join(', ') : (data.discharge || 'Нет данных');
        const iconEl = dischargeCard.querySelector('.discharge-icon'); // Placeholder
        dischargeCard.querySelector('.card-subtitle').textContent = loggedDischarge;
        // TODO: Update icon based on discharge type
    }

    const symptomsCard = document.querySelector('.possible-symptoms-card-today');
    if (symptomsCard) {
        symptomsCard.querySelector('.card-title').innerHTML = `${formatDisplayDate(date, { day: 'numeric', month: 'short' })}:<br>возможные симптомы`;
        const iconsContainer = symptomsCard.querySelector('.symptom-icons-row');
        iconsContainer.innerHTML = ''; // Clear previous
        (data.possibleSymptoms || []).slice(0, 3).forEach(icon => {
            const iconSpan = document.createElement('span');
            iconSpan.className = 's-icon symptom-icon-placeholder';
            iconSpan.textContent = icon;
            iconsContainer.appendChild(iconSpan);
        });
    }

     const cycleDayCard = document.querySelector('.current-cycle-day-card');
     if(cycleDayCard) {
         cycleDayCard.querySelector('.card-day-number').textContent = data.cycleDay || '?';
     }

     const fertilityCard = document.querySelector('.fertility-card-today');
     if(fertilityCard) {
         // Update based on data.chance or calculation
         fertilityCard.querySelector('.card-subtitle').textContent = "Собираем данные..."; // Update this
     }
    // TODO: Update other cards (Fertility, Assistant prompts etc.) based on 'data' and 'logs'
}

// --- Calendar Screen Logic ---
function renderCalendarMonth(year, month) {
    const monthGrid = document.getElementById('month-grid');
    const monthYearDisplay = document.querySelector('.month-year-display');
    if (!monthGrid || !monthYearDisplay) return;

    monthGrid.innerHTML = ''; // Clear previous month
    monthYearDisplay.textContent = new Date(year, month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    const daysInMonth = getDaysInMonth(year, month);
    let firstDay = getFirstDayOfMonth(year, month);
    firstDay = (firstDay === 0) ? 6 : firstDay - 1; // Adjust Sunday=0 to Monday=0, then make Monday first (0-6)

    const daysInPrevMonth = getDaysInMonth(year, month - 1);

    // Calculate starting day number for previous month's placeholders
    const startDayPrev = daysInPrevMonth - firstDay + 1;

    // Add placeholders for previous month
    for (let i = 0; i < firstDay; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'day other-month';
        dayEl.innerHTML = `<span class="day-number">${startDayPrev + i}</span>`;
        monthGrid.appendChild(dayEl);
    }

    // Add days for the current month
    const todayKey = formatDateKey(new Date());
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = formatDateKey(date);
        const data = cycleData[dateKey] || {};
        const logs = userLogs[dateKey] || {};

        const dayEl = document.createElement('div');
        dayEl.className = 'day';
        dayEl.dataset.date = dateKey;

        // Apply classes based on data and logs
        if (dateKey === todayKey) dayEl.classList.add('day-today');
        if (logs.isPeriod) dayEl.classList.add('day-period'); // Logged period takes precedence
        else if (data.isPeriod) dayEl.classList.add('day-period-predicted');
        if (data.isOvulation) dayEl.classList.add('day-ovulation-predicted'); // Ovulation
        else if (data.isFertile) dayEl.classList.add('day-fertile-predicted'); // Fertile (use predicted or maybe based on more complex logic)

        // Day number
        dayEl.innerHTML = `<span class="day-number">${day}</span>`;

        // Indicator dots/hearts
        const indicatorContainer = document.createElement('div');
        indicatorContainer.className = 'day-indicator';
        // Add indicators based on logs (e.g., sex logged = heart)
        if (logs.sex && logs.sex.length > 0) {
            const heart = document.createElement('span');
            heart.className = 'indicator-heart';
            indicatorContainer.appendChild(heart);
        }
        // Add grey dot if other logs exist but not sex? (Optional)
        // if (!logs.sex && Object.keys(logs).length > 0) {
        //     const dot = document.createElement('span');
        //     dot.className = 'indicator-dot';
        //     indicatorContainer.appendChild(dot);
        // }
        dayEl.appendChild(indicatorContainer);

        dayEl.addEventListener('click', handleCalendarDayClick);
        monthGrid.appendChild(dayEl);
    }

    // Add placeholders for next month
    const totalCells = firstDay + daysInMonth;
    const remainingCells = (totalCells % 7 === 0) ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'day other-month';
        dayEl.innerHTML = `<span class="day-number">${i}</span>`;
        monthGrid.appendChild(dayEl);
    }

    updateCalendarBottomInfo(new Date(year, month, currentSelectedDate.getDate())); // Update panel for initially selected day
    feather.replace();
}

function handleCalendarDayClick(event) {
    const clickedDay = event.currentTarget;
    if (clickedDay.classList.contains('other-month')) return;

    const dateKey = clickedDay.dataset.date;
    const date = new Date(dateKey + 'T00:00:00'); // Ensure correct date object

    currentSelectedDate = date; // Update selected date

    // Optionally: Highlight selected day visually (add 'selected' class)
    document.querySelectorAll('.calendar-days-grid .day.selected').forEach(d => d.classList.remove('selected'));
    clickedDay.classList.add('selected'); // You'll need CSS for .day.selected

    updateCalendarBottomInfo(date);
}

function updateCalendarBottomInfo(date) {
     const panel = document.getElementById('calendar-month-bottom-panel');
     if (!panel || !date) return; // Ensure panel and date exist
     const dateKey = formatDateKey(date);
     const data = cycleData[dateKey] || {};
     const logs = userLogs[dateKey] || {};

     const dateInfoText = panel.querySelector('.date-text');
     dateInfoText.textContent = `${formatDisplayDate(date, { month: 'long', day: 'numeric'})} ・ ${data.cycleDay || '?'-й день цикла}`;

     // --- Update Logged Symptoms/Events Icons ---
     const symptomsEventsContainer = panel.querySelector('.symptoms-events-content');
     symptomsEventsContainer.innerHTML = ''; // Clear previous

     // Example: Add steps and distance if logged
     if (logs.steps) {
         symptomsEventsContainer.innerHTML += `
             <div class="symptom-item logged">
                 <span class="icon">👟</span> ${logs.steps}<br>шаги
             </div>`;
     }
     if (logs.distance) {
          symptomsEventsContainer.innerHTML += `
             <div class="symptom-item logged">
                 <span class="icon">📍</span> ${logs.distance}<br>км
             </div>`;
     }
     // Add placeholders for unlogged items (Water, Weight etc.)
     symptomsEventsContainer.innerHTML += `
         <div class="symptom-item"><span class="icon">💧</span> Вода</div>
         <div class="symptom-item"><span class="icon">⚖️</span> Вес</div>
     `;
     // Add the '+' button
     symptomsEventsContainer.innerHTML += `<button class="add-event-btn" id="add-symptoms-calendar-panel">+</button>`;
     panel.querySelector('#add-symptoms-calendar-panel')?.addEventListener('click', () => {
         showScreen('screen-log-symptoms'); // Navigate to log screen for the selected date
     });


     // --- Update Daily Cards in Panel ---
     // This should reuse the logic from updateDailyCards, potentially simplifying it
     const cardsContainer = panel.querySelector('.cards-container');
     cardsContainer.innerHTML = ''; // Clear previous
     // Add cards based on 'data' and 'logs' for the selected 'date'
     // Example:
      cardsContainer.innerHTML = `
         <div class="card daily-card fertility-card-today">
             <span class="card-title">Вероятность забеременеть</span>
             <div class="card-dots">${data.isFertile ? 'Высокая' : 'Низкая'}</div>
             <span class="card-subtitle">${data.chance || ''}</span>
         </div>
         <div class="card daily-card discharge-card">
             <span class="card-title">Выделения</span>
             <div class="card-icon-large"><span class="discharge-icon">💧</span></div>
             <span class="card-subtitle">${logs.discharge ? logs.discharge.join(', ') : (data.discharge || 'Нет')}</span>
         </div>
         <div class="card daily-card possible-symptoms-card-today">
             <span class="card-title">${formatDisplayDate(date, { day: 'numeric', month: 'short' })}:<br>симптомы</span>
             <div class="symptom-icons-row">
                 ${(data.possibleSymptoms || []).slice(0, 3).map(icon => `<span class="s-icon">${icon}</span>`).join('')}
             </div>
         </div>
         <div class="card daily-card current-cycle-day-card">
              <span class="card-title">Текущий день цикла</span>
              <span class="card-day-number">${data.cycleDay || '?'}</span>
         </div>
      `;

     feather.replace(); // Update icons in the panel
     panel.style.display = 'block'; // Make sure panel is visible
}

function navigateCalendar(direction) {
    const currentMonth = currentSelectedDate.getMonth();
    const currentYear = currentSelectedDate.getFullYear();
    let newMonth, newYear;

    const isMonthView = document.getElementById('calendar-view-month').classList.contains('active');

    if (isMonthView) {
        if (direction === 'prev') {
            newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            newYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        } else { // next
            newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
            newYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        }
         currentSelectedDate = new Date(newYear, newMonth, 1); // Go to first of new month
         renderCalendarMonth(newYear, newMonth);
    } else { // Year View
         newYear = direction === 'prev' ? currentYear - 1 : currentYear + 1;
         currentSelectedDate = new Date(newYear, 0, 1); // Go to Jan 1st of new year
         renderCalendarYear(newYear); // Implement this function
    }
}

function renderCalendarYear(year) {
     const yearGrid = document.querySelector('#calendar-year-container .year-grid');
     const yearDisplay = document.querySelector('#calendar-year-container .year-display');
     if (!yearGrid || !yearDisplay) return;

     yearGrid.innerHTML = '';
     yearDisplay.textContent = year;

     const todayKey = formatDateKey(new Date());

     for (let month = 0; month < 12; month++) {
         const monthContainer = document.createElement('div');
         monthContainer.className = 'month-grid-item';

         const monthName = new Date(year, month).toLocaleDateString('ru-RU', { month: 'short' }); // Short month name
         monthContainer.innerHTML = `<h3>${monthName.replace('.', '')}</h3>`; // Remove dot if present

         const miniDaysContainer = document.createElement('div');
         miniDaysContainer.className = 'mini-month-days';

         const daysInMonth = getDaysInMonth(year, month);
         let firstDay = getFirstDayOfMonth(year, month);
         firstDay = (firstDay === 0) ? 6 : firstDay - 1; // Mon=0

         // Prev month placeholders
         for (let i = 0; i < firstDay; i++) miniDaysContainer.innerHTML += `<div class="mini-day other-month"></div>`;

         // Current month days
         for (let day = 1; day <= daysInMonth; day++) {
             const date = new Date(year, month, day);
             const dateKey = formatDateKey(date);
             const data = cycleData[dateKey] || {};
             const logs = userLogs[dateKey] || {};
             let classes = 'mini-day';
             if (dateKey === todayKey) classes += ' today';
             if (logs.isPeriod) classes += ' day-period';
             else if (data.isPeriod) classes += ' day-period-predicted';
             if (data.isOvulation) classes += ' day-ovulation-predicted';
             else if (data.isFertile) classes += ' day-fertile-predicted';

             miniDaysContainer.innerHTML += `<div class="${classes}">${day}</div>`; // Optionally show day number
         }

          // Next month placeholders
         const totalCells = firstDay + daysInMonth;
         const remainingCells = (totalCells % 7 === 0) ? 0 : 7 - (totalCells % 7);
         for (let i = 0; i < remainingCells; i++) miniDaysContainer.innerHTML += `<div class="mini-day other-month"></div>`;

         monthContainer.appendChild(miniDaysContainer);
         yearGrid.appendChild(monthContainer);
     }
     console.log(`Rendered Year: ${year}`);
}


// --- Log Symptoms Screen Logic ---
function loadLogScreenData(date) {
    const dateKey = formatDateKey(date);
    const logs = userLogs[dateKey] || {};
    const data = cycleData[dateKey] || {};

    // Update header date/cycle day
    const headerDate = document.querySelector('#screen-log-symptoms .current-date');
    if (headerDate) headerDate.innerHTML = `${isToday(date) ? 'Сегодня' : formatDisplayDate(date)} <span class="cycle-day-detail">${data.cycleDay || '?'-й день цикла}</span>`;

    // Clear previous selections
    document.querySelectorAll('#screen-log-symptoms .log-tag.active').forEach(tag => tag.classList.remove('active'));

    // Apply saved logs
    for (const category in logs) {
        if (Array.isArray(logs[category])) {
            logs[category].forEach(logValue => {
                // Find button by text content (less robust) or ideally data attributes
                const tagButton = Array.from(document.querySelectorAll('#screen-log-symptoms .log-tag'))
                                   .find(btn => btn.textContent.includes(logValue)); // Basic matching
                tagButton?.classList.add('active');
            });
        }
        // Handle non-array logs like water, weight, bbt if needed
    }

    // Update Water tracker display
    const waterAmountEl = document.querySelector('.water-amount');
    if (waterAmountEl) {
        const loggedWater = logs.water || 0; // Assuming water is stored as a number
        const goalWater = 2.25; // Example goal
        waterAmountEl.textContent = `${loggedWater.toFixed(2)} / ${goalWater.toFixed(2)} л`;
    }
}

function handleLogTagClick(event) {
    const button = event.currentTarget;
    button.classList.toggle('active');
    const category = button.closest('.log-category')?.querySelector('h3')?.textContent || 'Unknown';
    const value = button.textContent.trim(); // Or get from data-attribute
    const isActive = button.classList.contains('active');
    const dateKey = formatDateKey(currentSelectedDate);

    // --- Update userLogs (Basic Example) ---
    if (!userLogs[dateKey]) userLogs[dateKey] = {};
    // Find the category key (e.g., 'symptoms', 'discharge', 'sex')
    // This needs a mapping from the H3 text to the object key
    const categoryKey = category.toLowerCase().includes('секс') ? 'sex'
                       : category.toLowerCase().includes('настроение') ? 'mood'
                       : category.toLowerCase().includes('симптом') ? 'symptoms'
                       : category.toLowerCase().includes('выделен') ? 'discharge'
                       : 'other'; // Fallback

     if (!userLogs[dateKey][categoryKey]) userLogs[dateKey][categoryKey] = [];

     if (isActive) { // Add log
         if (!userLogs[dateKey][categoryKey].includes(value)) {
             userLogs[dateKey][categoryKey].push(value);
         }
     } else { // Remove log
         userLogs[dateKey][categoryKey] = userLogs[dateKey][categoryKey].filter(item => item !== value);
     }

    console.log(`Log Updated [${dateKey}]:`, categoryKey, value, isActive ? "Added" : "Removed", userLogs[dateKey]);
    // Persist userLogs data here (e.g., localStorage or send to backend)
}

function adjustWater(amount) {
    const dateKey = formatDateKey(currentSelectedDate);
    if (!userLogs[dateKey]) userLogs[dateKey] = {};
    let currentWater = userLogs[dateKey].water || 0;
    currentWater = Math.max(0, currentWater + amount); // Don't go below 0
    userLogs[dateKey].water = currentWater;

    // Update display
    const waterAmountEl = document.querySelector('.water-amount');
     if (waterAmountEl) {
        const goalWater = 2.25; // Example goal
        waterAmountEl.textContent = `${currentWater.toFixed(2)} / ${goalWater.toFixed(2)} л`;
    }
    console.log(`Water Updated [${dateKey}]:`, currentWater);
     // Persist userLogs data here
}

function navigateLogDay(direction) {
    const newDate = new Date(currentSelectedDate);
    newDate.setDate(currentSelectedDate.getDate() + direction);
    currentSelectedDate = newDate;
    loadLogScreenData(currentSelectedDate);
}

// --- Charts & Reports Logic ---
function renderCycleLengthChart() {
    const chartContent = document.querySelector('#screen-chart-cycle-length-detail .chart-content');
    if (!chartContent) return;
    chartContent.innerHTML = ''; // Clear previous

    // Find max length for scaling bars (or use a fixed max like 70?)
    const maxLength = Math.max(...cycleHistory.map(c => c.length || 0), 35); // Include 35 for normal range vis

    // Calculate average (excluding current cycle)
    const completedCycles = cycleHistory.filter(c => c.endDate);
    const avgLength = completedCycles.length > 0
        ? Math.round(completedCycles.reduce((sum, c) => sum + c.length, 0) / completedCycles.length)
        : 30; // Default average
    document.querySelector('.avg-cycle-length').textContent = `${avgLength} день`;


    cycleHistory.slice().reverse().forEach(cycle => { // Show newest first
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cycle-bar-item';
        if (!cycle.endDate) itemDiv.classList.add('current'); // Style current cycle

        const startDate = new Date(cycle.startDate + 'T00:00:00');
        const endDate = cycle.endDate ? new Date(cycle.endDate + 'T00:00:00') : new Date(); // Use today if no end date

        let dateString = "";
        if (!cycle.endDate) {
             dateString = `ТЕКУЩИЙ ЦИКЛ: ${formatDisplayDate(startDate, {day: 'numeric', month: 'short'})} - ${formatDisplayDate(endDate, {day: 'numeric', month: 'short'})}`;
        } else {
             dateString = `${formatDisplayDate(startDate, {day: 'numeric', month: 'short'})} - ${formatDisplayDate(endDate, {day: 'numeric', month: 'short'})}`;
             // Add year if different
             if (startDate.getFullYear() !== endDate.getFullYear()) {
                  dateString = `${formatDisplayDate(startDate, {day: 'numeric', month: 'short', year: 'numeric'})} - ${formatDisplayDate(endDate, {day: 'numeric', month: 'short', year: 'numeric'})}`;
             } else if (startDate.getFullYear() !== new Date().getFullYear()){
                 dateString = `${formatDisplayDate(startDate, {day: 'numeric', month: 'short'})} - ${formatDisplayDate(endDate, {day: 'numeric', month: 'short', year: 'numeric'})}`;
             }
        }


        let barClass = 'bar';
        if (cycle.endDate) { // Only classify completed cycles
            if (cycle.length >= 21 && cycle.length <= 35) barClass += ' normal';
            else if (cycle.length > 35) barClass += ' long'; // Or 'very-long' based on threshold
            else if (cycle.length < 21) barClass += ' short'; // Add style for short if needed
        }

        // Calculate width percentage (relative to max length)
        const barWidth = Math.min(100, (cycle.length / maxLength) * 100);

        itemDiv.innerHTML = `
            <span class="cycle-dates">${dateString}</span>
            <div class="bar-container">
                <div class="${barClass}" style="width: ${barWidth}%;"></div>
                <span class="bar-label">${cycle.length} ${cycle.length > 1 ? 'дней' : 'день'}</span>
            </div>
        `;
        chartContent.appendChild(itemDiv);
    });
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Telegram === 'undefined' || !Telegram.WebApp) {
        console.warn("Telegram WebApp API not found. Using mock.");
        window.Telegram = { WebApp: { ready: ()=>{}, onEvent: ()=>{}, expand: ()=>{}, close: ()=>{}, themeParams: {}, initDataUnsafe: { user: {id:0, first_name:'User'} } }};
    }

    tg.ready();
    applyThemeStyles();
    tg.onEvent('themeChanged', applyThemeStyles);
    tg.expand();

    // --- Global Event Listeners ---
    document.querySelectorAll('.back-button, .close-button').forEach(btn => btn.addEventListener('click', goBack));

    // --- Bottom Nav Listeners ---
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetScreenId = button.dataset.target;
            if (targetScreenId) {
                 // Prevent central button click from hiding panel if panel is open
                 const calendarPanel = document.getElementById('calendar-month-bottom-panel');
                 if (targetScreenId === 'screen-log-symptoms' && calendarPanel && calendarPanel.style.display === 'block') {
                    e.stopPropagation(); // Keep panel open
                 }
                 showScreen(targetScreenId);
            }
        });
    });

    // --- Today Screen Listeners ---
    document.getElementById('log-symptoms-card')?.addEventListener('click', () => showScreen('screen-log-symptoms'));
    document.getElementById('log-period-today')?.addEventListener('click', () => alert('Log/Edit Period Action')); // Placeholder
    document.getElementById('prev-day-main')?.addEventListener('click', () => {
        const newDate = new Date(currentSelectedDate);
        newDate.setDate(currentSelectedDate.getDate() - 1);
        updateTodayScreen(newDate);
    });
    document.getElementById('next-day-main')?.addEventListener('click', () => {
         const newDate = new Date(currentSelectedDate);
         newDate.setDate(currentSelectedDate.getDate() + 1);
         updateTodayScreen(newDate);
    });
    document.getElementById('view-all-cycles-link')?.addEventListener('click', (e) => { e.preventDefault(); showScreen('screen-charts-reports'); }); // Go to charts menu first

    // --- Calendar Screen Listeners ---
    document.getElementById('calendar-view-month')?.addEventListener('click', () => {
        document.getElementById('calendar-view-month').classList.add('active');
        document.getElementById('calendar-view-year').classList.remove('active');
        document.getElementById('calendar-month-container').style.display = 'block';
        document.getElementById('calendar-year-container').style.display = 'none';
        document.getElementById('calendar-month-bottom-panel').style.display = 'block'; // Show panel
        renderCalendarMonth(currentSelectedDate.getFullYear(), currentSelectedDate.getMonth()); // Re-render month
    });
    document.getElementById('calendar-view-year')?.addEventListener('click', () => {
        document.getElementById('calendar-view-month').classList.remove('active');
        document.getElementById('calendar-view-year').classList.add('active');
        document.getElementById('calendar-month-container').style.display = 'none';
        document.getElementById('calendar-year-container').style.display = 'block';
        document.getElementById('calendar-month-bottom-panel').style.display = 'none'; // Hide panel
        renderCalendarYear(currentSelectedDate.getFullYear()); // Render year
    });
    document.getElementById('prev-month')?.addEventListener('click', () => navigateCalendar('prev'));
    document.getElementById('next-month')?.addEventListener('click', () => navigateCalendar('next'));
     document.getElementById('prev-year')?.addEventListener('click', () => navigateCalendar('prev'));
     document.getElementById('next-year')?.addEventListener('click', () => navigateCalendar('next'));
    document.querySelector('.close-panel-icon')?.addEventListener('click', () => {
        document.getElementById('calendar-month-bottom-panel').style.display = 'none';
    });
    // Add listener for panel drag if implementing swipeable panel

    // --- Log Symptoms Listeners ---
    document.querySelectorAll('#screen-log-symptoms .log-tag').forEach(button => button.addEventListener('click', handleLogTagClick));
    document.querySelector('#screen-log-symptoms .water-btn.minus')?.addEventListener('click', () => adjustWater(-0.25)); // Example: Adjust by 0.25L
    document.querySelector('#screen-log-symptoms .water-btn.plus')?.addEventListener('click', () => adjustWater(0.25));
    document.querySelector('#screen-log-symptoms .back-button')?.addEventListener('click', goBack); // Ensure it uses goBack
    document.querySelector('#screen-log-symptoms .next-day-log')?.addEventListener('click', () => navigateLogDay(1));
    // Need listener for prev day in log screen header if added


    // --- Settings Screen Listeners ---
     document.querySelectorAll('#screen-settings .goal-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#screen-settings .goal-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            updateActiveGoalButtonStyles();
            // TODO: Save selected goal
            console.log("Goal selected:", button.textContent);
        });
     });
    document.getElementById('nav-doctor-report')?.addEventListener('click', () => showScreen('screen-doctor-report-view'));
    document.getElementById('nav-charts-reports')?.addEventListener('click', () => showScreen('screen-charts-reports'));
    // Add listeners for other settings items (Cycle/Ovulation, App Settings, etc.) to navigate to their respective (uncreated) screens
    document.getElementById('nav-cycle-ovulation')?.addEventListener('click', () => alert('Navigate to Cycle/Ovulation Settings'));
    document.getElementById('nav-app-settings')?.addEventListener('click', () => alert('Navigate to App Settings'));
    document.getElementById('nav-privacy')?.addEventListener('click', () => alert('Navigate to Privacy Settings'));
    document.getElementById('nav-passcode')?.addEventListener('click', () => alert('Navigate to Passcode Settings'));
    document.getElementById('nav-reminders')?.addEventListener('click', () => alert('Navigate to Reminders Settings'));
    document.getElementById('nav-help')?.addEventListener('click', () => alert('Navigate to Help Section'));
    document.getElementById('connect-flo-family')?.addEventListener('click', () => alert('Flo for Family Action'));
    document.querySelector('.profile-edit-button')?.addEventListener('click', () => alert('Edit Profile Action'));


    // --- Charts & Reports Screen Listeners ---
    document.getElementById('nav-chart-cycle-length')?.addEventListener('click', () => showScreen('screen-chart-cycle-length-detail'));
    document.getElementById('nav-chart-period-length')?.addEventListener('click', () => alert('Navigate to Period Length Chart')); // Placeholder
    document.getElementById('nav-chart-patterns')?.addEventListener('click', () => alert('Navigate to Patterns Chart')); // Placeholder
    document.getElementById('nav-chart-symptoms')?.addEventListener('click', () => alert('Navigate to Symptoms Chart')); // Placeholder
    document.getElementById('get-doctor-report')?.addEventListener('click', () => showScreen('screen-doctor-report-view'));

     // --- Partner Screen Listeners ---
     document.getElementById('revoke-partner-access')?.addEventListener('click', () => alert('Revoke Partner Access Action'));
     document.getElementById('contact-support-partner')?.addEventListener('click', () => alert('Contact Support Action'));


    // --- Initial Setup ---
    updateActiveGoalButtonStyles(); // Apply initial style for default active button
    showScreen('screen-today', false); // Show initial screen without adding to history
    console.log("Flo Clone Initialized. User:", tg.initDataUnsafe.user?.first_name);
});

// Helper to check if a date is today
function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}