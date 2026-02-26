/**
 * PokéMatch - 다국어 포켓몬 상성 검색 앱
 * 이 스크립트는 PokéAPI와 상호작용하여 데이터를 가져오고, 타입 상성을 계산하며,
 * 한국어와 영어 간의 전환을 지원합니다.
 */

// --- DOM 요소 참조 ---
// 각 변수는 index.html의 요소를 참조하여 이후 코드에서 쉽게 조작할 수 있도록 합니다.
const searchInput = document.getElementById('pokemon-search'); // 사용자가 포켓몬 이름이나 ID를 입력하는 텍스트 입력창
const searchBtn = document.getElementById('search-btn'); // 입력창 옆의 '검색' 버튼
const resultContainer = document.getElementById('result-container'); // 포켓몬을 성공적으로 찾았을 때 나타나는 메인 결과 섹션
const loadingSpinner = document.getElementById('loading-spinner'); // 데이터를 가져오는 동안 표시되는 로딩 애니메이션
const errorMessage = document.getElementById('error-message'); // 포켓몬을 찾지 못했을 때 표시되는 에러 블록

const pokeSprite = document.getElementById('pokemon-sprite'); // 포켓몬의 공식 아트워크를 표시하는 <img> 태그
const pokeId = document.getElementById('pokemon-id'); // 도감 번호를 표시하는 스팬 (예: #025)
const pokeName = document.getElementById('pokemon-name'); // 포켓몬의 이름을 표시하는 h2 (언어 설정에 따름)
const pokeTypes = document.getElementById('pokemon-types'); // 타입 배지들이 삽입될 컨테이너

const weaknessList = document.getElementById('higher-damage-taken-list'); // 포켓몬이 받는 데미지가 높은 타입 (> 1배 피해) 그리드
const resistanceList = document.getElementById('lower-damage-taken-list'); // 포켓몬이 받는 데미지가 낮은 타입 (< 1배 피해) 그리드
const immunityList = document.getElementById('no-damage-taken-list'); // 포켓몬이 받는 데미지가 없는 타입 (0배 피해) 그리드
const weaknessListTo = document.getElementById('higher-damage-given-list'); // 포켓몬이 주는 데미지가 높은 타입 (> 1배 피해) 그리드
const resistanceListTo = document.getElementById('lower-damage-given-list'); // 포켓몬이 주는 데미지가 낮은 타입 (< 1배 피해) 그리드
const immunityListTo = document.getElementById('no-damage-given-list'); // 포켓몬이 주는 데미지가 없는 타입 (0배 피해) 그리드



// 타입 이름 데이터. 매번 API에서 가져오면 느리기 때문에 상수로 정의합니다.
const typeNames = {
    normal: 'Normal', fire: 'Fire', water: 'Water', electric: 'Electric', grass: 'Grass', ice: 'Ice',
    fighting: 'Fighting', poison: 'Poison', ground: 'Ground', flying: 'Flying', psychic: 'Psychic',
    bug: 'Bug', rock: 'Rock', ghost: 'Ghost', dragon: 'Dragon', dark: 'Dark', steel: 'Steel', fairy: 'Fairy'
};


/**
 * 이름/ID 를 모두 처리하는 메인 검색 로직입니다.
 */
async function searchPokemon() {
    let query = searchInput.value.toLowerCase().trim(); // 사용자의 입력을 정규화(소문자화, 공백 제거)합니다.
    if (!query) return;

    showLoading(true); // 로딩 UI를 표시합니다.
    hideAllSections(); // 이전 결과나 에러를 숨깁니다.

    try {
        let targetId = query; // 일단 입력값을 타겟 ID로 가정합니다 (ID나 영어 이름의 경우)

        // 찾은 ID로 데이터를 가져와 화면에 보여줍니다.
        await fetchAndRender(targetId);
    } catch (error) {
        console.error(error);
        errorMessage.classList.remove('hidden'); // 에러 발생 시 에러 메시지 UI 노출
    } finally {
        showLoading(false); // 성공 여부와 관계없이 로딩 UI 해제
    }
}


