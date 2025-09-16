// Section home inicio
var hamburguerBtn = document.querySelector('.hamburguer-btn');
var navList = document.querySelector('.nav-list');
var navListItems = document.querySelectorAll('.nav-list li a');

hamburguerBtn.addEventListener('click', activeClass);

function activeClass(){ 
    hamburguerBtn.classList.toggle('active'); //ativa e desativa mediante ao click btnHamburguer 
    navList.classList.toggle('active');
}

for (var i = 0; i < navListItems.length; i++){//Contagem dos items do navlist
    navListItems[i].addEventListener('click', listItemClicked);
}

//Sempre que um item do Navlist for clicado ele sai do background com os items
function listItemClicked (){
    hamburguerBtn.classList.remove('active');
    navList.classList.remove('active');
}

// Section home final