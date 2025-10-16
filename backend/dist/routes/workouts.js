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
const jspdf_1 = __importDefault(require("jspdf"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const workoutPlanSchema = joi_1.default.object({
    title: joi_1.default.string().min(3).required(),
    description: joi_1.default.string().optional(),
    modality: joi_1.default.string().valid('RUNNING', 'MUSCLE_TRAINING', 'FUNCTIONAL', 'TRAIL_RUNNING').required(),
    type: joi_1.default.string().optional(),
    courseType: joi_1.default.string().optional(),
    status: joi_1.default.string().valid('PROPOSED', 'ACTIVE', 'COMPLETED', 'CANCELLED').default('PROPOSED'),
    order: joi_1.default.number().optional(),
    isFavorite: joi_1.default.boolean().default(false),
    workoutDate: joi_1.default.date().required(),
    userId: joi_1.default.string().optional(),
    exercises: joi_1.default.array().items(joi_1.default.object({
        sequence: joi_1.default.number().optional(),
        name: joi_1.default.string().optional(),
        description: joi_1.default.string().optional(),
        sets: joi_1.default.number().optional(),
        reps: joi_1.default.number().optional(),
        load: joi_1.default.number().optional(),
        interval: joi_1.default.string().optional(),
        instruction: joi_1.default.string().optional(),
        observation: joi_1.default.string().optional()
    })).optional()
});
const workoutRecordSchema = joi_1.default.object({
    modality: joi_1.default.string().valid('RUNNING', 'MUSCLE_TRAINING', 'FUNCTIONAL', 'TRAIL_RUNNING').required(),
    type: joi_1.default.string().optional(),
    courseType: joi_1.default.string().optional(),
    duration: joi_1.default.number().optional(),
    distance: joi_1.default.number().optional(),
    pace: joi_1.default.string().optional(),
    calories: joi_1.default.number().optional(),
    notes: joi_1.default.string().optional()
});
router.post('/plans', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = workoutPlanSchema.validate(req.body);
    if (error) {
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    const { exercises, userId, ...planData } = value;
    const workoutPlan = await prisma.workoutPlan.create({
        data: planData,
        include: {
            exercises: true
        }
    });
    if (exercises && exercises.length > 0) {
        await prisma.exercise.createMany({
            data: exercises.map((exercise) => ({
                ...exercise,
                workoutPlanId: workoutPlan.id
            }))
        });
        const planWithExercises = await prisma.workoutPlan.findUnique({
            where: { id: workoutPlan.id },
            include: {
                exercises: {
                    orderBy: { sequence: 'asc' }
                }
            }
        });
        return res.status(201).json({
            message: 'Planilha criada com sucesso',
            workoutPlan: planWithExercises
        });
    }
    if (userId) {
        await prisma.workout.create({
            data: {
                userId: userId,
                workoutPlanId: workoutPlan.id,
                modality: planData.modality,
                type: planData.type || null,
                courseType: planData.courseType || null,
                completedAt: new Date()
            }
        });
    }
    return res.status(201).json({
        message: 'Planilha criada com sucesso',
        workoutPlan
    });
}));
router.get('/user/:userId', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10, modality, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { userId };
    if (modality)
        where.modality = modality;
    if (startDate || endDate) {
        where.completedAt = {};
        if (startDate)
            where.completedAt.gte = new Date(startDate);
        if (endDate)
            where.completedAt.lte = new Date(endDate);
    }
    const [workouts, total] = await Promise.all([
        prisma.workout.findMany({
            where,
            include: {
                workoutPlan: {
                    select: { title: true, modality: true }
                }
            },
            skip,
            take: Number(limit),
            orderBy: { completedAt: 'desc' }
        }),
        prisma.workout.count({ where })
    ]);
    res.json({
        data: workouts,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
    });
}));
router.get('/plans', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 10, modality, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};
    if (modality)
        where.modality = modality;
    if (status)
        where.status = status;
    const [plans, total] = await Promise.all([
        prisma.workoutPlan.findMany({
            where,
            include: {
                exercises: {
                    orderBy: { sequence: 'asc' }
                },
                workouts: {
                    take: 5,
                    orderBy: { completedAt: 'desc' }
                }
            },
            skip,
            take: Number(limit),
            orderBy: { workoutDate: 'desc' }
        }),
        prisma.workoutPlan.count({ where })
    ]);
    res.json({
        plans,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
}));
router.get('/plans/:id', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const plan = await prisma.workoutPlan.findUnique({
        where: { id },
        include: {
            exercises: {
                orderBy: { sequence: 'asc' }
            },
            workouts: {
                include: {
                    user: {
                        select: { name: true }
                    }
                },
                orderBy: { completedAt: 'desc' }
            }
        }
    });
    if (!plan) {
        throw (0, errorHandler_1.createError)('Planilha não encontrada', 404);
    }
    res.json({ workoutPlan: plan });
}));
router.put('/plans/:id', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error, value } = workoutPlanSchema.validate(req.body);
    if (error) {
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    const { exercises, ...planData } = value;
    const updatedPlan = await prisma.workoutPlan.update({
        where: { id },
        data: planData,
        include: {
            exercises: {
                orderBy: { sequence: 'asc' }
            }
        }
    });
    if (exercises) {
        await prisma.exercise.deleteMany({
            where: { workoutPlanId: id }
        });
        if (exercises.length > 0) {
            await prisma.exercise.createMany({
                data: exercises.map((exercise) => ({
                    ...exercise,
                    workoutPlanId: id
                }))
            });
        }
        const planWithExercises = await prisma.workoutPlan.findUnique({
            where: { id },
            include: {
                exercises: {
                    orderBy: { sequence: 'asc' }
                }
            }
        });
        return res.json({
            message: 'Planilha atualizada com sucesso',
            workoutPlan: planWithExercises
        });
    }
    return res.json({
        message: 'Planilha atualizada com sucesso',
        workoutPlan: updatedPlan
    });
}));
router.delete('/plans/:id', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    await prisma.workoutPlan.delete({
        where: { id }
    });
    res.json({ message: 'Planilha deletada com sucesso' });
}));
router.post('/record', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = workoutRecordSchema.validate(req.body);
    if (error) {
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    const workout = await prisma.workout.create({
        data: {
            ...value,
            userId: req.user.id
        }
    });
    await prisma.studentProfile.update({
        where: { userId: req.user.id },
        data: {
            totalWorkouts: { increment: 1 },
            totalCalories: { increment: value.calories || 0 },
            totalDistance: { increment: value.distance || 0 }
        }
    });
    res.status(201).json({
        message: 'Treino registrado com sucesso',
        workout
    });
}));
router.get('/my-workouts', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 10, modality, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { userId: req.user.id };
    if (modality)
        where.modality = modality;
    if (startDate || endDate) {
        where.completedAt = {};
        if (startDate)
            where.completedAt.gte = new Date(startDate);
        if (endDate)
            where.completedAt.lte = new Date(endDate);
    }
    const [workouts, total] = await Promise.all([
        prisma.workout.findMany({
            where,
            include: {
                workoutPlan: {
                    select: { title: true, modality: true }
                }
            },
            skip,
            take: Number(limit),
            orderBy: { completedAt: 'desc' }
        }),
        prisma.workout.count({ where })
    ]);
    res.json({
        workouts,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
}));
router.get('/plans/:id/pdf', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const plan = await prisma.workoutPlan.findUnique({
        where: { id },
        include: {
            exercises: {
                orderBy: { sequence: 'asc' }
            }
        }
    });
    if (!plan) {
        throw (0, errorHandler_1.createError)('Planilha não encontrada', 404);
    }
    const doc = new jspdf_1.default();
    doc.setFontSize(20);
    doc.text(plan.title, 20, 30);
    doc.setFontSize(12);
    doc.text(`Modalidade: ${plan.modality}`, 20, 50);
    doc.text(`Data: ${new Date(plan.workoutDate).toLocaleDateString('pt-BR')}`, 20, 60);
    if (plan.type)
        doc.text(`Tipo: ${plan.type}`, 20, 70);
    if (plan.courseType)
        doc.text(`Percurso: ${plan.courseType}`, 20, 80);
    let yPosition = 100;
    doc.setFontSize(16);
    doc.text('Exercícios:', 20, yPosition);
    yPosition += 15;
    doc.setFontSize(12);
    plan.exercises.forEach((exercise, index) => {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        doc.text(`${exercise.sequence}. ${exercise.name}`, 20, yPosition);
        yPosition += 10;
        if (exercise.sets)
            doc.text(`Séries: ${exercise.sets}`, 30, yPosition);
        if (exercise.reps)
            doc.text(`Repetições: ${exercise.reps}`, 30, yPosition + 10);
        if (exercise.load)
            doc.text(`Carga: ${exercise.load}kg`, 30, yPosition + 20);
        if (exercise.interval)
            doc.text(`Intervalo: ${exercise.interval}`, 30, yPosition + 30);
        yPosition += 40;
    });
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="planilha-${plan.title}.pdf"`);
    res.send(pdfBuffer);
}));
router.get('/stats', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate;
    switch (period) {
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    const workouts = await prisma.workout.findMany({
        where: {
            userId: req.user.id,
            completedAt: {
                gte: startDate,
                lte: now
            }
        },
        orderBy: { completedAt: 'asc' }
    });
    const totalWorkouts = workouts.length;
    const totalDistance = workouts.reduce((sum, w) => sum + (w.distance || 0), 0);
    const totalCalories = workouts.reduce((sum, w) => sum + (w.calories || 0), 0);
    const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    const runningWorkouts = workouts.filter((w) => w.modality === 'RUNNING' && w.pace);
    const paceEvolution = runningWorkouts.map((w) => ({
        date: w.completedAt,
        pace: w.pace,
        distance: w.distance
    }));
    res.json({
        period,
        totalWorkouts,
        totalDistance,
        totalCalories,
        totalDuration,
        paceEvolution,
        workouts: workouts.slice(-10)
    });
}));
exports.default = router;
//# sourceMappingURL=workouts.js.map