/**
 * 데이터를 가져와 UI에 렌더링하는 통합 기능입니다.
 */
async function fetchAndRender(actualId) {
    // 1. 포켓몬 기본 데이터(이름, 타입, 이미지 등)를 가져옵니다.
    const pResp = await fetch(`https://pokeapi.co/api/v2/pokemon/${actualId}`);
    if (!pResp.ok) throw new Error('Not found');
    const pData = await pResp.json();

    // 2. 기본 정보(이름, 이미지)를 먼저 화면에 그립니다.
    renderPokemonInfo(pData); 

    // 3. [중요] 상성 정보를 계산합니다. 
    // API 호출이 포함되어 있으므로 완료될 때까지 await로 기다립니다.
    await calculateTypeEffectiveness(pData);

    // 4. 모든 데이터가 준비되면 결과 컨테이너를 보여줍니다.
    resultContainer.classList.remove('hidden');
}

/**
 * 포켓몬 상성 계산 로직 (중복 제거 및 최적화 버전)
 */
async function calculateTypeEffectiveness(data) {
    // 포켓몬이 가진 타입들의 상세 정보 URL 배열을 만듭니다. (예: ['.../type/12/', '.../type/4/'])
    const typeURLs = data.types.map(item => item.type.url);

    // [비동기 학습 포인트] 모든 타입 정보를 병렬로 가져옵니다.
    // 1단계: 각 URL에 대해 fetch를 실행하여 Response 객체 배열을 얻습니다.
    const typeResponses = await Promise.all(typeURLs.map(url => fetch(url)));
    // 2단계: 각 Response를 JSON으로 변환하여 실제 데이터 배열을 얻습니다.
    const typeDataArray = await Promise.all(typeResponses.map(res => res.json()));

    // 상성 배율을 저장할 객체 (key: 타입이름, value: 배율)
    // defenseMultipliers: 방어 시(내가 맞을 때) 받는 피해량
    // attackMultipliers: 공격 시(내가 때릴 때) 주는 피해량
    const defenseMultipliers = {};
    const attackMultipliers = {};

    // API에서 가져온 각 타입의 상성 데이터를 순회하며 계산합니다.
    typeDataArray.forEach(typeData => {
        const damage = typeData.damage_relations;

        // --- 방어 상성 계산 (Double/Half/No damage 'FROM') ---
        // 나에게 2배 피해를 주는 타입들
        damage.double_damage_from.forEach(t => {
            defenseMultipliers[t.name] = (defenseMultipliers[t.name] || 1) * 2;
        });
        // 나에게 0.5배 피해를 주는 타입들
        damage.half_damage_from.forEach(t => {
            defenseMultipliers[t.name] = (defenseMultipliers[t.name] || 1) * 0.5;
        });
        // 나에게 피해를 주지 못하는 타입들
        damage.no_damage_from.forEach(t => {
            defenseMultipliers[t.name] = 0; 
        });

        // --- 공격 상성 계산 (Double/Half/No damage 'TO') ---
        // 내가 2배 피해를 입히는 타입들
        damage.double_damage_to.forEach(t => {
            attackMultipliers[t.name] = (attackMultipliers[t.name] || 1) * 2;
        });
        // 내가 0.5배 피해를 입히는 타입들
        damage.half_damage_to.forEach(t => {
            attackMultipliers[t.name] = (attackMultipliers[t.name] || 1) * 0.5;
        });
        // 내가 피해를 입히지 못하는 타입들
        damage.no_damage_to.forEach(t => {
            attackMultipliers[t.name] = 0;
        });
    });

    // 화면에 결과를 뿌려주는 헬퍼 함수 호출
    // --- [방어] 내가 공격을 받을 때 (From) ---
    // 1. 취약: 받는 데미지 > 1배
    displayEffectiveness('higher-damage-taken-list', defenseMultipliers, (n) => n > 1);
    // 2. 저항: 0 < 받는 데미지 < 1배
    displayEffectiveness('lower-damage-taken-list', defenseMultipliers, (n) => n < 1 && n > 0);
    // 3. 무효: 받는 데미지 = 0
    displayEffectiveness('no-damage-taken-list', defenseMultipliers, (n) => n === 0);

    // --- [공격] 내가 공격을 할 때 (To) ---
    // 4. 효과가 굉장함: 주는 데미지 > 1배
    displayEffectiveness('higher-damage-given-list', attackMultipliers, (n) => n > 1);
    // 5. 효과가 별로임: 0 < 주는 데미지 < 1배
    displayEffectiveness('lower-damage-given-list', attackMultipliers, (n) => n < 1 && n > 0);
    // 6. 효과가 없음: 주는 데미지 = 0
    displayEffectiveness('no-damage-given-list', attackMultipliers, (n) => n === 0);
}

