"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const evaluationSchema = joi_1.default.object({
    type: joi_1.default.string().valid('INITIAL', 'MONTHLY', 'FINAL').required(),
    weight: joi_1.default.number().positive().optional(),
    height: joi_1.default.number().positive().optional(),
    bodyFat: joi_1.default.number().min(0).max(100).optional(),
    muscleMass: joi_1.default.number().positive().optional(),
    notes: joi_1.default.string().optional()
});
router.post('/', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = evaluationSchema.validate(req.body);
    if (error) {
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    const { userId, ...evaluationData } = req.body;
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });
    if (!user) {
        throw (0, errorHandler_1.createError)('Usuário não encontrado', 404);
    }
    const evaluation = await prisma.evaluation.create({
        data: {
            ...evaluationData,
            userId
        },
        include: {
            user: {
                select: { name: true, email: true }
            }
        }
    });
    res.status(201).json({
        message: 'Avaliação criada com sucesso',
        evaluation
    });
}));
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 10, userId, type } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};
    if (req.user?.role === 'ADMIN') {
        if (userId)
            where.userId = userId;
    }
    else {
        where.userId = req.user.id;
    }
    if (type)
        where.type = type;
    const [evaluations, total] = await Promise.all([
        prisma.evaluation.findMany({
            where,
            include: {
                user: {
                    select: { name: true, email: true }
                }
            },
            skip,
            take: Number(limit),
            orderBy: { evaluatedAt: 'desc' }
        }),
        prisma.evaluation.count({ where })
    ]);
    res.json({
        evaluations,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
}));
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const evaluation = await prisma.evaluation.findUnique({
        where: { id },
        include: {
            user: {
                select: { name: true, email: true }
            }
        }
    });
    if (!evaluation) {
        throw (0, errorHandler_1.createError)('Avaliação não encontrada', 404);
    }
    if (req.user?.role !== 'ADMIN' && evaluation.userId !== req.user?.id) {
        throw (0, errorHandler_1.createError)('Acesso negado', 403);
    }
    res.json({ evaluation });
}));
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error, value } = evaluationSchema.validate(req.body);
    if (error) {
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    const evaluation = await prisma.evaluation.update({
        where: { id },
        data: value,
        include: {
            user: {
                select: { name: true, email: true }
            }
        }
    });
    res.json({
        message: 'Avaliação atualizada com sucesso',
        evaluation
    });
}));
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    await prisma.evaluation.delete({
        where: { id }
    });
    res.json({ message: 'Avaliação deletada com sucesso' });
}));
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            studentProfile: true
        }
    });
    if (!user) {
        throw (0, errorHandler_1.createError)('Usuário não encontrado', 404);
    }
    const evaluations = await prisma.evaluation.findMany({
        where: { userId },
        orderBy: { evaluatedAt: 'asc' }
    });
    const evolution = evaluations.map((item, index) => {
        const previous = index > 0 ? evaluations[index - 1] : null;
        return {
            ...item,
            weightChange: previous ? item.weight - previous.weight : 0,
            bodyFatChange: previous ? item.bodyFat - previous.bodyFat : 0,
            muscleMassChange: previous ? item.muscleMass - previous.muscleMass : 0
        };
    });
    res.json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            studentProfile: user.studentProfile
        },
        evaluations: evolution
    });
}));
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const evaluations = await prisma.evaluation.findMany({
        where: { userId: req.user.id },
        orderBy: { evaluatedAt: 'asc' }
    });
    const evolution = evaluations.map((item, index) => {
        const previous = index > 0 ? evaluations[index - 1] : null;
        return {
            ...item,
            weightChange: previous ? item.weight - previous.weight : 0,
            bodyFat: evaluations.map((e) => ({
                date: e.evaluatedAt,
                value: e.bodyFat
            })).filter((d) => d.value !== null),
            muscleMass: evaluations.map((e) => ({
                date: e.evaluatedAt,
                value: e.muscleMass
            })).filter((d) => d.value !== null)
        };
    });
    res.json({ evaluations: evolution });
}));
router.get('/stats/overview', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const [totalEvaluations, evaluationsByType, recentEvaluations, averageBodyFat, averageMuscleMass] = await Promise.all([
        prisma.evaluation.count(),
        prisma.evaluation.groupBy({
            by: ['type'],
            _count: { type: true }
        }),
        prisma.evaluation.findMany({
            take: 10,
            orderBy: { evaluatedAt: 'desc' },
            include: {
                user: {
                    select: { name: true }
                }
            }
        }),
        prisma.evaluation.aggregate({
            _avg: { bodyFat: true }
        }),
        prisma.evaluation.aggregate({
            _avg: { muscleMass: true }
        })
    ]);
    res.json({
        totalEvaluations,
        evaluationsByType,
        recentEvaluations,
        averageBodyFat: averageBodyFat._avg.bodyFat,
        averageMuscleMass: averageMuscleMass._avg.muscleMass
    });
}));
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const evaluations = await prisma.evaluation.findMany({
        where: { userId },
        orderBy: { evaluatedAt: 'asc' }
    });
    const chartData = {
        weight: evaluations.map((e) => ({
            date: e.evaluatedAt,
            value: e.weight
        })).filter((d) => d.value !== null),
        bodyFat: evaluations.map((e) => ({
            date: e.evaluatedAt,
            value: e.bodyFat
        })).filter((d) => d.value !== null),
        muscleMass: evaluations.map((e) => ({
            date: e.evaluatedAt,
            value: e.bodyFat
        })).filter((d) => d.value !== null),
    };
    res.json({ chartData });
}));
exports.default = router;
//# sourceMappingURL=evaluations.js.map