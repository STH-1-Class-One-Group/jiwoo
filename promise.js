searchBtn.addEventListener('click', () => {
    const name = input.value.toLowerCase();

    fetch(`https://pokeapi.co/api/v2/pokemon/${name}`)
        .then(response => {
            if (!response.ok) throw new Error();
            return response.json();
        })
        .then(data => {
            pokemonName.textContent = data.name.toUpperCase();
            pokemonImg.src = data.sprites.front_default;
        })
        .catch(() => alert('포켓몬을 찾을 수 없습니다!'));
});