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
  maxAttendees: Joi.number().positive().allow(null).optional(),
  userIds: Joi.array().items(Joi.string()).optional()
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

  const { userIds, ...eventData } = value;

  console.log('=== CRIANDO EVENTO ===');
  console.log('Event data:', eventData);
  console.log('UserIds recebidos:', userIds);
  console.log('Tipo de userIds:', Array.isArray(userIds) ? 'array' : typeof userIds);
  console.log('Quantidade de userIds:', userIds ? userIds.length : 0);

  const event = await prisma.event.create({
    data: eventData
  });

  console.log('Evento criado com ID:', event.id);

  // Criar notificações apenas para os alunos selecionados
  let studentsToNotify = [];
  
  if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    // Alunos selecionados especificamente
    console.log('Usando alunos selecionados:', userIds);
    studentsToNotify = userIds.filter(id => id && id.trim() !== ''); // Filtrar IDs vazios
  } else {
    // Se nenhum aluno foi selecionado, criar para todos
    console.log('Nenhum aluno selecionado, buscando todos os alunos');
    const allStudents = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true }
    });
    studentsToNotify = allStudents.map(s => s.id);
    console.log('Todos os alunos encontrados:', studentsToNotify.length);
  }

  console.log('Alunos que receberão notificação:', studentsToNotify.length);
  console.log('IDs dos alunos:', studentsToNotify);

  if (studentsToNotify.length > 0) {
    try {
      const attendanceData = studentsToNotify.map((userId: string) => ({
        userId,
        eventId: event.id,
        confirmed: false 
      }));
      
      console.log('Dados de attendance a serem criados:', attendanceData);
      
      // Verificar se já existem attendances para evitar duplicatas
      const existingAttendances = await prisma.eventAttendance.findMany({
        where: {
          eventId: event.id,
          userId: { in: studentsToNotify }
        },
        select: { userId: true }
      });
      
      const existingUserIds = existingAttendances.map(ea => ea.userId);
      const newAttendanceData = attendanceData.filter(
        ad => !existingUserIds.includes(ad.userId)
      );
      
      if (newAttendanceData.length > 0) {
        const result = await prisma.eventAttendance.createMany({
          data: newAttendanceData
        });
        console.log('EventAttendances criados:', result.count);
      } else {
        console.log('Todos os EventAttendances já existem');
      }
    } catch (error) {
      console.error('Erro ao criar eventAttendances:', error);
      // Não lançar erro, pois o evento já foi criado
      // Mas registrar o problema
    }
  } else {
    console.log('Nenhum aluno para notificar');
  }

  res.status(201).json({
    message: 'Evento criado com sucesso',
    event
  });
}));

// Listar eventos do aluno com status de presença (DEVE VIR ANTES DE /:id)
router.get('/my-events', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log('=== BUSCANDO EVENTOS DO ALUNO ===');
    console.log('User ID:', req.user!.id);
    
    // Buscar apenas eventos onde o aluno tem presença registrada
    const events = await prisma.event.findMany({
      where: {
        attendances: {
          some: {
            userId: req.user!.id
          }
        }
      },
      include: {
        attendances: {
          where: {
            userId: req.user!.id
          },
          select: {
            id: true,
            confirmed: true
          }
        },
        _count: {
          select: { attendances: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    console.log('Total de eventos encontrados:', events.length);

    // Formatar resposta para incluir status de presença
    const eventsWithAttendance = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      type: event.type,
      maxAttendees: event.maxAttendees,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      myAttendance: event.attendances[0] || null,
      _count: event._count
    }));

    console.log('Eventos formatados retornados:', eventsWithAttendance.length);

    res.json({ events: eventsWithAttendance });
  } catch (error: any) {
    console.error('❌ Erro ao buscar eventos do aluno:', error);
    throw createError('Erro ao carregar eventos: ' + error.message, 500);
  }
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

  const { userIds, ...eventData } = value;

  const event = await prisma.event.update({
    where: { id },
    data: eventData,
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
