// =========================================================
// CÓDIGO JS COMPLETO
// =========================================================

// =========================================================
// 0. NAVEGAÇÃO MOBILE E HAMBURGUER
// (Mantido fora do DOMContentLoaded, como estava no seu original)
// =========================================================
var hamburguerBtn = document.querySelector('.hamburguer-btn');
var navList = document.querySelector('.nav-list');
var navListItems = document.querySelectorAll('.nav-list li a');
var closeMenuBtn = document.querySelector('.close-menu-btn'); // Verifique se esta classe existe no seu HTML

if (hamburguerBtn) {
    hamburguerBtn.addEventListener('click', activeClass);
}
if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', closeMenu);
}

function activeClass() {
    hamburguerBtn.classList.add('active');
    navList.classList.add('active');
}

function closeMenu() {
    hamburguerBtn.classList.remove('active');
    navList.classList.remove('active');
}

for (var i = 0; i < navListItems.length; i++) {
    navListItems[i].addEventListener('click', listItemClicked);
}

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
        loop: true,
        effect: 'fade',
        speed: 500, // Transição da foto (rápida)

        pagination: {
            el: '.home-pagination',
            clickable: true,
        },

        autoplay: {
            delay: 6000, // Tempo que cada frase fica na tela
            disableOnInteraction: false,
        },
    });

    // =========================================================
    // 3. ANIMAÇÃO DE REVELAÇÃO (TODAS AS FRASES COM A MESMA VELOCIDADE)
    // =========================================================
    const textContainer = document.querySelector('.text-reveal-container');
    const typingElement = document.querySelector('.animated-text');

    const animatedTexts = [
        "NASCIDOS PARA CORRER", // Texto para o Slide 1 (realIndex 0)
        "SUPERE SEUS LIMITES",   // Texto para o Slide 2 (realIndex 1)
        "COMECE HOJE MESMO"      // Texto para o Slide 3 (realIndex 2)
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

                // B) Dispara a animação CSS (TODAS USAM A MESMA VELOCIDADE DO CSS)
                textContainer.classList.add('slide-active-animation');
            }
        }, 50);
    }

    homeSwiper.on('slideChangeTransitionEnd', handleSlideChange);
    handleSlideChange(); // Inicia o processo no carregamento

    // =========================================================
    // 4. SWIPER FEEDBACKS
    // =========================================================
    const swiper = new Swiper('.js-testimonials-slider', {
        grabCursor: true,
        spaceBetween: 30,

        autoplay: {
            delay: 6000,
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
    // 5. TABELA DE PREÇOS E ATUALIZAÇÃO DE ABAS
    // =========================================================
    const priceData = {
        corrida: {
            mensal: { price: "80,00", period: "/mês", currency: "R$" },
            semestral: { price: "336,00", period: "/6 meses", currency: "R$" },
            anual: { price: "576,00", period: "/ano", currency: "R$" }
        },
        musculacao: {
            mensal: { price: "80,00", period: "/mês", currency: "R$" },
            semestral: { price: "336,00", period: "/6 meses", currency: "R$" },
            anual: { price: "576,00", period: "/ano", currency: "R$" }
        },
        combo: {
            mensal: { price: "120,00", period: "/mês", currency: "R$" },
            semestral: { price: "504,00", period: "/6 meses", currency: "R$" },
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
                    `<small class="currency-unit">${data.currency}</small>` +
                    ` ${reais}` +
                    `<small class="currency-unit">,${centavos}</small>`;

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

    // =========================================================
    // 6. Animação de entrada por rolagem
    // =========================================================
    const sectionsToReveal = document.querySelectorAll('section:not(.home)');

    const scrollRevealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2
    });

    sectionsToReveal.forEach(section => {
        section.classList.add('scroll-reveal');
        scrollRevealObserver.observe(section);
    });

    // =========================================================
    // 7. WHATSAPP DINÂMICO
    // =========================================================

    const whatsappBaseUrl = "https://wa.me/5543996905705?text=";
    const whatsappButtons = document.querySelectorAll('.btn-choose-link');

    whatsappButtons.forEach(link => {
        link.addEventListener('click', (event) => {

            event.preventDefault();

            // Coleta de Dados
            const planName = link.getAttribute('data-plan-name');
            const activeDuration = document.querySelector('.tab-button.active').getAttribute('data-duration');

            // Determinar o seletor do ID do plano (combo, corrida, musculacao)
            let planSelector;
            if (planName === "Corrida + Musculação") {
                planSelector = 'combo';
            } else if (planName === "Corrida") {
                planSelector = 'corrida';
            } else {
                planSelector = 'musculacao';
            }

            // Monta o seletor para pegar o preço dinâmico no DOM (usando ID)
            const priceElement = document.getElementById(`price-${planSelector}`);
            const periodElement = document.getElementById(`period-${planSelector}`);

            // Extrai e formata o preço
            let currentPriceValue = 'preço não encontrado';
            if (priceElement && periodElement) {
                const priceText = priceElement.textContent.replace('R$', '').trim();
                const periodText = periodElement.textContent.trim();
                currentPriceValue = `R$ ${priceText} ${periodText}`;
            }

            // Lógica para montar a mensagem
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
});