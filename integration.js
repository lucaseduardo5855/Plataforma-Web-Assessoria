// Configuração para integração com a landing page existente

(function() {
  // Função para redirecionar para o sistema
  function redirectToSystem() {
    // Verificar se o usuário está logado
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        // Redirecionar baseado no tipo de usuário
        if (userData.role === 'ADMIN') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      } catch (error) {
        // Dados corrompidos, limpar e ir para login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } else {
      // Não logado, ir para login
      window.location.href = '/login';
    }
  }

  // Adicionar evento aos botões "Área do Atleta" na landing page
  document.addEventListener('DOMContentLoaded', function() {
    // Encontrar todos os botões "Área do Atleta"
    const areaButtons = document.querySelectorAll('.btn-join-us, .btn-noticia-btn');
    
    areaButtons.forEach(button => {
      if (button.textContent && button.textContent.includes('Área do Atleta')) {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          redirectToSystem();
        });
      }
    });

    // Também adicionar aos botões "Área do Aluno"
    const alunoButtons = document.querySelectorAll('button, a');
    alunoButtons.forEach(button => {
      if (button.textContent && button.textContent.includes('Área do Aluno')) {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          redirectToSystem();
        });
      }
    });
  });

  // Função para logout (pode ser chamada de qualquer lugar)
  window.logoutFromSystem = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Função para verificar se o usuário está logado
  window.isLoggedIn = function() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  };

  // Função para obter dados do usuário logado
  window.getCurrentUser = function() {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        return JSON.parse(user);
      } catch (error) {
        return null;
      }
    }
    return null;
  };
})();
