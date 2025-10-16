import express, { Request, Response } from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';
import jsPDF from 'jspdf';

const router = express.Router();
const prisma = new PrismaClient();

// Schemas de validação
const workoutPlanSchema = Joi.object({
    title: Joi.string().min(3).required(),
    description: Joi.string().optional(),
    modality: Joi.string().valid('RUNNING', 'MUSCLE_TRAINING', 'FUNCTIONAL', 'TRAIL_RUNNING').required(),
    type: Joi.string().optional(), // Tipo de treino: rampa, tiro, base, etc.
    courseType: Joi.string().optional(), // Tipo de percurso: subida, descida, plano, etc.
    status: Joi.string().valid('PROPOSED', 'ACTIVE', 'COMPLETED', 'CANCELLED').default('PROPOSED'),
    order: Joi.number().optional(),
    isFavorite: Joi.boolean().default(false),
    workoutDate: Joi.date().required(),
    userId: Joi.string().optional(), // Campo para associar planilha a um usuário específico
    exercises: Joi.array().items(Joi.object({
        sequence: Joi.number().optional(),
        name: Joi.string().optional(),
        description: Joi.string().optional(),
        sets: Joi.number().optional(),
        reps: Joi.number().optional(),
        load: Joi.number().optional(),
        interval: Joi.string().optional(),
        instruction: Joi.string().optional(),
        observation: Joi.string().optional()
    })).optional()
});

const workoutRecordSchema = Joi.object({
    modality: Joi.string().valid('RUNNING', 'MUSCLE_TRAINING', 'FUNCTIONAL', 'TRAIL_RUNNING').required(),
    type: Joi.string().optional(),
    courseType: Joi.string().optional(),
    duration: Joi.number().optional(),
    distance: Joi.number().optional(),
    pace: Joi.string().optional(),
    calories: Joi.number().optional(),
    notes: Joi.string().optional()
});

// Criar planilha de treino (apenas admin)
router.post('/plans', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { error, value } = workoutPlanSchema.validate(req.body);
    if (error) {
        throw createError(error.details[0].message, 400);
    }

    const { exercises, userId, ...planData } = value;

    // Criar planilha
    const workoutPlan = await prisma.workoutPlan.create({
        data: planData,
        include: {
            exercises: true
        }
    });

    // Criar exercícios se fornecidos
    if (exercises && exercises.length > 0) {
        await prisma.exercise.createMany({
            data: exercises.map((exercise: any) => ({
                ...exercise,
                workoutPlanId: workoutPlan.id
            }))
        });

        // Buscar planilha com exercícios
        const planWithExercises = await prisma.workoutPlan.findUnique({
            where: { id: workoutPlan.id },
            include: {
                exercises: {
                    orderBy: { sequence: 'asc' }
                }
            }
        });

        return res.status(201).json({ // CORREÇÃO 1: Já tinha 'return'
            message: 'Planilha criada com sucesso',
            workoutPlan: planWithExercises
        });
    }

    // Se um userId foi fornecido, criar um workout associado à planilha
    if (userId) {
        await prisma.workout.create({
            data: {
                userId: userId,
                workoutPlanId: workoutPlan.id,
                modality: planData.modality,
                type: planData.type || null,
                courseType: planData.courseType || null,
                completedAt: new Date() // Marcar como concluído para que apareça na lista do aluno
            }
        });
    }

    return res.status(201).json({ // CORREÇÃO 2: Adicionado 'return' para resolver TS7030
        message: 'Planilha criada com sucesso',
        workoutPlan
    });
}));

// Buscar treinos de um usuário específico (apenas admin)
router.get('/user/:userId', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { page = 1, limit = 10, modality, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId };
    if (modality) where.modality = modality;

    if (startDate || endDate) {
        where.completedAt = {};
        if (startDate) where.completedAt.gte = new Date(startDate as string);
        if (endDate) where.completedAt.lte = new Date(endDate as string);
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

// Listar planilhas
router.get('/plans', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 10, modality, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (modality) where.modality = modality;
    if (status) where.status = status;

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

// Obter planilha específica
router.get('/plans/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
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
        throw createError('Planilha não encontrada', 404);
    }

    res.json({ workoutPlan: plan });
}));

