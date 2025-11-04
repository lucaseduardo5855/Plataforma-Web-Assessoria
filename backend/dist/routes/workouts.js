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
        sequence: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string().allow('').optional()).optional(),
        name: joi_1.default.string().allow('').optional(),
        description: joi_1.default.string().allow('').optional(),
        sets: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string().allow('').optional()).optional(),
        reps: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string().allow('').optional()).optional(),
        load: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string().allow('').optional()).optional(),
        time: joi_1.default.string().allow('').optional(),
        distance: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string().allow('').optional()).optional(),
        interval: joi_1.default.string().allow('').optional(),
        instruction: joi_1.default.string().allow('').optional(),
        observation: joi_1.default.string().allow('').optional()
    })).optional()
});
const workoutRecordSchema = joi_1.default.object({
    modality: joi_1.default.string().valid('RUNNING', 'MUSCLE_TRAINING', 'FUNCTIONAL', 'TRAIL_RUNNING').required(),
    type: joi_1.default.string().allow('').optional(),
    courseType: joi_1.default.string().allow('').optional(),
    duration: joi_1.default.number().optional(),
    distance: joi_1.default.number().optional(),
    pace: joi_1.default.string().allow('').optional(),
    calories: joi_1.default.number().optional(),
    notes: joi_1.default.string().allow('').optional(),
    additionalWorkoutType: joi_1.default.string().allow('').optional(),
    completedAt: joi_1.default.date().optional()
});
const assignWorkoutSchema = joi_1.default.object({
    userId: joi_1.default.string().required(),
    workoutPlanId: joi_1.default.string().required(),
    notes: joi_1.default.string().allow('').optional()
});
router.post('/plans', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    console.log('=== CRIANDO PLANILHA ===');
    console.log('Dados recebidos:', JSON.stringify(req.body, null, 2));
    const { error, value } = workoutPlanSchema.validate(req.body);
    if (error) {
        console.log('Erro de validação:', error.details);
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    console.log('Dados validados:', JSON.stringify(value, null, 2));
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
                sequence: exercise.sequence && !isNaN(Number(exercise.sequence)) ? Number(exercise.sequence) : null,
                name: exercise.name || null,
                description: exercise.description && exercise.description.trim() !== '' ? exercise.description : null,
                sets: exercise.sets && !isNaN(Number(exercise.sets)) ? Number(exercise.sets) : null,
                reps: exercise.reps && !isNaN(Number(exercise.reps)) ? Number(exercise.reps) : null,
                load: exercise.load && !isNaN(Number(exercise.load)) ? Number(exercise.load) : null,
                time: exercise.time && exercise.time.trim() !== '' ? exercise.time : null,
                distance: exercise.distance && !isNaN(Number(exercise.distance)) ? Number(exercise.distance) : null,
                interval: exercise.interval && exercise.interval.trim() !== '' ? exercise.interval : null,
                instruction: exercise.instruction && exercise.instruction.trim() !== '' ? exercise.instruction : null,
                observation: exercise.observation && exercise.observation.trim() !== '' ? exercise.observation : null,
                workoutPlanId: workoutPlan.id
            }))
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
                assignedBy: req.user.id,
                status: 'ASSIGNED',
            }
        });
    }
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
}));
router.post('/assign', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    console.log('=== ATRIBUINDO TREINO ===');
    console.log('Dados recebidos:', JSON.stringify(req.body, null, 2));
    const { error, value } = assignWorkoutSchema.validate(req.body);
    if (error) {
        console.log('Erro de validação:', error.details);
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    const { userId, workoutPlanId, notes } = value;
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { studentProfile: true }
    });
    if (!user) {
        throw (0, errorHandler_1.createError)('Usuário não encontrado', 404);
    }
    if (user.role !== 'STUDENT') {
        throw (0, errorHandler_1.createError)('Apenas alunos podem receber treinos atribuídos', 400);
    }
    const workoutPlan = await prisma.workoutPlan.findUnique({
        where: { id: workoutPlanId },
        include: { exercises: true }
    });
    if (!workoutPlan) {
        throw (0, errorHandler_1.createError)('Plano de treino não encontrado', 404);
    }
    const assignedWorkout = await prisma.workout.create({
        data: {
            userId: userId,
            workoutPlanId: workoutPlanId,
            assignedBy: req.user.id,
            modality: workoutPlan.modality,
            type: workoutPlan.type,
            courseType: workoutPlan.courseType,
            notes: notes,
            status: 'ASSIGNED'
        },
        include: {
            workoutPlan: {
                include: { exercises: true }
            },
            user: {
                select: { name: true, email: true }
            }
        }
    });
    console.log('Treino atribuído com sucesso:', assignedWorkout.id);
    return res.status(201).json({
        message: 'Treino atribuído com sucesso',
        workout: assignedWorkout
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
    try {
        console.log('=== LISTANDO PLANILHAS ===');
        console.log('User ID:', req.user?.id);
        console.log('User Role:', req.user?.role);
        const { page = 1, limit = 10, modality, status } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (modality)
            where.modality = modality;
        if (status)
            where.status = status;
        console.log('Where clause:', where);
        console.log('Skip:', skip, 'Limit:', limit);
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
        console.log('Plans found:', plans.length);
        console.log('Total:', total);
        res.json({
            plans,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('=== ERRO AO LISTAR PLANILHAS ===');
        console.error('Erro completo:', error);
        throw error;
    }
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
                select: {
                    id: true,
                    userId: true,
                    status: true,
                    completedAt: true,
                    createdAt: true,
                    user: {
                        select: { name: true, id: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
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
    const { exercises, userId, ...planData } = value;
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
                    sequence: exercise.sequence && !isNaN(Number(exercise.sequence)) ? Number(exercise.sequence) : null,
                    name: exercise.name || null,
                    description: exercise.description && exercise.description.trim() !== '' ? exercise.description : null,
                    sets: exercise.sets && !isNaN(Number(exercise.sets)) ? Number(exercise.sets) : null,
                    reps: exercise.reps && !isNaN(Number(exercise.reps)) ? Number(exercise.reps) : null,
                    load: exercise.load && !isNaN(Number(exercise.load)) ? Number(exercise.load) : null,
                    time: exercise.time && exercise.time.trim() !== '' ? exercise.time : null,
                    distance: exercise.distance && !isNaN(Number(exercise.distance)) ? Number(exercise.distance) : null,
                    interval: exercise.interval && exercise.interval.trim() !== '' ? exercise.interval : null,
                    instruction: exercise.instruction && exercise.instruction.trim() !== '' ? exercise.instruction : null,
                    observation: exercise.observation && exercise.observation.trim() !== '' ? exercise.observation : null,
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
        if (userId) {
            const existingWorkout = await prisma.workout.findFirst({
                where: {
                    userId: userId,
                    workoutPlanId: id
                }
            });
            if (existingWorkout) {
                await prisma.workout.update({
                    where: { id: existingWorkout.id },
                    data: {
                        modality: planData.modality,
                        type: planData.type || null,
                        courseType: planData.courseType || null,
                    }
                });
            }
            else {
                await prisma.workout.create({
                    data: {
                        userId: userId,
                        workoutPlanId: id,
                        modality: planData.modality,
                        type: planData.type || null,
                        courseType: planData.courseType || null,
                        assignedBy: req.user.id,
                        status: 'ASSIGNED',
                    }
                });
            }
        }
        return res.json({
            message: 'Planilha atualizada com sucesso',
            workoutPlan: planWithExercises
        });
    }
    if (userId) {
        const existingWorkout = await prisma.workout.findFirst({
            where: {
                userId: userId,
                workoutPlanId: id
            }
        });
        if (existingWorkout) {
            await prisma.workout.update({
                where: { id: existingWorkout.id },
                data: {
                    modality: planData.modality,
                    type: planData.type || null,
                    courseType: planData.courseType || null,
                }
            });
        }
        else {
            await prisma.workout.create({
                data: {
                    userId: userId,
                    workoutPlanId: id,
                    modality: planData.modality,
                    type: planData.type || null,
                    courseType: planData.courseType || null,
                    assignedBy: req.user.id,
                    status: 'ASSIGNED',
                }
            });
        }
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
router.get('/assigned-workouts', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    console.log('=== BUSCANDO TREINOS ATRIBUÍDOS ===');
    console.log('User ID:', req.user?.id);
    const allWorkouts = await prisma.workout.findMany({
        where: { userId: req.user.id },
        select: {
            id: true,
            workoutPlanId: true,
            status: true,
            createdAt: true
        }
    });
    console.log('Total de workouts do usuário:', allWorkouts.length);
    console.log('Workouts encontrados:', allWorkouts);
    const workouts = await prisma.workout.findMany({
        where: {
            userId: req.user.id,
            workoutPlanId: { not: null },
            status: { in: ['ASSIGNED', 'COMPLETED'] }
        },
        include: {
            workoutPlan: {
                include: {
                    exercises: {
                        orderBy: { sequence: 'asc' }
                    }
                }
            },
            assignedByUser: {
                select: { name: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    console.log('Treinos atribuídos encontrados (após filtros):', workouts.length);
    if (workouts.length > 0) {
        console.log('Detalhes dos treinos:', workouts.map(w => ({
            id: w.id,
            workoutPlanId: w.workoutPlanId,
            status: w.status,
            planTitle: w.workoutPlan?.title
        })));
    }
    res.json({ workouts });
}));
router.put('/assigned-workouts/:workoutId/complete', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    console.log('=== MARCANDO TREINO COMO CONCLUÍDO ===');
    const { workoutId } = req.params;
    const workout = await prisma.workout.findFirst({
        where: {
            id: workoutId,
            userId: req.user.id,
            status: 'ASSIGNED'
        }
    });
    if (!workout) {
        throw (0, errorHandler_1.createError)('Treino não encontrado ou já concluído', 404);
    }
    const updatedWorkout = await prisma.workout.update({
        where: { id: workoutId },
        data: {
            status: 'COMPLETED',
            completedAt: new Date()
        },
        include: {
            workoutPlan: {
                include: { exercises: true }
            }
        }
    });
    console.log('Treino marcado como concluído:', workoutId);
    res.json({
        message: 'Treino marcado como concluído com sucesso',
        workout: updatedWorkout
    });
}));
router.post('/test', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    console.log('=== TESTE ENDPOINT ===');
    console.log('Dados recebidos:', req.body);
    console.log('User ID:', req.user?.id);
    res.status(200).json({
        message: 'Teste funcionando',
        user: req.user?.id,
        data: req.body
    });
}));
router.post('/record', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        console.log('=== REGISTRANDO TREINO ===');
        console.log('Dados recebidos:', req.body);
        console.log('User ID:', req.user?.id);
        if (!req.body.modality) {
            throw (0, errorHandler_1.createError)('Modalidade é obrigatória', 400);
        }
        console.log('Validação básica passou');
        const workout = await prisma.workout.create({
            data: {
                modality: req.body.modality,
                userId: req.user.id,
                duration: req.body.duration || null,
                distance: req.body.distance || null,
                calories: req.body.calories || null,
                pace: req.body.pace || null,
                notes: req.body.notes || null,
                type: req.body.type || null,
                additionalWorkoutType: req.body.additionalWorkoutType || null,
                completedAt: new Date()
            }
        });
        console.log('Treino criado:', workout);
        res.status(201).json({
            message: 'Treino registrado com sucesso',
            workout
        });
    }
    catch (error) {
        console.error('=== ERRO AO REGISTRAR TREINO ===');
        console.error('Erro completo:', error);
        throw error;
    }
}));
router.put('/my-workouts/:id', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error, value } = workoutRecordSchema.validate(req.body);
    if (error) {
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    const existingWorkout = await prisma.workout.findFirst({
        where: {
            id: id,
            userId: req.user.id,
            workoutPlanId: null
        }
    });
    if (!existingWorkout) {
        throw (0, errorHandler_1.createError)('Treino não encontrado ou não autorizado', 404);
    }
    const updatedWorkout = await prisma.workout.update({
        where: { id },
        data: value
    });
    res.json({
        message: 'Treino atualizado com sucesso',
        workout: updatedWorkout
    });
}));
router.delete('/my-workouts/:id', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const existingWorkout = await prisma.workout.findFirst({
        where: {
            id: id,
            userId: req.user.id,
            workoutPlanId: null
        }
    });
    if (!existingWorkout) {
        throw (0, errorHandler_1.createError)('Treino não encontrado ou não autorizado', 404);
    }
    await prisma.workout.delete({
        where: { id }
    });
    await prisma.studentProfile.upsert({
        where: { userId: req.user.id },
        update: {
            totalWorkouts: { decrement: 1 },
            totalCalories: { decrement: existingWorkout.calories || 0 },
            totalDistance: { decrement: existingWorkout.distance || 0 }
        },
        create: {
            userId: req.user.id,
            totalWorkouts: 0,
            totalCalories: 0,
            totalDistance: 0
        }
    });
    res.json({
        message: 'Treino excluído com sucesso'
    });
}));
router.get('/my-workouts', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 10, modality, startDate, endDate, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const minDate = new Date('2020-01-01');
    const where = {
        userId: req.user.id,
        completedAt: {
            not: null
        }
    };
    if (modality)
        where.modality = modality;
    if (status)
        where.status = status;
    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) {
            dateFilter.gte = new Date(startDate);
        }
        else {
            dateFilter.gte = minDate;
        }
        if (endDate) {
            dateFilter.lte = new Date(endDate);
        }
        where.completedAt = {
            ...where.completedAt,
            ...dateFilter
        };
    }
    else {
        where.completedAt = {
            ...where.completedAt,
            gte: minDate
        };
    }
    const [workouts, total] = await Promise.all([
        prisma.workout.findMany({
            where,
            include: {
                workoutPlan: {
                    select: { title: true, modality: true, description: true }
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
router.put('/assigned-workouts/:id/complete', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        console.log('=== MARCANDO TREINO COMO CONCLUÍDO ===');
        console.log('Treino ID:', id);
        console.log('User ID:', req.user?.id);
        const workout = await prisma.workout.findFirst({
            where: {
                id: id,
                userId: req.user.id,
                workoutPlanId: { not: null }
            }
        });
        if (!workout) {
            throw (0, errorHandler_1.createError)('Treino não encontrado ou não autorizado', 404);
        }
        const updatedWorkout = await prisma.workout.update({
            where: { id },
            data: {
                completedAt: new Date(),
                status: 'COMPLETED'
            }
        });
        console.log('Treino atualizado:', updatedWorkout);
        res.json({
            message: 'Treino marcado como concluído com sucesso',
            workout: updatedWorkout
        });
    }
    catch (error) {
        console.error('=== ERRO AO MARCAR TREINO COMO CONCLUÍDO ===');
        console.error('Erro completo:', error);
        throw error;
    }
}));
router.get('/debug-workouts', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        console.log('=== DEBUG TODOS OS TREINOS ===');
        console.log('User ID:', req.user.id);
        const workouts = await prisma.workout.findMany({
            where: { userId: req.user.id },
            include: {
                workoutPlan: {
                    select: { title: true, modality: true, description: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log('Total de treinos:', workouts.length);
        console.log('Treinos:', workouts);
        res.json({
            userId: req.user.id,
            totalWorkouts: workouts.length,
            workouts: workouts.map(w => ({
                id: w.id,
                modality: w.modality,
                workoutPlanId: w.workoutPlanId,
                workoutPlanTitle: w.workoutPlan?.title,
                completedAt: w.completedAt,
                createdAt: w.createdAt
            }))
        });
    }
    catch (error) {
        console.error('Erro no debug:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
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
                not: null,
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