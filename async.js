searchBtn.addEventListener('click', async () => {
    const name = input.value.toLowerCase();

    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        if (!response.ok) throw new Error();

        const data = await response.json();
        
        pokemonName.textContent = data.name.toUpperCase();
        pokemonImg.src = data.sprites.front_default;
    } catch (error) {
        alert('포켓몬을 찾을 수 없습니다!');
    }
});