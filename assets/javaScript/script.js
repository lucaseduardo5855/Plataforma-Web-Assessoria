// Section home inicio (mantido fora do DOMContentLoaded, como estava no seu original)
var hamburguerBtn = document.querySelector('.hamburguer-btn');
var navList = document.querySelector('.nav-list');
var navListItems = document.querySelectorAll('.nav-list li a');

hamburguerBtn.addEventListener('click', activeClass);

function activeClass() {
    hamburguerBtn.classList.toggle('active'); //ativa e desativa mediante ao click btnHamburguer 
    navList.classList.toggle('active');
}

for (var i = 0; i < navListItems.length; i++) {//Contagem dos items do navlist
    navListItems[i].addEventListener('click', listItemClicked);
}

//Sempre que um item do Navlist for clicado ele sai do background com os items
function listItemClicked() {
    hamburguerBtn.classList.remove('active');
    navList.classList.remove('active');
}

// Junta todos os blocos DOMContentLoaded em um único
document.addEventListener('DOMContentLoaded', function () {
    // =========================================================
    // 1. CÓDIGO DA NAVBAR E EFEITO SCROLL
    // =========================================================
    const navbar = document.querySelector('.main-navbar');
    const scrollThreshold = 50;

    function toggleNavbarClass() {
        if (window.scrollY > scrollThreshold) {
            navbar.classList.add('scrolled-navbar');
        } else {
            navbar.classList.remove('scrolled-navbar')
        }
    }

    window.addEventListener('scroll', toggleNavbarClass);
    toggleNavbarClass();

    // =========================================================
    // 2. SWIPER SLIDER DA HOME
    // =========================================================
    const homeSwiper = new Swiper('.home-slider', {
        loop: true, // Carrossel infinito
        effect: 'fade', // Efeito de transição: 'fade'
        speed: 1000, // Tempo de transição (1 segundo)

        // Paginação (Bolinhas)
        pagination: {
            el: '.home-pagination',
            clickable: true,
        },

        // Autoplay
        autoplay: {
            delay: 5000, // 5 segundos por slide
            disableOnInteraction: false, // Continua o autoplay
        },
    });

    // =========================================================
    // 3. ANIMAÇÃO DE REVELAÇÃO (MÁSCARA/RISCO - MÚLTIPLOS SLIDES)
    // =========================================================
    const textContainer = document.querySelector('.text-reveal-container');
    const typingElement = document.querySelector('.animated-text');

    // Array de textos a serem animados (Índice 0 = Slide 1, Índice 1 = Slide 2, etc.)
    const animatedTexts = [
        "NASCIDOS PARA CORRER", // Texto para o Slide 1 (realIndex 0)
        "SUPERE SEUS LIMITES",   // Texto para o Slide 2 (realIndex 1)
        "COMECE HOJE MESMO"      // Texto para o Slide 3 (realIndex 2)
    ];


    function handleSlideChange() {
        // 1. Remove a classe de animação e limpa o texto
        textContainer.classList.remove('slide-active-animation');
        typingElement.textContent = '';

        // Obtém o índice real do slide ativo
        const activeIndex = homeSwiper.realIndex;

        // Timeout para garantir que o CSS volte ao estado inicial antes de animar novamente
        setTimeout(() => {
            // 2. Verifica se existe um texto definido para este índice
            if (animatedTexts[activeIndex]) {
                // A) Define o texto
                typingElement.textContent = animatedTexts[activeIndex];

                // B) Dispara a animação CSS (inicia o slide do texto e do risco)
                textContainer.classList.add('slide-active-animation');
            }
            // 3. SE NÃO HOUVER TEXTO DEFINIDO (else), O CAMPO FICARÁ VAZIO, como desejado.
        }, 50); // Pequeno atraso para garantir a redefinição da animação CSS
    }

    // Adiciona o evento para quando a transição do slide terminar
    homeSwiper.on('slideChangeTransitionEnd', handleSlideChange);

    // Inicia o processo no carregamento da página (para animar o slide inicial)
    handleSlideChange();

    // =========================================================
    // 4. SWIPER FEEDBACKS (MANTIDO)
    // =========================================================
    const swiper = new Swiper('.js-testimonials-slider', {
        grabCursor: true,
        spaceBetween: 30,

        autoplay: {
            delay: 4000,
            disableOnInteraction: false,
        },

        pagination: {
            el: '.js-testimonials-pagination',
            clickable: true
        },
        breakpoints: {
            767: {
                slidesPerView: 2
            }
        }
    });

    // =========================================================
    // 5. TABELA DE PREÇOS (MANTIDO)
    // =========================================================
    const priceData = {
        corrida: {
            mensal: { price: "80,00", period: "/mês", currency: "R$" },
            // 30% OFF de R$ 480,00
            semestral: { price: "336,00", period: "/6 meses", currency: "R$" },
            // 40% OFF de R$ 960,00
            anual: { price: "576,00", period: "/ano", currency: "R$" }
        },
        musculacao: {
            mensal: { price: "80,00", period: "/mês", currency: "R$" },
            // 30% OFF de R$ 480,00
            semestral: { price: "336,00", period: "/6 meses", currency: "R$" },
            // 40% OFF de R$ 960,00
            anual: { price: "576,00", period: "/ano", currency: "R$" }
        },
        combo: {
            mensal: { price: "120,00", period: "/mês", currency: "R$" },
            // 30% OFF de R$ 720,00
            semestral: { price: "504,00", period: "/6 meses", currency: "R$" },
            // 40% OFF de R$ 1440,00
            anual: { price: "864,00", period: "/ano", currency: "R$" }
        }
    };

    const tabButtons = document.querySelectorAll('.tabs-navigation .tab-button');
    const priceSpans = document.querySelectorAll('.pricing-card .price');

    function updatePrices(duration) {
        priceSpans.forEach(span => {
            const id = span.id;
            const planName = id.split('-')[1];

            if (priceData[planName] && priceData[planName][duration]) {
                const data = priceData[planName][duration];
                const [reais, centavos] = data.price.split(',');

                span.innerHTML =
                    `<small class="currency-unit">${data.currency}</small>` + // R$
                    ` ${reais}` + // O valor principal grande
                    `<small class="currency-unit">,${centavos}</small>`; // ,00

                document.getElementById(`period-${planName}`).textContent = data.period;
            }
        });
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const newDuration = button.getAttribute('data-duration');
            updatePrices(newDuration);
        });
    });

    updatePrices('mensal');
});

