const searchBtn = document.getElementById('search-btn');
const input = document.getElementById('pokemon-search');
const pokemonName = document.querySelector('h2');
const pokemonImg = document.querySelector('img');
const usertype = document.querySelector('.user_pockmon_type'); 
const weaktype = document.querySelector('.weak_type');
const resisttype = document.querySelector('.weak_type');

searchBtn.addEventListener('click', async () => {
    const name = input.value.toLowerCase();

    try {

        // 이름, 이미지 생성
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        if (!response.ok) throw new Error();

        const data = await response.json();
        
        // 포켓몬 이름 가져오기
        pokemonName.textContent = data.name.toUpperCase();
        // 포켓몬 image 가져오기
        pokemonImg.src = data.sprites.front_default;

        // 상성 가져오기
        
        const typeName = data.types.map(item => item.type.name);
        const typeURL = data.types.map(item => item.type.url);

        usertype.textContent = typeName.join(', ');
        

    } catch (error) {
        alert('포켓몬을 찾을 수 없습니다!');
    }

});