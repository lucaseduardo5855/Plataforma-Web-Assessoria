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
const updateProfileSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).optional(),
    phone: joi_1.default.string().optional(),
    birthDate: joi_1.default.date().optional(),
    height: joi_1.default.number().positive().optional(),
    weight: joi_1.default.number().positive().optional(),
    goals: joi_1.default.string().optional(),
    limitations: joi_1.default.string().optional()
});
router.get('/students', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 1000, search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = search ? {
        role: 'STUDENT',
        OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
        ]
    } : { role: 'STUDENT' };
    const [students, total] = await Promise.all([
        prisma.user.findMany({
            where,
            include: {
                studentProfile: true,
                workouts: {
                    take: 5,
                    orderBy: { completedAt: 'desc' }
                }
            },
            skip,
            take: Number(limit),
            orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
    ]);
    const studentsWithoutPasswords = students.map((student) => {
        const { password, ...studentWithoutPassword } = student;
        return studentWithoutPassword;
    });
    res.json({
        students: studentsWithoutPasswords,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
}));
router.get('/profile', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
            studentProfile: true,
            workouts: {
                take: 10,
                orderBy: { completedAt: 'desc' }
            },
            evaluations: {
                take: 5,
                orderBy: { evaluatedAt: 'desc' }
            }
        }
    });
    if (!user) {
        throw (0, errorHandler_1.createError)('Usuário não encontrado', 404);
    }
    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
}));
router.put('/profile', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    const { height, weight, goals, limitations, ...userData } = value;
    const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: userData,
        include: {
            studentProfile: true
        }
    });
    if (height || weight || goals || limitations) {
        await prisma.studentProfile.upsert({
            where: { userId: req.user.id },
            update: {
                height,
                weight,
                goals,
                limitations
            },
            create: {
                userId: req.user.id,
                height,
                weight,
                goals,
                limitations
            }
        });
    }
    const { password, ...userWithoutPassword } = updatedUser;
    res.json({
        message: 'Perfil atualizado com sucesso',
        user: userWithoutPassword
    });
}));
router.get('/students/:id', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const student = await prisma.user.findUnique({
        where: { id },
        include: {
            studentProfile: true,
            workouts: {
                orderBy: { completedAt: 'desc' }
            },
            evaluations: {
                orderBy: { evaluatedAt: 'desc' }
            },
            eventAttendances: {
                include: {
                    event: true
                }
            }
        }
    });
    if (!student || student.role !== 'STUDENT') {
        throw (0, errorHandler_1.createError)('Aluno não encontrado', 404);
    }
    const { password, ...studentWithoutPassword } = student;
    res.json({ student: studentWithoutPassword });
}));
router.put('/students/:id', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    const updatedUser = await prisma.user.update({
        where: { id },
        data: value,
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            birthDate: true,
            role: true,
            studentProfile: true,
            createdAt: true
        }
    });
    res.json({
        message: 'Aluno atualizado com sucesso',
        user: updatedUser
    });
}));
router.delete('/students/:id', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const student = await prisma.user.findUnique({
        where: { id }
    });
    if (!student || student.role !== 'STUDENT') {
        throw (0, errorHandler_1.createError)('Aluno não encontrado', 404);
    }
    await prisma.user.delete({
        where: { id }
    });
    res.json({ message: 'Aluno deletado com sucesso' });
}));
router.get('/stats', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const [totalStudents, totalWorkouts, totalEvents, recentWorkouts] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.workout.count(),
        prisma.event.count(),
        prisma.workout.findMany({
            take: 10,
            orderBy: { completedAt: 'desc' },
            include: {
                user: {
                    select: { name: true }
                }
            }
        })
    ]);
    res.json({
        totalStudents,
        totalWorkouts,
        totalEvents,
        recentWorkouts
    });
}));
exports.default = router;
//# sourceMappingURL=users.js.map