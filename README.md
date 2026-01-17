# Z4 Assessoria System

Sistema completo de gestão para a assessoria esportiva **Z4 Performance**, focado em corrida e musculação. O sistema permite o gerenciamento de alunos, treinos, avaliações físicas e pagamentos.

## 🚀 Tecnologias Utilizadas

### Frontend
- **React** (v18)
- **Material UI (MUI)** - Biblioteca de componentes
- **Recharts** & **Chart.js** - Visualização de dados e gráficos
- **React Router** - Navegação
- **Axios** - Requisições HTTP

### Backend
- **Node.js** & **Express**
- **Prisma ORM** - Gerenciamento de banco de dados
- **SQLite** - Banco de dados (configuração padrão)
- **JWT** - Autenticação segura
- **Joi** - Validação de dados
- **jspdf** - Geração de relatórios PDF

## 📦 Instalação e Configuração

Pré-requisitos: Certifique-se de ter o **Node.js** instalado em sua máquina.

1. **Clone o repositório**
   ```bash
   git clone https://github.com/lucaseduardo5855/Plataforma-Web-Assessoria.git
   cd Plataforma-Web-Assessoria
   ```

2. **Instalação Automática**
   O projeto possui um script facilitador que instala todas as dependências (raiz, backend e frontend) e configura o banco de dados.
   ```bash
   npm run setup
   ```
   
   > **Nota:** Caso prefira instalar manualmente, execute `npm install` na raiz, na pasta `backend` e na pasta `frontend`.

## 🛠️ Como Rodar

Para iniciar o projeto em ambiente de desenvolvimento (Backend + Frontend simultaneamente):

```bash
npm run dev
```

- O **Backend** rodará na porta definida (padrão `3000` ou similar, verifique `.env`).
- O **Frontend** rodará geralmente em `http://localhost:3000` (ou `3001` se houver conflito).

## 📂 Estrutura do Projeto

- **/backend**: Código fonte da API, models do Prisma, controllers e rotas.
- **/frontend**: Aplicação React, componentes, páginas e estilos.
- **/docs**: Documentação adicional.

---
Desenvolvido por Lucas Eduardo.
