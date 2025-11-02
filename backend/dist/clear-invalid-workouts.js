"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function clearInvalidWorkouts() {
    try {
        console.log('🗑️ Iniciando limpeza de treinos inválidos...');
        const minDate = new Date('2020-01-01');
        const invalidWorkouts = await prisma.workout.findMany({
            where: {
                OR: [
                    { completedAt: null },
                    { completedAt: { lt: minDate } }
                ]
            },
            select: { id: true, modality: true, completedAt: true }
        });
        console.log(`📅 Total de treinos inválidos encontrados: ${invalidWorkouts.length}`);
        if (invalidWorkouts.length === 0) {
            console.log('✅ Nenhum treino inválido para deletar');
            return;
        }
        invalidWorkouts.forEach((workout, index) => {
            console.log(`${index + 1}. ID: ${workout.id}, Modalidade: ${workout.modality}, Data: ${workout.completedAt || 'null'}`);
        });
        const deleteResult = await prisma.workout.deleteMany({
            where: {
                OR: [
                    { completedAt: null },
                    { completedAt: { lt: minDate } }
                ]
            }
        });
        console.log(`🗑️ Removidos ${deleteResult.count} treinos inválidos`);
        console.log('✅ Limpeza concluída com sucesso!');
    }
    catch (error) {
        console.error('❌ Erro na limpeza:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
clearInvalidWorkouts();
//# sourceMappingURL=clear-invalid-workouts.js.map