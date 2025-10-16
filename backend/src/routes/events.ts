import express, { Request, Response } from 'express'; 
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Schemas de validação
const eventSchema = Joi.object({
  title: Joi.string().min(3).required(),
  description: Joi.string().optional(),
  date: Joi.date().required(),
  location: Joi.string().optional(),
  type: Joi.string().valid('TRAINING', 'COMPETITION', 'WORKSHOP', 'SOCIAL').required(),
  maxAttendees: Joi.number().positive().allow(null).optional()
});

const attendanceSchema = Joi.object({
  confirmed: Joi.boolean().required()
});

// Criar evento (apenas admin)
router.post('/', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = eventSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const event = await prisma.event.create({
    data: value
  });

  // Criar notificações para todos os alunos
  const allStudents = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true }
  });

  if (allStudents.length > 0) {
    await prisma.eventAttendance.createMany({
      data: allStudents.map(student => ({
        userId: student.id,
        eventId: event.id,
        confirmed: false // Status pendente para confirmação
      }))
    });
  }

  res.status(201).json({
    message: 'Evento criado com sucesso',
    event
  });
}));

// Listar eventos
router.get('/', authenticateToken, asyncHandler(async (req: AuthRequest,res: Response) => {
  const { page = 1, limit = 10, type, upcoming = 'true' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (type) where.type = type;
  
  if (upcoming === 'true') {
    where.date = { gte: new Date() };
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        attendances: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        _count: {
          select: { attendances: true }
        }
      },
      skip,
      take: Number(limit),
      orderBy: { date: 'asc' }
    }),
    prisma.event.count({ where })
  ]);

  res.json({
    events,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
}));

// Obter evento específico
router.get('/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      attendances: {
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      },
      _count: {
        select: { attendances: true }
      }
    }
  });

  if (!event) {
    throw createError('Evento não encontrado', 404);
  }

  res.json({ event });
}));

// Atualizar evento (apenas admin)
router.put('/:id', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response)=> {
  const { id } = req.params;
  const { error, value } = eventSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const event = await prisma.event.update({
    where: { id },
    data: value,
    include: {
      attendances: {
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      }
    }
  });

  res.json({
    message: 'Evento atualizado com sucesso',
    event
  });
}));

// Deletar evento (apenas admin)
router.delete('/:id', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest,res: Response)=> {
  const { id } = req.params;

  await prisma.event.delete({
    where: { id }
  });

  res.json({ message: 'Evento deletado com sucesso' });
}));

// Confirmar/negar presença em evento (para alunos)
router.put('/:id/attendance', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { confirmed } = req.body;

  // Verificar se o evento existe
  const event = await prisma.event.findUnique({
    where: { id }
  });

  if (!event) {
    throw createError('Evento não encontrado', 404);
  }

  // Atualizar ou criar presença
  const attendance = await prisma.eventAttendance.upsert({
    where: {
      eventId_userId: {
        eventId: id,
        userId: req.user!.id
      }
    },
    update: {
      confirmed: Boolean(confirmed)
    },
    create: {
      eventId: id,
      userId: req.user!.id,
      confirmed: Boolean(confirmed)
    }
  });

  res.json({
    message: confirmed ? 'Presença confirmada' : 'Presença negada',
    attendance
  });
}));

// Listar eventos do aluno com status de presença
router.get('/my-events', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const events = await prisma.event.findMany({
    include: {
      attendances: {
        where: {
          userId: req.user!.id
        }
      }
    },
    orderBy: { date: 'asc' }
  });

  // Formatar resposta para incluir status de presença
  const eventsWithAttendance = events.map(event => ({
    ...event,
    myAttendance: event.attendances[0] || null,
    attendances: undefined // Remover para não expor dados de outros alunos
  }));

  res.json({ events: eventsWithAttendance });
}));

// Confirmar presença em evento
router.post('/:id/attend', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { error, value } = attendanceSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  // Verificar se o evento existe
  const event = await prisma.event.findUnique({
    where: { id }
  });

  if (!event) {
    throw createError('Evento não encontrado', 404);
  }

  // Verificar se já existe uma confirmação
  const existingAttendance = await prisma.eventAttendance.findUnique({
    where: {
      eventId_userId: {
        eventId: id,
        userId: req.user!.id
      }
    }
  });

  let attendance;

  if (existingAttendance) {
    // Atualizar confirmação existente
    attendance = await prisma.eventAttendance.update({
      where: { id: existingAttendance.id },
      data: { confirmed: value.confirmed }
    });
  } else {
    // Criar nova confirmação
    attendance = await prisma.eventAttendance.create({
      data: {
        eventId: id,
        userId: req.user!.id,
        confirmed: value.confirmed
      }
    });
  }

  res.json({
    message: value.confirmed ? 'Presença confirmada' : 'Presença cancelada',
    attendance
  });
}));

// Obter presenças do usuário
router.get('/my/attendances', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 10, confirmed } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = { userId: req.user!.id };
  if (confirmed !== undefined) {
    where.confirmed = confirmed === 'true';
  }

  const [attendances, total] = await Promise.all([
    prisma.eventAttendance.findMany({
      where,
      include: {
        event: true
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.eventAttendance.count({ where })
  ]);

  res.json({
    attendances,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
}));

// Listar participantes de um evento (apenas admin)
router.get('/:id/attendances', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { page = 1, limit = 10, confirmed } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = { eventId: id };
  if (confirmed !== undefined) {
    where.confirmed = confirmed === 'true';
  }

  const [attendances, total] = await Promise.all([
    prisma.eventAttendance.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true, phone: true }
        }
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.eventAttendance.count({ where })
  ]);

  res.json({
    attendances,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
}));

// Estatísticas de eventos (apenas admin)
router.get('/stats/overview', authenticateToken, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const [
    totalEvents,
    upcomingEvents,
    totalAttendances,
    eventsByType
  ] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({
      where: { date: { gte: new Date() } }
    }),
    prisma.eventAttendance.count({
      where: { confirmed: true }
    }),
    prisma.event.groupBy({
      by: ['type'],
      _count: { type: true }
    })
  ]);

  res.json({
    totalEvents,
    upcomingEvents,
    totalAttendances,
    eventsByType
  });
}));

export default router;
