import {PrismaClient} from "@prisma/client";

const prismaClient: PrismaClient = new PrismaClient()

export type ProjectState = 'created' | 'progress' | 'finished'
export type FinishProject = {
  uuid: string
  state: ProjectState
  outputFile: string
}
const prismaService = {
  createProject: async (uuid: string) => {
    await prismaClient.project.create({
      data: {
        uuid,
        state: 'created',
        outputFile: ''
      }
    })
  },

  finishProject: async ({uuid, state, outputFile}: FinishProject) => {
    await prismaClient.project.update({
      where: {
        uuid
      },
      data: {
        state,
        outputFile
      }
    })
  },

  getProject: async (uuid: string) => {
    return prismaClient.project.findUnique({
      where: {
        uuid
      }
    })
  }
}

export default prismaService