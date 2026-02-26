const searchBtn = document.getElementById('search-btn');
const input = document.getElementById('pokemon-search');
const pokemonName = document.querySelector('h2');
const pokemonImg = document.querySelector('img');

searchBtn.addEventListener('click', () => {
    const name = input.value.toLowerCase();
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `https://pokeapi.co/api/v2/pokemon/${name}`);
    
    xhr.onload = function() {
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            // 화면에 데이터 넣기
            pokemonName.textContent = data.name.toUpperCase();
            pokemonImg.src = data.sprites.front_default;
        } else {
            alert('포켓몬을 찾을 수 없습니다!');
        }
    };
    xhr.send();
});