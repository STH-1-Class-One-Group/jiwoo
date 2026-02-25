const searchBtn = document.getElementById('search-btn');
const input = document.getElementById('pokemon-search');
const pokemonName = document.querySelector('h2');
const pokemonImg = document.querySelector('img');
const usertype = document.querySelector('.user_pockmon_type'); 
const weaktype = document.querySelector('.weak_type');
const resisttype = document.querySelector('.resist_type');

searchBtn.addEventListener('click', async () => {
    const name = input.value.toLowerCase();

    
    try {

        // 이름, 이미지 생성
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
            // console.log(reponse.ok)
        if (!response.ok) throw new Error();

        const data = await response.json();
        
        // 포켓몬 이름 가져오기
        pokemonName.textContent = data.name.toUpperCase();
        // 포켓몬 image 가져오기
        pokemonImg.src = data.sprites.front_default;

        // 포켓몬 타입 가져오기
        const typeName = data.types.map(item => item.type.name);
        usertype.textContent = typeName.join(' ');

        // 포켓몬 상성
        const typeURLs = data.types.map(item => item.type.url);

        //상성 가져오기
        const typeResponse = await Promise.all(typeURLs.map(url => fetch(url)))
        const typeData = await Promise.all(typeResponse.map(res => res.json()))

        //배울을 담을 딕셔너리 생성
        const damageSum = {}; 


        typeData.forEach(Intype => {
            // 데미지 검사하는 로직
            const damage_cal = Intype.damage_relations;

            // 데미지 X2
            // damageSum에 아무것도 없으면 1이 곱해지고
            // 안에 있으면 안에 있는 내용에서 곱해짐
            damage_cal.double_damage_from.forEach(t => {
                // 이미 바구니에 점수가 있으면 곱하고, 없으면 1에다가 2를 곱함
                damageSum[t.name] = (damageSum[t.name] || 1) * 2;
            });

            // 데미지 X0.5
            damage_cal.half_damage_from.forEach(t => {
                damageSum[t.name] = (damageSum[t.name] || 1) * 0.5;
            });

            // 노데미지
            damage_cal.no_damage_from.forEach(t => {
                damageSum[t.name] = 0; // 무효는 무조건 0!
            });
        });
        //취약 
        const weak = []
        //저항
        const resist = []

        //객체를 배열로 수정
        //반복문을 통해 
        for (const [type, num] of Object.entries(damageSum)){
            if(num >1){
                weak.push(`${type}`)
            }
            if(num < 1 ){
                resist.push(`${type}`)
            }
            

        }
        resisttype.textContent = `저항 - ${resist.join(', ')}`;
        weaktype.textContent = `취약 - ${weak.join(', ')}`;

    } catch (error) {
        alert('포켓몬을 찾을 수 없습니다!');
    }

});