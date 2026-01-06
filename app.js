// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Состояние приложения
let state = {
    selectedRegion: null,
    regions: []
};

// Дефолтные данные
const defaultRegions = [
    { id: 'msk', name: 'Москва и область', price: 600, active: true },
    { id: 'spb', name: 'Санкт-Петербург', price: 500, active: true },
    { id: 'ekb', name: 'Екатеринбург', price: 400, active: true },
    { id: 'nsk', name: 'Новосибирск', price: 350, active: true }
];

// DOM элементы
const screens = {
    main: document.getElementById('screen-main'),
    form: document.getElementById('screen-form'),
    success: document.getElementById('screen-success')
};

const regionList = document.getElementById('region-list');
const regionTitle = document.getElementById('selected-region-title');
const priceTag = document.getElementById('price-tag');
const phoneInput = document.getElementById('phone-input');
const submitBtn = document.getElementById('submit-btn');

// --- Логика ---

function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('regions');
    
    if (dataParam) {
        try {
            const decoded = atob(dataParam);
            state.regions = JSON.parse(decoded);
        } catch (e) {
            console.error('Ошибка парсинга', e);
            state.regions = defaultRegions;
        }
    } else {
        state.regions = defaultRegions;
    }

    renderRegions();
    setupPhoneInput(); // Настройка маски
}

function renderRegions() {
    regionList.innerHTML = '';
    
    state.regions.forEach(region => {
        const div = document.createElement('div');
        div.className = `glass-card region-item ${region.active ? '' : 'disabled'}`;
        
        const statusText = region.active ? 'Нужен' : 'Не нужен';
        const statusClass = region.active ? 'status-active' : 'status-inactive';
        
        div.innerHTML = `
            <div class="region-info">
                <span class="region-name">${region.name}</span>
                <span class="region-price">Выплата: ${region.price}₽</span>
            </div>
            <div class="status-badge ${statusClass}">
                ${statusText}
            </div>
        `;
        
        if (region.active) {
            div.onclick = () => selectRegion(region);
        }
        
        regionList.appendChild(div);
    });
}

function selectRegion(region) {
    state.selectedRegion = region;
    
    regionTitle.textContent = region.name;
    priceTag.textContent = `Выплата: ${region.price}₽`;
    phoneInput.value = ''; 
    validatePhone(); // Сброс состояния кнопки
    
    showScreen('form');
    
    // Автофокус
    setTimeout(() => {
        phoneInput.focus();
        // Устанавливаем курсор в конец, если там уже есть +7
        if (!phoneInput.value) phoneInput.value = '+7 (';
    }, 300);
}

function goBack() {
    state.selectedRegion = null;
    showScreen('main');
    tg.MainButton.hide();
}

function showScreen(screenName) {
    Object.values(screens).forEach(el => el.style.display = 'none');
    if (screens[screenName]) {
        screens[screenName].style.display = 'block';
        screens[screenName].classList.add('fade-in');
    }
}

// --- МАСКА И ВАЛИДАЦИЯ ТЕЛЕФОНА ---

function setupPhoneInput() {
    phoneInput.addEventListener('input', onPhoneInput);
    phoneInput.addEventListener('keydown', onPhoneKeyDown);
    phoneInput.addEventListener('paste', onPhonePaste);
    phoneInput.addEventListener('focus', function() {
        if (!this.value) this.value = '+7 (';
    });
    phoneInput.addEventListener('blur', function() {
        if (this.value === '+7 (') this.value = '';
    });
}

function onPhoneInput(e) {
    let input = e.target;
    let val = input.value.replace(/\D/g, ''); // Удаляем все кроме цифр
    let newVal = '';

    // Если начинается не с 7, заменяем на 7 (если юзер ввел 8 или 9)
    if (!val) {
        input.value = '';
        return;
    }

    if (val[0] === '8' || val[0] === '7') {
        val = '7' + val.substring(1);
    } else {
        // Если ввел другую цифру, считаем что это начало номера после +7
        val = '7' + val;
    }

    // Форматирование: +7 (XXX) XXX-XX-XX
    // val уже содержит '7...'
    
    newVal = '+7';
    if (val.length > 1) newVal += ' (' + val.substring(1, 4);
    if (val.length >= 5) newVal += ') ' + val.substring(4, 7);
    if (val.length >= 8) newVal += '-' + val.substring(7, 9);
    if (val.length >= 10) newVal += '-' + val.substring(9, 11);

    input.value = newVal;
    validatePhone(val);
}

function onPhoneKeyDown(e) {
    // Разрешаем удаление (Backspace)
    if (e.keyCode === 8 && phoneInput.value.length <= 4) {
        e.preventDefault(); // Не даем удалить "+7 ("
    }
}

function onPhonePaste(e) {
    e.preventDefault();
    let pasted = (e.clipboardData || window.clipboardData).getData('text');
    let digits = pasted.replace(/\D/g, '');
    
    if (digits.length >= 10) {
        // Если скопировал полный номер (даже с 8 или без +7)
        // Берем последние 10 цифр
        let last10 = digits.slice(-10);
        let formatted = '7' + last10;
        
        // Триггерим input событие вручную или вызываем логику
        // Проще просто вставить и вызвать onPhoneInput
        // Но нам нужно правильно подать это в value
        // Упростим: просто перезапишем value так, чтобы onPhoneInput обработал
        
        // Симулируем ввод
        this.value = formatted; 
        // Вызываем обработчик input вручную, чтобы сработала маска
        let event = new Event('input');
        this.dispatchEvent(event);
    }
}

function validatePhone(digitsOnly) {
    // digitsOnly м.б. undefined, тогда берем из input
    if (!digitsOnly) {
        digitsOnly = phoneInput.value.replace(/\D/g, '');
    }

    // Полный номер РФ = 11 цифр (7 + 10 цифр)
    const isValid = digitsOnly.length === 11;

    submitBtn.disabled = !isValid;
    
    if (isValid) {
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.innerText = 'Сдать номер';
    } else {
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
        // Можно писать "Введите еще Х цифр"
    }
}


// --- ОТПРАВКА ---

submitBtn.onclick = () => {
    if (submitBtn.disabled) return;
    
    const phone = phoneInput.value;
    
    const payload = {
        action: "submit_number",
        region_id: state.selectedRegion.id,
        region_name: state.selectedRegion.name,
        price: state.selectedRegion.price,
        phone: phone
    };
    
    document.getElementById('success-amount').innerText = `${state.selectedRegion.price}₽`;
    showScreen('success');
    
    setTimeout(() => {
        tg.sendData(JSON.stringify(payload));
    }, 1500);
};

init();

