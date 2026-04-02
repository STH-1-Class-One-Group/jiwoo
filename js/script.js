/**
 * PokéMatch - 다국어 포켓몬 상성 검색 앱
 * PokeAPI 지원 13개 언어 전환, 포켓몬 이름/타입 지역화,
 * 비영어 이름 검색, kong-api 연동을 모두 지원합니다.
 */

// --- DOM 요소 참조 ---
const searchInput = document.getElementById('pokemon-search');
const searchBtn = document.getElementById('search-btn');
const resultContainer = document.getElementById('result-container');
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const pokeSprite = document.getElementById('pokemon-sprite');
const pokeId = document.getElementById('pokemon-id');
const pokeName = document.getElementById('pokemon-name');
const pokeTypes = document.getElementById('pokemon-types');
const langSelect = document.getElementById('lang-select');

// --- 상태 변수 ---
let currentLang = 'ko'; // 현재 선택된 언어
let lastSearchedId = null; // 언어 전환 시 재렌더링을 위한 마지막 검색 ID

// --- 타입 이름 번역 캐시 ---
// ko, en은 빠른 응답을 위해 하드코딩, 나머지 언어는 API에서 동적 로딩 후 캐시
const typeNameCache = {
    ko: {
        normal: '노말', fire: '불꽃', water: '물', electric: '전기', grass: '풀', ice: '얼음',
        fighting: '격투', poison: '독', ground: '땅', flying: '비행', psychic: '에스퍼',
        bug: '벌레', rock: '바위', ghost: '고스트', dragon: '드래곤', dark: '악', steel: '강철', fairy: '페어리'
    },
    en: {
        normal: 'Normal', fire: 'Fire', water: 'Water', electric: 'Electric', grass: 'Grass', ice: 'Ice',
        fighting: 'Fighting', poison: 'Poison', ground: 'Ground', flying: 'Flying', psychic: 'Psychic',
        bug: 'Bug', rock: 'Rock', ghost: 'Ghost', dragon: 'Dragon', dark: 'Dark', steel: 'Steel', fairy: 'Fairy'
    }
};
const ALL_TYPE_KEYS = ['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
let typeNames = typeNameCache['ko']; // 현재 언어의 타입 이름 참조

// --- UI 문자열 번역 ---
// ko, en만 하드코딩. 그 외 언어는 en 폴백
const UI_STRINGS = {
    ko: {
        subtitle: '포켓몬의 이름 또는 번호를 검색하여 상성을 확인하세요.',
        placeholder: '포켓몬 이름 또는 ID...',
        search: '검색',
        loading: '포켓몬 데이터를 불러오는 중...',
        error: '포켓몬을 찾을 수 없습니다. 철자를 확인해 주세요.',
        defendTitle: '방어 시 타입 상성',
        attackTitle: '공격 시 타입 상성',
        higherDmgTaken: '받는 데미지 증가',
        lowerDmgTaken: '받는 데미지 감소',
        noDmgTaken: '데미지 무효',
        higherDmgGiven: '주는 데미지 증가',
        lowerDmgGiven: '주는 데미지 감소',
        noDmgGiven: '공격 데미지 무효',
    },
    en: {
        subtitle: 'Search by name or number to check type matchups.',
        placeholder: 'Pokémon name or ID...',
        search: 'Search',
        loading: 'Fetching Pokémon data...',
        error: 'Pokémon not found. Please check the spelling.',
        defendTitle: 'Defending Type Effectiveness',
        attackTitle: 'Attacking Type Effectiveness',
        higherDmgTaken: 'Higher Damage Taken',
        lowerDmgTaken: 'Lower Damage Taken',
        noDmgTaken: 'No Damage Taken',
        higherDmgGiven: 'Higher Damage Given',
        lowerDmgGiven: 'Lower Damage Given',
        noDmgGiven: 'No Damage Given',
    }
};

/** 현재 언어의 UI 문자열을 가져옵니다. 없으면 영어로 폴백합니다. */
function getUIString(key) {
    const strings = UI_STRINGS[currentLang] || UI_STRINGS['en'];
    return strings[key] || UI_STRINGS['en'][key] || key;
}


// =========================================================
//  타입 이름 로딩 (ko/en 외 언어는 PokeAPI type 엔드포인트에서 fetch)
// =========================================================

async function loadTypeNames(lang) {
    if (typeNameCache[lang]) {
        typeNames = typeNameCache[lang];
        return;
    }

    // API에서 18개 타입의 지역화 이름을 병렬로 가져옵니다
    const names = {};
    const promises = ALL_TYPE_KEYS.map(async (type) => {
        try {
            const resp = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
            const data = await resp.json();
            const localized = data.names.find(n => n.language.name === lang);
            names[type] = localized ? localized.name : typeNameCache['en'][type]; // 없으면 영어 폴백
        } catch {
            names[type] = typeNameCache['en'][type];
        }
    });
    await Promise.all(promises);
    typeNameCache[lang] = names;
    typeNames = names;
}


// =========================================================
//  언어 전환
// =========================================================

async function setLanguage(lang) {
    if (currentLang === lang) return;
    currentLang = lang;

    // UI 문자열 업데이트
    document.getElementById('app-subtitle').textContent = getUIString('subtitle');
    searchInput.placeholder = getUIString('placeholder');
    searchBtn.textContent = getUIString('search');
    loadingSpinner.querySelector('p').textContent = getUIString('loading');
    errorMessage.querySelector('p').textContent = getUIString('error');

    // 섹션 타이틀 업데이트
    updateSectionTitles();

    // 타입 이름 로딩 (캐시에 있으면 즉시, 없으면 API fetch)
    await loadTypeNames(lang);

    // 현재 포켓몬이 표시 중이면 새 언어로 재렌더링 (kong 모드 제외)
    if (lastSearchedId && !document.querySelector('.kong-stats-panel')) {
        showLoading(true);
        try {
            await fetchAndRender(lastSearchedId);
        } catch (e) {
            console.error(e);
        }
        showLoading(false);
    }
}

/** matchup 섹션의 h3/h4 타이틀을 현재 언어로 업데이트합니다. kong 모드일 때는 무시합니다. */
function updateSectionTitles() {
    const titleMap = {
        'title-weak-from': 'higherDmgTaken',
        'title-resist-from': 'lowerDmgTaken',
        'title-immune-from': 'noDmgTaken',
        'title-weak-to': 'higherDmgGiven',
        'title-resist-to': 'lowerDmgGiven',
        'title-immune-to': 'noDmgGiven',
    };
    for (const [id, key] of Object.entries(titleMap)) {
        const el = document.getElementById(id);
        if (el) el.textContent = getUIString(key);
    }

    // matchup-wrapper의 h3 (방어/공격 제목)
    const wrappers = document.querySelectorAll('.matchup-wrapper > h3');
    if (wrappers.length >= 2) {
        wrappers[0].textContent = getUIString('defendTitle');
        wrappers[1].textContent = getUIString('attackTitle');
    }
}


// =========================================================
//  포켓몬 검색
// =========================================================

async function searchPokemon() {
    const rawQuery = searchInput.value.trim();
    if (!rawQuery) return;

    let query = rawQuery.toLowerCase().trim();
    if (!query) return;

    showLoading(true);
    hideAllSections();

    try {
        let targetId = query;

        // 비ASCII 문자(한글, 한자, 가나 등) 입력 감지 → 지역화 이름 검색
        if (/[^\x00-\x7F]/.test(query)) {
            const speciesId = await findIdByLocalizedName(query);
            if (!speciesId) throw new Error('Pokemon not found by localized name');
            targetId = speciesId;
        }

        await fetchAndRender(targetId);
    } catch (error) {
        console.error(error);
        errorMessage.classList.remove('hidden');
    } finally {
        showLoading(false);
    }
}


// =========================================================
//  지역화 이름 → ID 검색 (PokeAPI species에서 batch 병렬 탐색)
// =========================================================

async function findIdByLocalizedName(name) {
    // 1. 세션 캐시 확인 (이전에 같은 이름을 검색한 적이 있는지)
    const cacheKey = `pokeName_${name}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return parseInt(cached);

    try {
        // 2. 전체 종 리스트를 가져옵니다
        const response = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=1025');
        const data = await response.json();

        // 3. 10개씩 병렬 배치로 탐색 (순차 대비 ~10배 빠름)
        const BATCH_SIZE = 10;
        for (let batchStart = 0; batchStart < data.results.length; batchStart += BATCH_SIZE) {
            const batch = data.results.slice(batchStart, batchStart + BATCH_SIZE);

            const results = await Promise.all(batch.map(async (species) => {
                try {
                    const sResp = await fetch(species.url);
                    const sData = await sResp.json();
                    // 모든 언어의 이름을 확인
                    const match = sData.names.find(n => n.name.toLowerCase() === name.toLowerCase());
                    return match ? sData.id : null;
                } catch {
                    return null;
                }
            }));

            const foundId = results.find(r => r !== null);
            if (foundId) {
                sessionStorage.setItem(cacheKey, foundId.toString());
                return foundId;
            }
        }
    } catch (e) {
        console.error('Localized name search error:', e);
    }
    return null;
}


// =========================================================
//  데이터 fetch & 렌더링
// =========================================================

async function fetchAndRender(actualId) {
    // 1. Species 데이터 → 지역화된 이름 획득
    const sResp = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${actualId}`);
    if (!sResp.ok) throw new Error('Not found');
    const sData = await sResp.json();

    const resolvedId = sData.id;
    lastSearchedId = resolvedId; // 언어 전환 시 재렌더링용

    // 2. Pokemon 데이터 → 스프라이트, 타입
    const pResp = await fetch(`https://pokeapi.co/api/v2/pokemon/${resolvedId}`);
    const pData = await pResp.json();

    // 3. 현재 언어에 맞는 이름 찾기 (없으면 영어 이름 폴백)
    const localizedName = sData.names.find(n => n.language.name === currentLang)?.name || pData.name;

    // 4. 렌더링
    renderPokemonInfo(pData, localizedName);
    await calculateTypeEffectiveness(pData);

    resultContainer.classList.remove('hidden');
}


