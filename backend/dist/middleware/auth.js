"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStudent = exports.requireAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                error: 'Token de acesso necessário'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true }
        });
        if (!user) {
            return res.status(401).json({
                error: 'Usuário não encontrado'
            });
        }
        req.user = user;
        return next();
    }
    catch (error) {
        console.error('Erro na autenticação:', error);
        return res.status(403).json({
            error: 'Token inválido'
        });
    }
};
exports.authenticateToken = authenticateToken;
const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
            error: 'Acesso negado. Apenas administradores.'
        });
    }
    return next();
};
exports.requireAdmin = requireAdmin;
const requireStudent = (req, res, next) => {
    if (req.user?.role !== 'STUDENT') {
        return res.status(403).json({
            error: 'Acesso negado. Apenas alunos.'
        });
    }
    return next();
};
exports.requireStudent = requireStudent;
//# sourceMappingURL=auth.js.map