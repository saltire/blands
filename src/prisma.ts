import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

// eslint-disable-next-line import/prefer-default-export
export async function getWeeks() {
  return prisma.week.findMany({
    include: {
      battles: {
        select: {
          level: true,
          entries: {
            select: {
              place: true,
              buzzStart: true,
              buzzAwarded: true,
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
