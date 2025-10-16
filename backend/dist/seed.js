"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Iniciando seed do banco de dados...');
    const adminPassword = await bcryptjs_1.default.hash('admin123', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@z4performance.com' },
        update: {},
        create: {
            email: 'admin@z4performance.com',
            password: adminPassword,
            name: 'Administrador Z4',
            role: 'ADMIN',
            phone: '(41) 99999-9999'
        }
    });
    console.log('✅ Administrador criado:', admin.email);
    const students = [
        {
            email: 'adriane.xavier@email.com',
            name: 'Adriane Xavier da Silva',
            phone: '(41) 99999-0001',
            birthDate: new Date('1980-05-15'),
            height: 165,
            weight: 65,
            goals: 'Melhorar condicionamento físico e perder peso',
            limitations: 'Problema no joelho esquerdo'
        },
        {
            email: 'amanda.melo@email.com',
            name: 'Amanda Melo da Silva',
            phone: '(41) 99999-0002',
            birthDate: new Date('1992-08-22'),
            height: 170,
            weight: 58,
            goals: 'Preparação para maratona',
            limitations: 'Nenhuma'
        },
        {
            email: 'bruno.camargo@email.com',
            name: 'Bruno Matheus Camargo Brasil',
            phone: '(41) 99999-0003',
            birthDate: new Date('1988-12-10'),
            height: 180,
            weight: 80,
            goals: 'Ganho de massa muscular',
            limitations: 'Nenhuma'
        }
    ];
    for (const studentData of students) {
        const password = await bcryptjs_1.default.hash('123456', 12);
        const student = await prisma.user.upsert({
            where: { email: studentData.email },
            update: {},
            create: {
                email: studentData.email,
                password,
                name: studentData.name,
                role: 'STUDENT',
                phone: studentData.phone,
                birthDate: studentData.birthDate,
                studentProfile: {
                    create: {
                        height: studentData.height,
                        weight: studentData.weight,
                        goals: studentData.goals,
                        limitations: studentData.limitations,
                        totalWorkouts: Math.floor(Math.random() * 50) + 10,
                        totalCalories: Math.floor(Math.random() * 10000) + 5000,
                        totalDistance: Math.floor(Math.random() * 500) + 100
                    }
                }
            }
        });
        console.log('✅ Aluno criado:', student.name);
    }
    const workoutPlans = [
        {
            title: 'Treino de Corrida - Base',
            description: 'Treino base para iniciantes na corrida',
            modality: 'RUNNING',
            type: 'Base',
            courseType: 'Plano',
            workoutDate: new Date('2024-01-15'),
            exercises: [
                {
                    sequence: 1,
                    name: 'Aquecimento',
                    description: 'Caminhada leve',
                    instruction: 'Caminhar em ritmo confortável'
                },
                {
                    sequence: 2,
                    name: 'Corrida Contínua',
                    description: 'Corrida em ritmo confortável',
                    instruction: 'Manter ritmo constante e confortável'
                },
                {
                    sequence: 3,
                    name: 'Desaquecimento',
                    description: 'Caminhada leve',
                    instruction: 'Caminhar para relaxar'
                }
            ]
        },
        {
            title: 'Treino de Musculação - Superior',
            description: 'Treino focado no membro superior',
            modality: 'MUSCLE_TRAINING',
            type: 'Superior',
            workoutDate: new Date('2024-01-16'),
            exercises: [
                {
                    sequence: 1,
                    name: 'Supino Reto',
                    description: 'Exercício para peitoral',
                    sets: 3,
                    reps: 12,
                    load: 60,
                    interval: '90 segundos',
                    instruction: 'Executar movimento controlado'
                },
                {
                    sequence: 2,
                    name: 'Puxada Frontal',
                    description: 'Exercício para dorsais',
                    sets: 3,
                    reps: 10,
                    load: 50,
                    interval: '90 segundos',
                    instruction: 'Puxar até o peito'
                },
                {
                    sequence: 3,
                    name: 'Desenvolvimento',
                    description: 'Exercício para ombros',
                    sets: 3,
                    reps: 12,
                    load: 25,
                    interval: '60 segundos',
                    instruction: 'Elevar até a altura dos ombros'
                }
            ]
        }
    ];
    for (const planData of workoutPlans) {
        const { exercises, ...planInfo } = planData;
        const plan = await prisma.workoutPlan.create({
            data: {
                ...planInfo,
                exercises: {
                    create: exercises
                }
            }
        });
        console.log('✅ Planilha criada:', plan.title);
    }
    const events = [
        {
            title: 'Treino em Grupo - Corrida',
            description: 'Treino coletivo de corrida no parque',
            date: new Date('2024-02-15T18:00:00'),
            location: 'Parque Barigui',
            type: 'TRAINING',
            maxAttendees: 20
        },
        {
            title: 'Workshop de Nutrição Esportiva',
            description: 'Palestra sobre alimentação para atletas',
            date: new Date('2024-02-20T19:00:00'),
            location: 'Centro de Treinamento Z4',
            type: 'WORKSHOP',
            maxAttendees: 30
        },
        {
            title: 'Corrida Solidária',
            description: 'Evento beneficente de corrida',
            date: new Date('2024-03-10T08:00:00'),
            location: 'Praça da Liberdade',
            type: 'COMPETITION',
            maxAttendees: 100
        }
    ];
    for (const eventData of events) {
        const event = await prisma.event.create({
            data: eventData
        });
        console.log('✅ Evento criado:', event.title);
    }
    const users = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        take: 2
    });
    for (const user of users) {
        const evaluation = await prisma.evaluation.create({
            data: {
                userId: user.id,
                type: 'INITIAL',
                weight: 70 + Math.random() * 20,
                height: 160 + Math.random() * 20,
                bodyFat: 15 + Math.random() * 10,
                muscleMass: 30 + Math.random() * 15,
                notes: 'Avaliação inicial realizada'
            }
        });
        console.log('✅ Avaliação criada para:', user.name);
    }
    console.log('🎉 Seed concluído com sucesso!');
}
main()
    .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map