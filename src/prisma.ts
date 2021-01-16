import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

// eslint-disable-next-line import/prefer-default-export
export async function getWeeks() {
  return prisma.week.findMany({
    include: {
      battle: {
        select: {
          level: true,
          entry: {
            select: {
              place: true,
              buzz_start: true,
              buzz_awarded: true,
              band: {
                select: {
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
