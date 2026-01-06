const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// --- STATE ---
let state = {
    selectedRegion: null,
    regions: [],
    requests: [] // Локальная история
};

// --- SNOWFLAKES ---
function createSnowflakes() {
    const container = document.getElementById('snow-container');
    const flakesCount = 30;
    for (let i = 0; i < flakesCount; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        flake.innerHTML = '❄';
        flake.style.left = Math.random() * 100 + 'vw';
        flake.style.animationDuration = Math.random() * 3 + 2 + 's';
        flake.style.opacity = Math.random();
        flake.style.fontSize = Math.random() * 10 + 10 + 'px';
        container.appendChild(flake);
    }
}
createSnowflakes();

// --- INIT DATA ---
const defaultRegions = [
    { id: 'msk', name: 'Москва и область', price: 600, active: true },
    { id: 'spb', name: 'Санкт-Петербург', price: 500, active: true },
    { id: 'ekb', name: 'Екатеринбург', price: 400, active: true },
    { id: 'nsk', name: 'Новосибирск', price: 350, active: true },
    { id: 'krd', name: 'Краснодар', price: 300, active: false }
];

function init() {
    // 1. Регионы из URL
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('regions');
    if (dataParam) {
        try {
            state.regions = JSON.parse(atob(dataParam));
        } catch (e) { state.regions = defaultRegions; }
    } else {
        state.regions = defaultRegions;
    }
    
    // 2. История заявок из LocalStorage (симуляция бэкенда)
    const saved = localStorage.getItem('skrx_requests');
    if (saved) state.requests = JSON.parse(saved);

    // 3. Рендер
    renderRegions();
    setupPhoneInput();
    updateProfile();
}

// --- TABS ---
function switchTab(tabName) {
    // UI
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    
    // Nav styles
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    // Находим нужный nav item (простой способ по индексу или тексту, но сделаем через onclick binding)
    const navItems = document.querySelectorAll('.nav-item');
    if(tabName === 'submit') navItems[0].classList.add('active');
    if(tabName === 'requests') {
        navItems[1].classList.add('active');
        renderRequests(); // Обновить список
    }
    if(tabName === 'profile') {
        navItems[2].classList.add('active');
        updateProfile();
    }
}

// --- REGIONS & FLOW ---
function renderRegions() {
    const list = document.getElementById('region-list');
    list.innerHTML = '';
    state.regions.forEach(r => {
        const div = document.createElement('div');
        div.className = `glass-card region-item ${r.active ? '' : 'disabled'}`;
        div.innerHTML = `
            <div>
                <span class="region-name">${r.name}</span>
                <span class="region-price">${r.price}₽</span>
            </div>
            <div class="status-badge ${r.active ? 'status-active' : 'status-inactive'}">
                ${r.active ? 'Нужен' : 'Не нужен'}
            </div>
        `;
        if(r.active) div.onclick = () => selectRegion(r);
        list.appendChild(div);
    });
}

function selectRegion(r) {
    state.selectedRegion = r;
    document.getElementById('selected-region-name').innerText = r.name;
    document.getElementById('selected-region-price').innerText = r.price + '₽';
    
    document.getElementById('region-list-view').style.display = 'none';
    document.getElementById('form-view').style.display = 'block';
    
    const inp = document.getElementById('phone-input');
    inp.value = '';
    setTimeout(() => { inp.focus(); inp.value = '+7 ('; }, 300);
    validatePhone();
}

function resetSelection() {
    document.getElementById('form-view').style.display = 'none';
    document.getElementById('region-list-view').style.display = 'block';
}

function resetToMain() {
    document.getElementById('success-view').style.display = 'none';
    document.getElementById('region-list-view').style.display = 'block';
    switchTab('submit');
}

// --- PHONE INPUT ---
const phoneInput = document.getElementById('phone-input');
const submitBtn = document.getElementById('submit-btn');

function setupPhoneInput() {
    phoneInput.addEventListener('input', onPhoneInput);
    phoneInput.addEventListener('focus', function() {
        if(!this.value) this.value = '+7 (';
    });
    phoneInput.addEventListener('blur', function() {
        if(this.value === '+7 (') this.value = '';
    });
}

function onPhoneInput(e) {
    let input = e.target;
    let val = input.value.replace(/\D/g, '');
    
    if(!val) { input.value = ''; return; }
    if(val[0] === '8' || val[0] === '7') val = '7' + val.substring(1);
    else val = '7' + val;

    let newVal = '+7';
    if(val.length > 1) newVal += ' (' + val.substring(1,4);
    if(val.length >= 5) newVal += ') ' + val.substring(4,7);
    if(val.length >= 8) newVal += '-' + val.substring(7,9);
    if(val.length >= 10) newVal += '-' + val.substring(9,11);
    
    input.value = newVal;
    validatePhone(val);
}

function validatePhone(digits) {
    if(!digits) digits = phoneInput.value.replace(/\D/g, '');
    submitBtn.disabled = digits.length !== 11;
}

// --- SUBMIT ---
submitBtn.onclick = () => {
    if(submitBtn.disabled) return;
    
    const phone = phoneInput.value;
    const region = state.selectedRegion;
    
    // 1. Сохраняем в локальную историю
    const newReq = {
        id: Date.now(),
        region: region.name,
        phone: phone,
        price: region.price,
        status: 'pending', // pending, approved, rejected
        date: new Date().toLocaleDateString()
    };
    
    state.requests.unshift(newReq); // Добавляем в начало
    localStorage.setItem('skrx_requests', JSON.stringify(state.requests));
    
    // 2. Отправляем боту
    const payload = {
        action: "submit_number",
        ...newReq
    };
    tg.sendData(JSON.stringify(payload));
    
    // 3. UI Успех (но не закрываем приложение сразу, даем посмотреть)
    document.getElementById('form-view').style.display = 'none';
    document.getElementById('success-view').style.display = 'block';
};

// --- REQUESTS TAB ---
function renderRequests() {
    const list = document.getElementById('requests-list');
    list.innerHTML = '';
    
    if(state.requests.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 50px;">У вас пока нет заявок</p>';
        return;
    }
    
    state.requests.forEach(req => {
        let statusLabel = 'На проверке';
        let statusClass = 'status-pending';
        // Тут можно было бы менять статус, если бы у нас был API
        
        const el = document.createElement('div');
        el.className = 'glass-card request-item';
        el.innerHTML = `
            <div>
                <div style="font-weight: bold; font-size: 14px;">${req.phone}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${req.region} • ${req.date}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: bold; color: var(--success);">${req.price}₽</div>
                <div class="req-status ${statusClass}">${statusLabel}</div>
            </div>
        `;
        list.appendChild(el);
    });
}

// --- PROFILE TAB ---
function updateProfile() {
    const user = tg.initDataUnsafe.user;
    if(user) {
        document.getElementById('user-name').innerText = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        document.getElementById('user-username').innerText = user.username ? '@' + user.username : '';
        if(user.photo_url) document.getElementById('user-avatar').src = user.photo_url;
    }
    
    // Статистика из локальных данных
    const totalCount = state.requests.length;
    // Считаем сумму только "Approved" (пока считаем все для красоты, или 0)
    // Т.к. статусы мы не обновляем из бота без API, пока покажем 0 выплачено (честно)
    // Или можно показать "В ожидании: X руб"
    
    let potentialSum = state.requests.reduce((acc, curr) => acc + curr.price, 0);
    
    document.getElementById('stat-count').innerText = totalCount;
    // Покажем как "Потенциальная выплата"
    document.getElementById('stat-paid').innerText = "0₽"; 
}

init();