// Atualizar planilha (apenas admin)
router.put('/plans/:id', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { error, value } = workoutPlanSchema.validate(req.body);
    if (error) {
        throw createError(error.details[0].message, 400);
    }

    const { exercises, ...planData } = value;

    // Atualizar planilha
    const updatedPlan = await prisma.workoutPlan.update({
        where: { id },
        data: planData,
        include: {
            exercises: {
                orderBy: { sequence: 'asc' }
            }
        }
    });

    // Atualizar exercícios se fornecidos
    if (exercises) {
        // Deletar exercícios existentes
        await prisma.exercise.deleteMany({
            where: { workoutPlanId: id }
        });

        // Criar novos exercícios
        if (exercises.length > 0) {
            await prisma.exercise.createMany({
                data: exercises.map((exercise: any) => ({ // CORREÇÃO 3: Tipagem 'any'
                    ...exercise,
                    workoutPlanId: id
                }))
            });
        }

        // Buscar planilha atualizada
        const planWithExercises = await prisma.workoutPlan.findUnique({
            where: { id },
            include: {
                exercises: {
                    orderBy: { sequence: 'asc' }
                }
            }
        });

        return res.json({ // CORREÇÃO 4: Já tinha 'return'
            message: 'Planilha atualizada com sucesso',
            workoutPlan: planWithExercises
        });
    }

    return res.json({ // CORREÇÃO 5: Adicionado 'return' para resolver TS7030
        message: 'Planilha atualizada com sucesso',
        workoutPlan: updatedPlan
    });
}));

// Deletar planilha (apenas admin)
router.delete('/plans/:id', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    await prisma.workoutPlan.delete({
        where: { id }
    });

    res.json({ message: 'Planilha deletada com sucesso' });
}));

// Registrar treino realizado
router.post('/record', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { error, value } = workoutRecordSchema.validate(req.body);
    if (error) {
        throw createError(error.details[0].message, 400);
    }

    const workout = await prisma.workout.create({
        data: {
            ...value,
            userId: req.user!.id
        }
    });

    // Atualizar estatísticas do perfil do aluno
    await prisma.studentProfile.update({
        where: { userId: req.user!.id },
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

// Listar treinos do usuário
router.get('/my-workouts', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 10, modality, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.user!.id };
    if (modality) where.modality = modality;

    if (startDate || endDate) {
        where.completedAt = {};
        if (startDate) where.completedAt.gte = new Date(startDate as string);
        if (endDate) where.completedAt.lte = new Date(endDate as string);
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

// Gerar PDF da planilha
router.get('/plans/:id/pdf', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
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
        throw createError('Planilha não encontrada', 404);
    }

    // Criar PDF
    const doc = new jsPDF();

    // Título
    doc.setFontSize(20);
    doc.text(plan.title, 20, 30);

    // Informações da planilha
    doc.setFontSize(12);
    doc.text(`Modalidade: ${plan.modality}`, 20, 50);
    doc.text(`Data: ${new Date(plan.workoutDate).toLocaleDateString('pt-BR')}`, 20, 60);
    if (plan.type) doc.text(`Tipo: ${plan.type}`, 20, 70);
    if (plan.courseType) doc.text(`Percurso: ${plan.courseType}`, 20, 80);

    // Exercícios
    let yPosition = 100;
    doc.setFontSize(16);
    doc.text('Exercícios:', 20, yPosition);

    yPosition += 15;
    doc.setFontSize(12);

    plan.exercises.forEach((exercise: any, index: number) => { // CORREÇÃO 6: Tipagem 'any'
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }

        doc.text(`${exercise.sequence}. ${exercise.name}`, 20, yPosition);
        yPosition += 10;

        if (exercise.sets) doc.text(`Séries: ${exercise.sets}`, 30, yPosition);
        if (exercise.reps) doc.text(`Repetições: ${exercise.reps}`, 30, yPosition + 10);
        if (exercise.load) doc.text(`Carga: ${exercise.load}kg`, 30, yPosition + 20);
        if (exercise.interval) doc.text(`Intervalo: ${exercise.interval}`, 30, yPosition + 30);

        yPosition += 40;
    });

    // Gerar buffer do PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="planilha-${plan.title}.pdf"`);
    res.send(pdfBuffer);
}));

// Estatísticas de treino do usuário
router.get('/stats', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate: Date;

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
            userId: req.user!.id,
            completedAt: {
                gte: startDate,
                lte: now
            }
        },
        orderBy: { completedAt: 'asc' }
    });

    // Calcular estatísticas
    const totalWorkouts = workouts.length;
    const totalDistance = workouts.reduce((sum: number, w: any) => sum + (w.distance || 0), 0); // CORREÇÃO 7: Tipagem 'any'
    const totalCalories = workouts.reduce((sum: number, w: any) => sum + (w.calories || 0), 0); // CORREÇÃO 8: Tipagem 'any'
    const totalDuration = workouts.reduce((sum: number, w: any) => sum + (w.duration || 0), 0); // CORREÇÃO 9: Tipagem 'any'

    // Calcular evolução do pace (para corrida)
    const runningWorkouts = workouts.filter((w: any) => w.modality === 'RUNNING' && w.pace); // CORREÇÃO 10: Tipagem 'any'
    const paceEvolution = runningWorkouts.map((w: any) => ({ // CORREÇÃO 11: Tipagem 'any'
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
        workouts: workouts.slice(-10) // Últimos 10 treinos
    });
}));

export default router;