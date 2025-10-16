import express, { Request, Response } from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Schema de validação para atualização de perfil
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  phone: Joi.string().optional(),
  birthDate: Joi.date().optional(),
  height: Joi.number().positive().optional(),
  weight: Joi.number().positive().optional(),
  goals: Joi.string().optional(),
  limitations: Joi.string().optional()
});

// Listar todos os alunos (apenas admin)
router.get('/students', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 1000, search = '' } = req.query;
  
  const skip = (Number(page) - 1) * Number(limit);
  
  const where = search ? {
    role: 'STUDENT',
    OR: [
      { name: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } }
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

  // Remover senhas
  const studentsWithoutPasswords = students.map((student: any) => { // <-- Correção aqui
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

// Obter perfil do usuário logado
router.get('/profile', authenticateToken, asyncHandler(async (req: AuthRequest,res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
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
    throw createError('Usuário não encontrado', 404);
  }

  const { password, ...userWithoutPassword } = user;

  res.json({ user: userWithoutPassword });
}));

// Atualizar perfil do usuário
router.put('/profile', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = updateProfileSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { height, weight, goals, limitations, ...userData } = value;

  // Atualizar dados do usuário
  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: userData,
    include: {
      studentProfile: true
    }
  });

  // Atualizar perfil do aluno se os dados estiverem presentes
  if (height || weight || goals || limitations) {
    await prisma.studentProfile.upsert({
      where: { userId: req.user!.id },
      update: {
        height,
        weight,
        goals,
        limitations
      },
      create: {
        userId: req.user!.id,
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

// Obter detalhes de um aluno específico (apenas admin)
router.get('/students/:id', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
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
    throw createError('Aluno não encontrado', 404);
  }

  const { password, ...studentWithoutPassword } = student;

  res.json({ student: studentWithoutPassword });
}));

// Atualizar aluno (apenas admin)
router.put('/students/:id', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  const { error, value } = updateProfileSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
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

// Deletar aluno (apenas admin)
router.delete('/students/:id', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest,res: Response) => {
  const { id } = req.params;

  // Verificar se o aluno existe
  const student = await prisma.user.findUnique({
    where: { id }
  });

  if (!student || student.role !== 'STUDENT') {
    throw createError('Aluno não encontrado', 404);
  }

  // Deletar aluno (cascade deletará perfil e relacionamentos)
  await prisma.user.delete({
    where: { id }
  });

  res.json({ message: 'Aluno deletado com sucesso' });
}));

// Estatísticas gerais (apenas admin)
router.get('/stats', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest,res: Response) => {
  const [
    totalStudents,
    totalWorkouts,
    totalEvents,
    recentWorkouts
  ] = await Promise.all([
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

export default router;
