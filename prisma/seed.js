const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('>>> SEED FILE EXECUTED <<<');

  const hash = await bcrypt.hash('Admin123!', 10);

  await prisma.barber.create({
    data: {
      name: 'Admin Kullanıcı',
      email: 'admin@themenshair.com',
      password: hash,
      role: 'admin',
      isActive: true,
      slotDuration: 15,
      workingHours: {
        createMany: {
          data: [
            { dayOfWeek: 1, startTime: '10:00', endTime: '22:00', isWorking: true },
            { dayOfWeek: 2, startTime: '10:00', endTime: '22:00', isWorking: true },
            { dayOfWeek: 3, startTime: '10:00', endTime: '22:00', isWorking: true },
            { dayOfWeek: 4, startTime: '10:00', endTime: '22:00', isWorking: true },
            { dayOfWeek: 5, startTime: '10:00', endTime: '22:00', isWorking: true },
            { dayOfWeek: 6, startTime: '10:00', endTime: '22:00', isWorking: true }
          ]
        }
      }
    }
  });

  await prisma.barber.create({
    data: {
      name: 'Berber 1',
      email: 'berber1@themenshair.com',
      password: hash,
      role: 'barber',
      isActive: true,
      slotDuration: 15,
      workingHours: {
        createMany: {
          data: [
            { dayOfWeek: 1, startTime: '10:00', endTime: '22:00', isWorking: true },
            { dayOfWeek: 2, startTime: '10:00', endTime: '22:00', isWorking: true },
            { dayOfWeek: 3, startTime: '10:00', endTime: '22:00', isWorking: true },
            { dayOfWeek: 4, startTime: '10:00', endTime: '22:00', isWorking: true },
            { dayOfWeek: 5, startTime: '10:00', endTime: '22:00', isWorking: true },
            { dayOfWeek: 6, startTime: '10:00', endTime: '22:00', isWorking: true }
          ]
        }
      }
    }
  });

  console.log('>>> SEED FINISHED <<<');
}

main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
