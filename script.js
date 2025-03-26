const tg = window.Telegram.WebApp;
let cycleChartInstance = null;
let previousScreenId = 'screen-today';

function applyThemeStyles() {
    const themeParams = tg.themeParams;
    const root = document.documentElement;
    root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color || '#f0f0f5');
    root.style.setProperty('--tg-theme-text-color', themeParams.text_color || '#000000');
    root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color || '#8e8e93');
    root.style.setProperty('--tg-theme-link-color', themeParams.link_color || '#ff5c8a');
    root.style.setProperty('--tg-theme-button-color', themeParams.button_color || '#ff5c8a');
    root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color || '#ffffff');
    root.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color || '#ffffff');
    updateActiveGoalButtonStyles();
}

function updateActiveGoalButtonStyles() {
    const activeGoalBtn = document.querySelector('.goal-btn.active');
    if (activeGoalBtn) {
        const activeColor = getComputedStyle(document.documentElement).getPropertyValue('--flo-pink-primary');
        activeGoalBtn.style.borderColor = activeColor;
        activeGoalBtn.style.color = activeColor;
        activeGoalBtn.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--flo-pink-light-bg');
    }
     document.querySelectorAll('.goal-btn:not(.active)').forEach(btn => {
         btn.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--flo-grey-border');
         btn.style.color = getComputedStyle(document.documentElement).getPropertyValue('--tg-theme-text-color');
         btn.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--flo-grey-card-bg');
    });
}

