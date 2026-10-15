import { prisma } from "@/config/prisma";
import { CreatePatientInput, UpdatePatientInput } from "@/validation/patient.schema";

export class PatientService {
  /**
   * Get a patient by ID
   */
  static async getPatientById(patientId: string) {
    return prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });
  }

  /**
   * Get a patient by matric number
   */
  static async getPatientByMatricNumber(matricNumber: string) {
    return prisma.patient.findFirst({
      where: { matricNumber },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });
  }

  /**
   * Get a patient by user ID (typically during login/profile lookup)
   */
  static async getPatientByUserId(userId: string) {
    return prisma.patient.findFirst({
      where: { userId },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });
  }

  /**
   * List all patients with optional filters
   */
  static async listPatients(filters?: { search?: string; limit?: number; offset?: number }) {
    const { search, limit = 20, offset = 0 } = filters ?? {};

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { matricNumber: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, fullName: true, role: true },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.patient.count({ where }),
    ]);

    return { patients, total, limit, offset };
  }

  /**
   * Create a patient
   */
  static async createPatient(data: CreatePatientInput) {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) {
      throw new Error(`User with ID ${data.userId} not found`);
    }

    // Verify matric number is unique
    const existingPatient = await prisma.patient.findFirst({
      where: { matricNumber: data.matricNumber },
    });
    if (existingPatient) {
      throw new Error(`Patient with matric number ${data.matricNumber} already exists`);
    }

    return prisma.patient.create({
      data: {
        userId: data.userId,
        matricNumber: data.matricNumber,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender,
      },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });
  }

  /**
   * Update a patient
   */
  static async updatePatient(patientId: string, data: UpdatePatientInput) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      throw new Error(`Patient with ID ${patientId} not found`);
    }

    return prisma.patient.update({
      where: { id: patientId },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });
  }

  /**
   * Delete a patient
   */
  static async deletePatient(patientId: string) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      throw new Error(`Patient with ID ${patientId} not found`);
    }

    return prisma.patient.delete({
      where: { id: patientId },
    });
  }
}
