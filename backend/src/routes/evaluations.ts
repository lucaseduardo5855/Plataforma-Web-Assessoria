import express, { Request, Response } from 'express'; 
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Schemas de validação
const evaluationSchema = Joi.object({
  type: Joi.string().valid('INITIAL', 'MONTHLY', 'FINAL').required(),
  weight: Joi.number().positive().optional(),
  height: Joi.number().positive().optional(),
  bodyFat: Joi.number().min(0).max(100).optional(),
  muscleMass: Joi.number().positive().optional(),
  notes: Joi.string().optional()
});

// Criar avaliação (apenas admin)
router.post('/', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = evaluationSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { userId, ...evaluationData } = req.body;

  // Verificar se o usuário existe
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw createError('Usuário não encontrado', 404);
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

// Listar avaliações
router.get('/', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 10, userId, type } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  
  // Se for admin, pode ver todas as avaliações
  if (req.user?.role === 'ADMIN') {
    if (userId) where.userId = userId;
  } else {
    // Se for aluno, só vê suas próprias avaliações
    where.userId = req.user!.id;
  }
  
  if (type) where.type = type;

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

// Obter avaliação específica
router.get('/', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
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
    throw createError('Avaliação não encontrada', 404);
  }

  // Verificar se o usuário pode ver esta avaliação
  if (req.user?.role !== 'ADMIN' && evaluation.userId !== req.user?.id) {
    throw createError('Acesso negado', 403);
  }

  res.json({ evaluation });
}));

// Atualizar avaliação (apenas admin)
router.get('/', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { error, value } = evaluationSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
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

// Deletar avaliação (apenas admin)
router.get('/', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.evaluation.delete({
    where: { id }
  });

  res.json({ message: 'Avaliação deletada com sucesso' });
}));

// Obter histórico de avaliações de um aluno
router.get('/', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  // Verificar se o usuário existe
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true
    }
  });

  if (!user) {
    throw createError('Usuário não encontrado', 404);
  }

  const evaluations = await prisma.evaluation.findMany({
    where: { userId },
    orderBy: { evaluatedAt: 'asc' }
  });

  // Calcular evolução dos dados
  const evolution = evaluations.map((item: any, index: number) => { // 
    const previous = index > 0 ? evaluations[index - 1] : null;
    
    return {
      ...item, // <--- USAR 'item'
      weightChange: previous ? item.weight! - previous.weight! : 0,
      bodyFatChange: previous ? item.bodyFat! - previous.bodyFat! : 0, 
      muscleMassChange: previous ? item.muscleMass! - previous.muscleMass! : 0 
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

// Obter minhas avaliações (para alunos)
router.get('/', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const evaluations = await prisma.evaluation.findMany({
    where: { userId: req.user!.id },
    orderBy: { evaluatedAt: 'asc' }
  });

  // Calcular evolução dos dados
  const evolution = evaluations.map((item: any, index: number) => {
    const previous = index > 0 ? evaluations[index - 1] : null;
    
    return {
        ...item, // <-- Usa 'item'
        weightChange: previous ? item.weight! - previous.weight! : 0,
        bodyFat: evaluations.map((e: any) => ({ 
            date: e.evaluatedAt,
            value: e.bodyFat
        })).filter((d: any) => d.value !== null),
      muscleMass: evaluations.map((e: any) => ({ 
    date: e.evaluatedAt,
    value: e.muscleMass
})).filter((d: any) => d.value !== null)
    };
  });

  res.json({ evaluations: evolution });
}));

// Estatísticas de avaliações (apenas admin)
router.get('/stats/overview', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const [
    totalEvaluations,
    evaluationsByType,
    recentEvaluations,
    averageBodyFat,
    averageMuscleMass
  ] = await Promise.all([
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

// Obter dados para gráficos de evolução
router.get('/', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  const evaluations = await prisma.evaluation.findMany({
    where: { userId },
    orderBy: { evaluatedAt: 'asc' }
  });

  // Preparar dados para gráficos
  const chartData = {
    weight: evaluations.map((e: any) => ({
        date: e.evaluatedAt,
        value: e.weight
    })).filter((d: any) => d.value !== null),
    
    bodyFat: evaluations.map((e: any) => ({ 
        date: e.evaluatedAt,
        value: e.bodyFat
    })).filter((d: any) => d.value !== null),
    
    muscleMass: evaluations.map((e: any) => ({ 
        date: e.evaluatedAt,
        value: e.bodyFat
    })).filter((d: any) => d.value !== null),
  };

  res.json({ chartData });
}));

export default router;
