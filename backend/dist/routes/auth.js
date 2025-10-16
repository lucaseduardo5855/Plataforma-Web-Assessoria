"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required()
});
const registerSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
    name: joi_1.default.string().min(2).required(),
    phone: joi_1.default.string().optional(),
    birthDate: joi_1.default.date().optional(),
    role: joi_1.default.string().valid('STUDENT', 'ADMIN').default('STUDENT')
});
router.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    const { email, password } = value;
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            studentProfile: true
        }
    });
    if (!user) {
        throw (0, errorHandler_1.createError)('Email ou senha incorretos', 401);
    }
    const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
    if (!isValidPassword) {
        throw (0, errorHandler_1.createError)('Email ou senha incorretos', 401);
    }
    const token = jsonwebtoken_1.default.sign({
        userId: user.id,
        email: user.email,
        role: user.role
    }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({
        message: 'Login realizado com sucesso',
        token,
        user: userWithoutPassword
    });
}));
router.post('/register', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    const { email, password, name, phone, birthDate, role } = value;
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });
    if (existingUser) {
        throw (0, errorHandler_1.createError)('Email já cadastrado', 400);
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 12);
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            phone,
            birthDate,
            role: role || 'STUDENT'
        }
    });
    if (role === 'STUDENT' || !role) {
        await prisma.studentProfile.create({
            data: {
                userId: user.id
            }
        });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: userWithoutPassword
    });
}));
router.get('/verify', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
            studentProfile: true
        }
    });
    if (!user) {
        throw (0, errorHandler_1.createError)('Usuário não encontrado', 404);
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({
        user: userWithoutPassword
    });
}));
router.post('/logout', (req, res) => {
    res.json({ message: 'Logout realizado com sucesso' });
});
exports.default = router;
//# sourceMappingURL=auth.js.map