function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) { r = parseInt(hex[0] + hex[0], 16); g = parseInt(hex[1] + hex[1], 16); b = parseInt(hex[2] + hex[2], 16); }
    else if (hex.length === 6) { r = parseInt(hex.substring(0, 2), 16); g = parseInt(hex.substring(2, 4), 16); b = parseInt(hex.substring(4, 6), 16); }
    else return `rgba(0,0,0,${alpha})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderCycleChart() {
    const ctx = document.getElementById('cycleLengthChartCanvas');
    if (!ctx) return;
    const chartContainer = ctx.closest('.chart-container');
    if (!chartContainer || chartContainer.offsetParent === null) return;

    if (cycleChartInstance) cycleChartInstance.destroy();

    const labels = [
        new Date(2024, 8, 15).getTime(), new Date(2024, 9, 15).getTime(), new Date(2024, 10, 9).getTime(), new Date(2024, 11, 21).getTime(), new Date(2025, 0, 14).getTime(), new Date(2025, 1, 13).getTime()
    ];
    const dataPoints = [30, 25, 42, 24, 30, 32];

    const floChartLine = getComputedStyle(document.documentElement).getPropertyValue('--flo-chart-line').trim() || '#6b7ebf';
    const floGreyTextLight = getComputedStyle(document.documentElement).getPropertyValue('--flo-grey-text-light').trim() || '#8e8e93';
    const floGreyBorder = getComputedStyle(document.documentElement).getPropertyValue('--flo-grey-border').trim() || '#e5e5ea';
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--tg-theme-text-color').trim() || '#000000';
    const tooltipBg = getComputedStyle(document.documentElement).getPropertyValue('--tg-theme-secondary-bg-color').trim() || '#ffffff';

    const chartCanvas = ctx.getContext('2d');
    const gradient = chartCanvas.createLinearGradient(0, 0, 0, ctx.canvas.height);
    const gradientColor = floChartLine;
    gradient.addColorStop(0, hexToRgba(gradientColor, 0.15));
    gradient.addColorStop(0.8, hexToRgba(gradientColor, 0.01));
    gradient.addColorStop(1, hexToRgba(gradientColor, 0));

    cycleChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Длина цикла', data: dataPoints, borderColor: floChartLine, borderWidth: 2, pointBackgroundColor: floChartLine, pointBorderColor: floChartLine, pointRadius: 4, pointHoverRadius: 6, tension: 0.4, fill: true, backgroundColor: gradient, }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { position: 'right', border: { display: false }, grid: { color: floGreyBorder, drawBorder: false, }, ticks: { color: floGreyTextLight, stepSize: 10, padding: 10, font: { size: 11 }, }, },
                x: { type: 'time', time: { unit: 'month', tooltipFormat: 'd MMM yyyy', displayFormats: { month: 'd MMM yyyy' } }, border: { display: false }, grid: { display: false, }, ticks: { color: floGreyTextLight, maxRotation: 0, minRotation: 0, autoSkip: true, maxTicksLimit: 6, font: { size: 11 }, align: 'center', padding: 5, } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true, mode: 'index', intersect: false, backgroundColor: tooltipBg, titleColor: textColor, bodyColor: textColor, borderColor: floGreyBorder, borderWidth: 0.5, displayColors: false, padding: {top: 6, bottom: 6, left: 8, right: 8}, cornerRadius: 4,
                           callbacks: { title: function() { return ''; }, label: function(context) { return `${context.parsed.y}`; }, labelTextColor: function(context) { return textColor; } } }
            },
            interaction: { intersect: false, mode: 'index', },
            layout: { padding: { left: 0, right: 25, top: 10, bottom: 0 } }
        }
    });
}

function handleCalendarOvalClick(event) {
    const clickedDay = event.target.closest('.day');
    if (!clickedDay || clickedDay.classList.contains('other-month')) return;

    clickedDay.classList.toggle('selected-period');
    const dayNumber = clickedDay.querySelector('.day-number')?.textContent || '?';

    if (clickedDay.classList.contains('selected-period')) {
        console.log(`День ${dayNumber} отмечен как месячные (selected-period).`);
        clickedDay.classList.remove('day-period-predicted', 'day-fertile-predicted', 'day-fertile-maybe', 'day-ovulation-predicted');
        const heartIndicator = clickedDay.querySelector('.day-indicator');
        if (heartIndicator) heartIndicator.querySelectorAll('span').forEach(heart => heart.style.backgroundColor = 'white');
    } else {
        console.log(`С дня ${dayNumber} снята отметка месячных (selected-period).`);
        // TODO: Restore predicted styles based on actual prediction data
        const heartIndicator = clickedDay.querySelector('.day-indicator');
        if (heartIndicator) {
             const isPredictedPeriod = false; // TODO: Check original state
             const heartColor = isPredictedPeriod ? getComputedStyle(document.documentElement).getPropertyValue('--flo-pink-primary') : 'transparent';
             heartIndicator.querySelectorAll('span').forEach(heart => heart.style.backgroundColor = heartColor);
        }
    }
    updateCalendarBottomInfo(clickedDay);
}

function updateCalendarBottomInfo(selectedDayElement) {
     const dateInfoText = document.querySelector('#calendar-month-bottom-panel .date-text');
     if (!dateInfoText) return;
     const dayNum = selectedDayElement.querySelector('.day-number')?.textContent || '?';
     const isToday = selectedDayElement.classList.contains('day-today');
     const cycleDay = "?"; // TODO: Get actual cycle day
     // TODO: Get month/year context
     dateInfoText.textContent = `Марта ${dayNum} ・ ${cycleDay}-й день цикла ${isToday ? '(Сегодня)' : ''}`;
     console.log("Обновление информации для дня:", dayNum);
     // TODO: Update symptoms and articles cards based on selected day data
}

function showScreen(screenId, isBackAction = false) {
    const currentActiveScreen = document.querySelector('.screen.active');
    const targetScreen = document.getElementById(screenId);
    if (!targetScreen) return;

    if (currentActiveScreen && !isBackAction) previousScreenId = currentActiveScreen.id;

    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    targetScreen.classList.add('active');

    const contentArea = document.querySelector('.content');
    if (contentArea) contentArea.scrollTop = 0;

    if (screenId === 'screen-detailed-stats') setTimeout(renderCycleChart, 50);

    updateBottomNav(screenId);

    // Показать/скрыть нижнюю панель календаря
    const calendarBottomPanel = document.getElementById('calendar-month-bottom-panel');
    if (calendarBottomPanel) {
        calendarBottomPanel.style.display = (screenId === 'screen-calendar-view' && document.getElementById('calendar-view-month').classList.contains('active')) ? 'block' : 'none';
    }
}

function updateBottomNav(activeScreenId) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    let targetNavButton = null;
    const screenMappings = {
        'screen-today': 'screen-today', 'screen-calendar-view': 'screen-today', 'screen-detailed-stats': 'screen-today', 'screen-settings': 'screen-today',
        'screen-articles': 'screen-articles', 'screen-partner': 'screen-partner'
    };
    const mappedTarget = screenMappings[activeScreenId];
    if (mappedTarget) targetNavButton = document.querySelector(`.nav-btn[data-target="${mappedTarget}"]`);
    if (targetNavButton) targetNavButton.classList.add('active');
}

function goBack() { showScreen(previousScreenId || 'screen-today', true); }

document.addEventListener('DOMContentLoaded', () => {
    if (typeof Telegram === 'undefined' || !Telegram.WebApp) {
        console.warn("Telegram WebApp API not found.");
        window.Telegram = { WebApp: { ready: ()=>{}, onEvent: ()=>{}, expand: ()=>{}, themeParams: {}, initDataUnsafe: { user: {id:0, first_name:'User'} } }};
    }

    tg.ready();
    applyThemeStyles();
    tg.onEvent('themeChanged', applyThemeStyles);
    tg.expand();
    feather.replace(); // Инициализация Feather Icons

    // === Навигация ===
    document.querySelectorAll('.nav-btn').forEach(button => button.addEventListener('click', () => showScreen(button.dataset.target)));
    document.getElementById('calendar-nav-icon')?.addEventListener('click', () => showScreen('screen-calendar-view'));
    document.getElementById('settings-nav-icon')?.addEventListener('click', () => showScreen('screen-settings'));
    document.getElementById('view-all-cycles-link')?.addEventListener('click', (e) => { e.preventDefault(); showScreen('screen-detailed-stats'); });
    document.getElementById('nav-to-detailed-stats-from-settings')?.addEventListener('click', () => showScreen('screen-detailed-stats'));
    document.getElementById('nav-to-detailed-stats-from-today')?.addEventListener('click', (e) => { e.preventDefault(); showScreen('screen-detailed-stats'); }); // Link from current cycle card
    document.getElementById('calendar-nav-icon-from-stats')?.addEventListener('click', () => showScreen('screen-calendar-view'));
    document.querySelectorAll('.back-button, .close-button').forEach(btn => btn.addEventListener('click', () => goBack()));

    // === Календарь ===
    const calendarGrid = document.querySelector('.calendar-days-grid');
    if (calendarGrid) calendarGrid.addEventListener('click', handleCalendarOvalClick);
     const btnMonth = document.getElementById('calendar-view-month');
     const btnYear = document.getElementById('calendar-view-year');
     const monthContainer = document.getElementById('calendar-month-container');
     const yearContainer = document.getElementById('calendar-year-container');
     const calendarBottomPanel = document.getElementById('calendar-month-bottom-panel');

     btnMonth?.addEventListener('click', () => {
         btnMonth.classList.add('active'); btnYear.classList.remove('active');
         monthContainer.style.display = 'block'; yearContainer.style.display = 'none';
         if (calendarBottomPanel) calendarBottomPanel.style.display = 'block';
     });
     btnYear?.addEventListener('click', () => {
         btnYear.classList.add('active'); btnMonth.classList.remove('active');
         yearContainer.style.display = 'block'; monthContainer.style.display = 'none';
         if (calendarBottomPanel) calendarBottomPanel.style.display = 'none';
         // TODO: Add logic to load/display year view data
     });
     document.getElementById('prev-month')?.addEventListener('click', () => console.log("Prev Month")); // TODO: Add month change logic
     document.getElementById('next-month')?.addEventListener('click', () => console.log("Next Month")); // TODO: Add month change logic


    // === Настройки ===
    document.querySelectorAll('.goal-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.goal-btn').forEach(btn => { btn.classList.remove('active'); btn.style = ''; });
            button.classList.add('active');
            updateActiveGoalButtonStyles();
        });
     });
     updateActiveGoalButtonStyles();

    // === Имитация ===
    document.querySelectorAll('.change-dates-btn').forEach(btn => btn.addEventListener('click', () => alert("Изменить даты месячных (действие)")));
    document.querySelectorAll('.settings-item:not(#nav-to-detailed-stats-from-settings)').forEach(item => item.addEventListener('click', () => console.log("Переход:", item.querySelector('.settings-item-text')?.textContent.trim())));
    document.querySelectorAll('.article-card').forEach(card => card.addEventListener('click', () => console.log("Статья:", card.querySelector('.card-text')?.textContent.trim())));
    document.querySelector('#calendar-month-bottom-panel .close-icon')?.addEventListener('click', () => console.log("Закрыть нижнюю панель"));
    document.querySelector('#calendar-month-bottom-panel .add-event-btn')?.addEventListener('click', () => console.log("Добавить событие"));
    document.querySelector('.assistant-flo-card button')?.addEventListener('click', () => console.log("Обсудить с ассистентом"));

    showScreen('screen-today');
    console.log("Flo Clone Initialized. User:", tg.initDataUnsafe.user?.first_name);
});