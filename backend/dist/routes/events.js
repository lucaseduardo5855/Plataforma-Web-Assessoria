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
const eventSchema = joi_1.default.object({
    title: joi_1.default.string().min(3).required(),
    description: joi_1.default.string().optional(),
    date: joi_1.default.date().required(),
    location: joi_1.default.string().optional(),
    type: joi_1.default.string().valid('TRAINING', 'COMPETITION', 'WORKSHOP', 'SOCIAL').required(),
    maxAttendees: joi_1.default.number().positive().allow(null).optional(),
    userIds: joi_1.default.array().items(joi_1.default.string()).optional()
});
const attendanceSchema = joi_1.default.object({
    confirmed: joi_1.default.boolean().required()
});
router.post('/', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = eventSchema.validate(req.body);
    if (error) {
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    const { userIds, ...eventData } = value;
    const event = await prisma.event.create({
        data: eventData
    });
    let studentsToNotify = [];
    if (userIds && userIds.length > 0) {
        studentsToNotify = userIds;
    }
    else {
        const allStudents = await prisma.user.findMany({
            where: { role: 'STUDENT' },
            select: { id: true }
        });
        studentsToNotify = allStudents.map(s => s.id);
    }
    if (studentsToNotify.length > 0) {
        await prisma.eventAttendance.createMany({
            data: studentsToNotify.map((userId) => ({
                userId,
                eventId: event.id,
                confirmed: false
            }))
        });
    }
    res.status(201).json({
        message: 'Evento criado com sucesso',
        event
    });
}));
router.get('/my-events', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        console.log('=== BUSCANDO EVENTOS DO ALUNO ===');
        console.log('User ID:', req.user.id);
        const events = await prisma.event.findMany({
            where: {
                attendances: {
                    some: {
                        userId: req.user.id
                    }
                }
            },
            include: {
                attendances: {
                    where: {
                        userId: req.user.id
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
    }
    catch (error) {
        console.error('❌ Erro ao buscar eventos do aluno:', error);
        throw (0, errorHandler_1.createError)('Erro ao carregar eventos: ' + error.message, 500);
    }
}));
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 10, type, upcoming = 'true' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};
    if (type)
        where.type = type;
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
router.get('/:id', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
        throw (0, errorHandler_1.createError)('Evento não encontrado', 404);
    }
    res.json({ event });
}));
router.put('/:id', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error, value } = eventSchema.validate(req.body);
    if (error) {
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
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
router.delete('/:id', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    await prisma.event.delete({
        where: { id }
    });
    res.json({ message: 'Evento deletado com sucesso' });
}));
router.put('/:id/attendance', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { confirmed } = req.body;
    const event = await prisma.event.findUnique({
        where: { id }
    });
    if (!event) {
        throw (0, errorHandler_1.createError)('Evento não encontrado', 404);
    }
    const attendance = await prisma.eventAttendance.upsert({
        where: {
            eventId_userId: {
                eventId: id,
                userId: req.user.id
            }
        },
        update: {
            confirmed: Boolean(confirmed)
        },
        create: {
            eventId: id,
            userId: req.user.id,
            confirmed: Boolean(confirmed)
        }
    });
    res.json({
        message: confirmed ? 'Presença confirmada' : 'Presença negada',
        attendance
    });
}));
router.post('/:id/attend', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error, value } = attendanceSchema.validate(req.body);
    if (error) {
        throw (0, errorHandler_1.createError)(error.details[0].message, 400);
    }
    const event = await prisma.event.findUnique({
        where: { id }
    });
    if (!event) {
        throw (0, errorHandler_1.createError)('Evento não encontrado', 404);
    }
    const existingAttendance = await prisma.eventAttendance.findUnique({
        where: {
            eventId_userId: {
                eventId: id,
                userId: req.user.id
            }
        }
    });
    let attendance;
    if (existingAttendance) {
        attendance = await prisma.eventAttendance.update({
            where: { id: existingAttendance.id },
            data: { confirmed: value.confirmed }
        });
    }
    else {
        attendance = await prisma.eventAttendance.create({
            data: {
                eventId: id,
                userId: req.user.id,
                confirmed: value.confirmed
            }
        });
    }
    res.json({
        message: value.confirmed ? 'Presença confirmada' : 'Presença cancelada',
        attendance
    });
}));
router.get('/my/attendances', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 10, confirmed } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { userId: req.user.id };
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
router.get('/:id/attendances', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10, confirmed } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { eventId: id };
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
router.get('/stats/overview', auth_1.authenticateToken, auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const [totalEvents, upcomingEvents, totalAttendances, eventsByType] = await Promise.all([
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
exports.default = router;
//# sourceMappingURL=events.js.map