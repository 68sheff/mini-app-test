// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Основные цвета из темы Telegram (если нужно адаптироваться)
// Но у нас свой дизайн, поэтому просто сообщаем, что готовы.

// Состояние приложения
let state = {
    selectedRegion: null,
    regions: []
};

// Дефолтные данные (если не переданы через URL)
const defaultRegions = [
    { id: 'msk', name: 'Москва и область', price: 500, active: true },
    { id: 'spb', name: 'Санкт-Петербург', price: 450, active: true },
    { id: 'krd', name: 'Краснодарский край', price: 300, active: false },
    { id: 'ekb', name: 'Екатеринбург', price: 350, active: true },
    { id: 'kaz', name: 'Казань', price: 300, active: false },
    { id: 'nsk', name: 'Новосибирск', price: 300, active: true }
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
    // Пытаемся получить данные из URL (от бота)
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('regions');
    
    if (dataParam) {
        try {
            // Декодируем Base64 или JSON
            const decoded = atob(dataParam);
            state.regions = JSON.parse(decoded);
        } catch (e) {
            console.error('Ошибка парсинга данных', e);
            state.regions = defaultRegions;
        }
    } else {
        state.regions = defaultRegions;
    }

    renderRegions();
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
    
    // Заполняем форму
    regionTitle.textContent = region.name;
    priceTag.textContent = `Выплата: ${region.price}₽`;
    phoneInput.value = ''; // Очистка
    
    // Переключаем экран
    showScreen('form');
    
    // Фокус на ввод (не всегда работает на мобильных сразу, но попробуем)
    setTimeout(() => phoneInput.focus(), 300);
}

function goBack() {
    state.selectedRegion = null;
    showScreen('main');
    tg.MainButton.hide();
}

function showScreen(screenName) {
    // Скрываем все
    Object.values(screens).forEach(el => el.style.display = 'none');
    
    // Показываем нужный
    if (screens[screenName]) {
        screens[screenName].style.display = 'block';
        screens[screenName].classList.add('fade-in');
    }
}

// Обработка отправки формы
submitBtn.onclick = () => {
    const phone = phoneInput.value.trim();
    
    if (phone.length < 10) {
        tg.showAlert("Пожалуйста, введите корректный номер телефона");
        return;
    }
    
    // Отправка данных боту
    const payload = {
        action: "submit_number",
        region_id: state.selectedRegion.id,
        region_name: state.selectedRegion.name,
        price: state.selectedRegion.price,
        phone: phone
    };
    
    // 1. Показываем успех внутри Web App
    document.getElementById('success-amount').innerText = `${state.selectedRegion.price}₽`;
    showScreen('success');
    
    // 2. Отправляем данные боту (закроет приложение и отправит сообщение)
    // Можно сделать задержку, чтобы юзер успел прочитать "Успешно"
    setTimeout(() => {
        tg.sendData(JSON.stringify(payload));
    }, 2000);
};

// Запуск
init();