/**
 * 계산된 상성 결과를 HTML에 삽입하는 공통 함수
 * @param {string} containerId - 데이터를 넣을 요소의 ID
 * @param {object} multipliers - 계산된 배율 객체
 * @param {function} filterFn - 어떤 배율을 통과시킬지 결정하는 조건 함수
 */
function displayEffectiveness(containerId, multipliers, filterFn) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // 기존 내용 초기화

    // 객체의 [키, 값] 쌍을 배열로 변환하여 순회합니다.
    Object.entries(multipliers).forEach(([type, factor]) => {
        if (filterFn(factor)) {
            const span = document.createElement('span');
            span.className = 'type-badge';
            span.style.backgroundColor = `var(--type-${type})`;
            // 4배나 0.25배 같은 복합 상성일 경우 배율을 함께 표시해줍니다.
            span.textContent = `${typeNames[type] || type} x${factor}`;
            container.appendChild(span);
        }
    });
}

/**
 * 포켓몬의 기본 정보를 결과 카드에 표시합니다.
 */
function renderPokemonInfo(data) {
    // 고퀄리티 공식 아트워크를 사용하며, 없으면 기본 스프라이트를 사용합니다.
    // pokeSprite.src = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
    // 공식 아트워크 대신 움짤로 변경 (요청에 따라), 없으면 기본 스프라이트를 사용합니다
    pokeSprite.src = data.sprites.other['showdown'].front_default || data.sprites.front_default;

    pokeId.textContent = `#${data.id.toString().padStart(3, '0')}`; // ID를 #001 형식으로 포맷팅
    pokeName.textContent = data.name; // 이름 설정

    pokeTypes.innerHTML = ''; // 기존의 타입 배지들을 비웁니다.
    data.types.forEach(t => {
        const span = document.createElement('span'); // 각 타입을 위한 스팬 생성
        span.className = `type-badge`; // 공용 배지 스타일 적용
        span.style.backgroundColor = `var(--type-${t.type.name})`; // CSS 변수를 사용해 타입 색상 지정
        span.textContent = typeNames[t.type.name]; // 타입 텍스트 설정
        pokeTypes.appendChild(span); // 컨테이너에 배지 추가
    });
}






/** 로딩 스피너 표시 여부를 전환하는 유틸리티입니다. */
function showLoading(show) {
    loadingSpinner.classList.toggle('hidden', !show);
}

/** 결과 및 에러 블록을 숨기는 유틸리티입니다. */
function hideAllSections() {
    resultContainer.classList.add('hidden');
    errorMessage.classList.add('hidden');
}


// --- 이벤트 리스너 및 초기 설정 ---
// 검색 버튼 클릭 이벤트 리스너 등록
searchBtn.addEventListener('click', searchPokemon);

// 검색창 내 엔터 키 입력 리스너 등록
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchPokemon();
});