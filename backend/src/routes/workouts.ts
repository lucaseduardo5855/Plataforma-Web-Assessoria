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
        sequence: Joi.alternatives().try(Joi.number(), Joi.string().allow('').optional()).optional(),
        name: Joi.string().allow('').optional(),
        description: Joi.string().allow('').optional(),
        sets: Joi.alternatives().try(Joi.number(), Joi.string().allow('').optional()).optional(),
        reps: Joi.alternatives().try(Joi.number(), Joi.string().allow('').optional()).optional(),
        load: Joi.alternatives().try(Joi.number(), Joi.string().allow('').optional()).optional(),
        interval: Joi.string().allow('').optional(),
        instruction: Joi.string().allow('').optional(),
        observation: Joi.string().allow('').optional()
    })).optional()
});

const workoutRecordSchema = Joi.object({
    modality: Joi.string().valid('RUNNING', 'MUSCLE_TRAINING', 'FUNCTIONAL', 'TRAIL_RUNNING').required(),
    type: Joi.string().allow('').optional(),
    courseType: Joi.string().allow('').optional(),
    duration: Joi.number().optional(),
    distance: Joi.number().optional(),
    pace: Joi.string().allow('').optional(),
    calories: Joi.number().optional(),
    notes: Joi.string().allow('').optional(),
    // Campos específicos para musculação
    additionalWorkoutType: Joi.string().allow('').optional(), // Aceita qualquer string
    completedAt: Joi.date().optional()
});

const assignWorkoutSchema = Joi.object({
    userId: Joi.string().required(),
    workoutPlanId: Joi.string().required(),
    notes: Joi.string().allow('').optional()
});

// Criar planilha de treino (apenas admin)
router.post('/plans', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
    console.log('=== CRIANDO PLANILHA ===');
    console.log('Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = workoutPlanSchema.validate(req.body);
    if (error) {
        console.log('Erro de validação:', error.details);
        throw createError(error.details[0].message, 400);
    }
    
    console.log('Dados validados:', JSON.stringify(value, null, 2));

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
                // Converter strings para números de forma segura
                sequence: exercise.sequence && !isNaN(Number(exercise.sequence)) ? Number(exercise.sequence) : null,
                sets: exercise.sets && !isNaN(Number(exercise.sets)) ? Number(exercise.sets) : null,
                reps: exercise.reps && !isNaN(Number(exercise.reps)) ? Number(exercise.reps) : null,
                load: exercise.load && !isNaN(Number(exercise.load)) ? Number(exercise.load) : null,
                workoutPlanId: workoutPlan.id
            }))
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
                assignedBy: req.user!.id,
                status: 'ASSIGNED', // Status inicial como pendente
                // completedAt não será definido, mantendo como null (não concluído)
            }
        });
    }

    // Buscar planilha com exercícios para retornar dados completos
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

