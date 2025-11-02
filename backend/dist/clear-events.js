"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function clearEvents() {
    try {
        console.log('🗑️ Iniciando limpeza de eventos...');
        const allEvents = await prisma.event.findMany({
            select: { id: true, title: true }
        });
        console.log(`📅 Total de eventos encontrados: ${allEvents.length}`);
        if (allEvents.length === 0) {
            console.log('✅ Nenhum evento para deletar');
            return;
        }
        const deleteAttendances = await prisma.eventAttendance.deleteMany({});
        console.log(`🗑️ Removidos ${deleteAttendances.count} registros de presença`);
        const deleteEvents = await prisma.event.deleteMany({});
        console.log(`🗑️ Removidos ${deleteEvents.count} eventos`);
        console.log('✅ Limpeza concluída com sucesso!');
        console.log('📝 Agora você pode criar novos eventos como treinador');
    }
    catch (error) {
        console.error('❌ Erro na limpeza:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
clearEvents();
//# sourceMappingURL=clear-events.js.map