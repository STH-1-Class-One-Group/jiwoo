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

const weaknessList = document.getElementById('weakness-list'); // 포켓몬이 취약한 타입 (> 1배 피해) 그리드
const resistanceList = document.getElementById('resistance-list'); // 포켓몬이 저항하는 타입 (< 1배 피해) 그리드
const immunityList = document.getElementById('immunity-list'); // 포켓몬이 무효화하는 타입 (0배 피해) 그리드



// 타입 이름 데이터. 매번 API에서 가져오면 느리기 때문에 상수로 정의합니다.
const typeNames = {
    normal: 'Normal', fire: 'Fire', water: 'Water', electric: 'Electric', grass: 'Grass', ice: 'Ice',
    fighting: 'Fighting', poison: 'Poison', ground: 'Ground', flying: 'Flying', psychic: 'Psychic',
    bug: 'Bug', rock: 'Rock', ghost: 'Ghost', dragon: 'Dragon', dark: 'Dark', steel: 'Steel', fairy: 'Fairy'
};

searchBtn.addEventListener('click', async () => {
    const name = searchInput.value.toLowerCase();

    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        if (!response.ok) throw new Error();

        const data = await response.json();
        
        pokeName.textContent = data.name.toUpperCase();
        pokeSprite.src = data.sprites.front_default;
    } catch (error) {
        alert('포켓몬을 찾을 수 없습니다!');
    }
});