// =========================================================
//  포켓몬 정보 렌더링 (지역화 대응)
// =========================================================

function renderPokemonInfo(data, localizedName) {
    // 움짤 스프라이트 우선, 없으면 기본 스프라이트
    pokeSprite.src = data.sprites.other['showdown'].front_default || data.sprites.front_default;
    pokeId.textContent = `#${data.id.toString().padStart(3, '0')}`;
    pokeName.textContent = localizedName || data.name;

    pokeTypes.innerHTML = '';
    data.types.forEach(t => {
        const span = document.createElement('span');
        span.className = 'type-badge';
        span.style.backgroundColor = `var(--type-${t.type.name})`;
        span.textContent = typeNames[t.type.name] || t.type.name; // 지역화된 타입 이름
        pokeTypes.appendChild(span);
    });
}


// =========================================================
//  상성 계산 (현재 버전과 동일, 타입 이름만 지역화)
// =========================================================

async function calculateTypeEffectiveness(data) {
    const typeURLs = data.types.map(item => item.type.url);
    const typeResponses = await Promise.all(typeURLs.map(url => fetch(url)));
    const typeDataArray = await Promise.all(typeResponses.map(res => res.json()));

    const defenseMultipliers = {};
    const attackMultipliers = {};

    typeDataArray.forEach(typeData => {
        const damage = typeData.damage_relations;
        damage.double_damage_from.forEach(t => { defenseMultipliers[t.name] = (defenseMultipliers[t.name] || 1) * 2; });
        damage.half_damage_from.forEach(t => { defenseMultipliers[t.name] = (defenseMultipliers[t.name] || 1) * 0.5; });
        damage.no_damage_from.forEach(t => { defenseMultipliers[t.name] = 0; });
        damage.double_damage_to.forEach(t => { attackMultipliers[t.name] = (attackMultipliers[t.name] || 1) * 2; });
        damage.half_damage_to.forEach(t => { attackMultipliers[t.name] = (attackMultipliers[t.name] || 1) * 0.5; });
        damage.no_damage_to.forEach(t => { attackMultipliers[t.name] = 0; });
    });

    displayEffectiveness('higher-damage-taken-list', defenseMultipliers, (n) => n > 1);
    displayEffectiveness('lower-damage-taken-list', defenseMultipliers, (n) => n < 1 && n > 0);
    displayEffectiveness('no-damage-taken-list', defenseMultipliers, (n) => n === 0);
    displayEffectiveness('higher-damage-given-list', attackMultipliers, (n) => n > 1);
    displayEffectiveness('lower-damage-given-list', attackMultipliers, (n) => n < 1 && n > 0);
    displayEffectiveness('no-damage-given-list', attackMultipliers, (n) => n === 0);
}

