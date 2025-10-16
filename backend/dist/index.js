"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const workouts_1 = __importDefault(require("./routes/workouts"));
const events_1 = __importDefault(require("./routes/events"));
const evaluations_1 = __importDefault(require("./routes/evaluations"));
const errorHandler_1 = require("./middleware/errorHandler");
const auth_2 = require("./middleware/auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 5000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://seudominio.com']
        : ['http://localhost:3000'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/auth', auth_1.default);
app.use('/api/users', auth_2.authenticateToken, users_1.default);
app.use('/api/workouts', auth_2.authenticateToken, workouts_1.default);
app.use('/api/events', auth_2.authenticateToken, events_1.default);
app.use('/api/evaluations', auth_2.authenticateToken, evaluations_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});
app.use(errorHandler_1.errorHandler);
const startServer = async () => {
    try {
        await prisma.$connect();
        console.log('✅ Conectado ao banco de dados PostgreSQL');
        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
            console.log(`📱 Ambiente: ${process.env.NODE_ENV}`);
        });
    }
    catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
};
process.on('SIGINT', async () => {
    console.log('\n🛑 Encerrando servidor...');
    await prisma.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n🛑 Encerrando servidor...');
    await prisma.$disconnect();
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map