// Atribuir treino a um aluno (apenas admin)
router.post('/assign', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
    console.log('=== ATRIBUINDO TREINO ===');
    console.log('Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = assignWorkoutSchema.validate(req.body);
    if (error) {
        console.log('Erro de validação:', error.details);
        throw createError(error.details[0].message, 400);
    }
    
    const { userId, workoutPlanId, notes } = value;

    // Verificar se o usuário existe e é um aluno
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { studentProfile: true }
    });

    if (!user) {
        throw createError('Usuário não encontrado', 404);
    }

    if (user.role !== 'STUDENT') {
        throw createError('Apenas alunos podem receber treinos atribuídos', 400);
    }

    // Verificar se o plano de treino existe
    const workoutPlan = await prisma.workoutPlan.findUnique({
        where: { id: workoutPlanId },
        include: { exercises: true }
    });

    if (!workoutPlan) {
        throw createError('Plano de treino não encontrado', 404);
    }

    // Criar o treino atribuído
    const assignedWorkout = await prisma.workout.create({
        data: {
            userId: userId,
            workoutPlanId: workoutPlanId,
            assignedBy: req.user!.id,
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
    try {
        console.log('=== LISTANDO PLANILHAS ===');
        console.log('User ID:', req.user?.id);
        console.log('User Role:', req.user?.role);
        
        const { page = 1, limit = 10, modality, status } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (modality) where.modality = modality;
        if (status) where.status = status;

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
    } catch (error) {
        console.error('=== ERRO AO LISTAR PLANILHAS ===');
        console.error('Erro completo:', error);
        throw error;
    }
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

// Buscar treinos atribuídos ao usuário logado
router.get('/assigned-workouts', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    console.log('=== BUSCANDO TREINOS ATRIBUÍDOS ===');
    console.log('User ID:', req.user?.id);
    
    const workouts = await prisma.workout.findMany({
        where: {
            userId: req.user!.id,
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

    console.log('Treinos atribuídos encontrados:', workouts.length);

    res.json({ workouts });
}));

// Marcar treino atribuído como concluído
router.put('/assigned-workouts/:workoutId/complete', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    console.log('=== MARCANDO TREINO COMO CONCLUÍDO ===');
    const { workoutId } = req.params;
    
    // Verificar se o treino existe e pertence ao usuário
    const workout = await prisma.workout.findFirst({
        where: {
            id: workoutId,
            userId: req.user!.id,
            status: 'ASSIGNED'
        }
    });

    if (!workout) {
        throw createError('Treino não encontrado ou já concluído', 404);
    }

    // Marcar como concluído
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

// Endpoint de teste
router.post('/test', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    console.log('=== TESTE ENDPOINT ===');
    console.log('Dados recebidos:', req.body);
    console.log('User ID:', req.user?.id);
    
    res.status(200).json({
        message: 'Teste funcionando',
        user: req.user?.id,
        data: req.body
    });
}));

// Registrar treino realizado
router.post('/record', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
        console.log('=== REGISTRANDO TREINO ===');
        console.log('Dados recebidos:', req.body);
        console.log('User ID:', req.user?.id);
        
        // Validação básica sem Joi por enquanto
        if (!req.body.modality) {
            throw createError('Modalidade é obrigatória', 400);
        }
        
        console.log('Validação básica passou');

        // Criar treino com dados mínimos
        const workout = await prisma.workout.create({
            data: {
                modality: req.body.modality,
                userId: req.user!.id,
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
    } catch (error) {
        console.error('=== ERRO AO REGISTRAR TREINO ===');
        console.error('Erro completo:', error);
        throw error;
    }
}));

// Atualizar treino do usuário
router.put('/my-workouts/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { error, value } = workoutRecordSchema.validate(req.body);
    
    if (error) {
        throw createError(error.details[0].message, 400);
    }

    // Verificar se o treino pertence ao usuário
    const existingWorkout = await prisma.workout.findFirst({
        where: { 
            id: id,
            userId: req.user!.id,
            workoutPlanId: null // Apenas treinos registrados pelo próprio usuário
        }
    });

    if (!existingWorkout) {
        throw createError('Treino não encontrado ou não autorizado', 404);
    }

    // Atualizar o treino
    const updatedWorkout = await prisma.workout.update({
        where: { id },
        data: value
    });

    res.json({
        message: 'Treino atualizado com sucesso',
        workout: updatedWorkout
    });
}));

// Excluir treino do usuário
router.delete('/my-workouts/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // Verificar se o treino pertence ao usuário
    const existingWorkout = await prisma.workout.findFirst({
        where: { 
            id: id,
            userId: req.user!.id,
            workoutPlanId: null // Apenas treinos registrados pelo próprio usuário
        }
    });

    if (!existingWorkout) {
        throw createError('Treino não encontrado ou não autorizado', 404);
    }

    // Excluir o treino
    await prisma.workout.delete({
        where: { id }
    });

    // Atualizar estatísticas do perfil do aluno
    await prisma.studentProfile.upsert({
        where: { userId: req.user!.id },
        update: {
            totalWorkouts: { decrement: 1 },
            totalCalories: { decrement: existingWorkout.calories || 0 },
            totalDistance: { decrement: existingWorkout.distance || 0 }
        },
        create: {
            userId: req.user!.id,
            totalWorkouts: 0,
            totalCalories: 0,
            totalDistance: 0
        }
    });

    res.json({
        message: 'Treino excluído com sucesso'
    });
}));

// Listar treinos do usuário
router.get('/my-workouts', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 10, modality, startDate, endDate, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.user!.id };
    if (modality) where.modality = modality;
    if (status) where.status = status;

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
                    select: { title: true, modality: true, description: true }
                }
            },
            skip,
            take: Number(limit),
            orderBy: { createdAt: 'desc' }
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

// Marcar treino atribuído como concluído
router.put('/assigned-workouts/:id/complete', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        console.log('=== MARCANDO TREINO COMO CONCLUÍDO ===');
        console.log('Treino ID:', id);
        console.log('User ID:', req.user?.id);
        
        // Verificar se o treino existe e pertence ao usuário
        const workout = await prisma.workout.findFirst({
            where: { 
                id: id,
                userId: req.user!.id,
                workoutPlanId: { not: null } // Apenas treinos atribuídos
            }
        });
        
        if (!workout) {
            throw createError('Treino não encontrado ou não autorizado', 404);
        }
        
        // Atualizar o treino para marcá-lo como concluído
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
    } catch (error) {
        console.error('=== ERRO AO MARCAR TREINO COMO CONCLUÍDO ===');
        console.error('Erro completo:', error);
        throw error;
    }
}));

// Listar treinos atribuídos pelo admin
router.get('/assigned-workouts', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
        console.log('=== BUSCANDO TREINOS ATRIBUÍDOS ===');
        console.log('User ID:', req.user!.id);
        
        const workouts = await prisma.workout.findMany({
            where: { 
                userId: req.user!.id,
                workoutPlanId: { not: null }
            },
            include: {
                workoutPlan: {
                    select: { title: true, modality: true, description: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log('Treinos encontrados:', workouts.length);
        console.log('Treinos:', workouts);

        res.json({
            workouts,
            total: workouts.length
        });
    } catch (error) {
        console.error('Erro ao buscar treinos atribuídos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
}));

// Debug: Listar todos os treinos do usuário (para debug)
router.get('/debug-workouts', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
        console.log('=== DEBUG TODOS OS TREINOS ===');
        console.log('User ID:', req.user!.id);
        
        const workouts = await prisma.workout.findMany({
            where: { userId: req.user!.id },
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
            userId: req.user!.id,
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
    } catch (error) {
        console.error('Erro no debug:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
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