function displayEffectiveness(containerId, multipliers, filterFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    Object.entries(multipliers).forEach(([type, factor]) => {
        if (filterFn(factor)) {
            const span = document.createElement('span');
            span.className = 'type-badge';
            span.style.backgroundColor = `var(--type-${type})`;
            span.textContent = `${typeNames[type] || type} x${factor}`; // 지역화된 타입 이름 + 배율
            container.appendChild(span);
        }
    });
}


// =========================================================
//  유틸리티
// =========================================================

function showLoading(show) {
    loadingSpinner.classList.toggle('hidden', !show);
}

function hideAllSections() {
    resultContainer.classList.add('hidden');
    errorMessage.classList.add('hidden');
}


// =========================================================
//  이벤트 리스너 & 초기화
// =========================================================

searchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    searchPokemon();
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchPokemon();
    }
});

// 언어 선택 변경 이벤트
langSelect.addEventListener('change', (e) => {
    setLanguage(e.target.value);
});

// 초기 설정: 기본 언어 ko로 모든 UI 세팅
(async function init() {
    currentLang = langSelect.value; // HTML에서 selected된 값 (ko)
    await loadTypeNames(currentLang);

    // UI 문자열 초기 세팅
    document.getElementById('app-subtitle').textContent = getUIString('subtitle');
    searchInput.placeholder = getUIString('placeholder');
    searchBtn.textContent = getUIString('search');
    updateSectionTitles();
})();