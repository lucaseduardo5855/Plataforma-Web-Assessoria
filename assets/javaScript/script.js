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

document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.querySelector('.main-navbar');
    const scrollThreshold = 50;

    function toggleNavbarClass(){
        if(window.scrollY > scrollThreshold){
            navbar.classList.add('scrolled-navbar');
        }else {
            navbar.classList.remove('scrolled-navbar')
        }
    }

    window.addEventListener('scroll', toggleNavbarClass); // Adiciona o listener de evento para scroll
    toggleNavbarClass(); // Garante que o estado seja verificado na hora do carregamento
})

// Section home final