// =========================================================
// 6. WHATSAPP DINÂMICO (NOVO)
// =========================================================

// Certifique-se de que o número e o ?text= estão corretos
const whatsappBaseUrl = "https://wa.me/5543996905705?text="; 
const whatsappButtons = document.querySelectorAll('.btn-choose-link'); 

whatsappButtons.forEach(link => {
    link.addEventListener('click', (event) => { 
        
        event.preventDefault(); // Impede a navegação para #
        
        // Coleta de Dados
        const planName = link.getAttribute('data-plan-name');
        const activeDuration = document.querySelector('.tab-button.active').getAttribute('data-duration');

        let planSelector;
        if (planName === "Corrida + Musculação") {
            planSelector = 'combo'; // Usa o ID 'combo'
        } else if (planName === "Corrida") {
             planSelector = 'corrida'; // Usa o ID 'corrida'
        } else {
             planSelector = 'musculacao'; // Usa o ID 'musculacao'
        }
        
        // Monta o seletor para pegar o preço dinâmico no DOM
        const priceElement = document.getElementById(`price-${planSelector}`); 
        const periodElement = document.getElementById(`period-${planSelector}`);

        // Extrai e formata o preço (ex: R$ 504,00 /6 meses)
        let currentPriceValue = 'preço não encontrado';
        if (priceElement && periodElement) {
            const priceText = priceElement.textContent.replace('R$', '').trim();
            const periodText = periodElement.textContent.trim();
            currentPriceValue = `R$ ${priceText} ${periodText}`;
        }
        
        // Lógica para montar a mensagem (ex: Saber mais vs. Escolher)
        let message = '';
        if (planName === "Corrida" || planName === "Musculação") {
            message = `Olá! Gostaria de saber mais sobre o plano ${planName} (${activeDuration}). No valor de ${currentPriceValue}.`;
        } else {
            message = `Olá! Gostaria de escolher o plano ${planName} (${activeDuration}). O preço é ${currentPriceValue}.`;
        }

        // Codifica a mensagem e abre o WhatsApp
        const encodedMessage = encodeURIComponent(message);
        window.open(whatsappBaseUrl + encodedMessage, '_blank');
    });
});