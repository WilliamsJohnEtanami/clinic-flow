import { prisma } from "@/config/prisma";
import {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  CancelAppointmentInput,
} from "@/validation/appointment.schema";
import { AppointmentStatus } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/utils/errors";

export class AppointmentService {
  static async getPatientForUser(userId: string) {
    return prisma.patient.findUnique({ where: { userId } });
  }
  /**
   * Get appointment by ID
   */
  static async getAppointmentById(appointmentId: string) {
    return prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
        doctor: {
          select: { id: true, email: true, fullName: true, specialty: true },
        },
      },
    });
  }

  /**
   * List appointments with filters
   */
  static async listAppointments(filters?: {
    doctorId?: string;
    patientId?: string;
    status?: AppointmentStatus;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }) {
    const { doctorId, patientId, status, dateFrom, dateTo, limit = 20, offset = 0 } = filters ?? {};

    const where: Record<string, unknown> = {};
    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.scheduledFor = {};
      if (dateFrom) (where.scheduledFor as Record<string, Date>).gte = dateFrom;
      if (dateTo) (where.scheduledFor as Record<string, Date>).lte = dateTo;
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: {
            include: {
              user: {
                select: { id: true, email: true, fullName: true },
              },
            },
          },
          doctor: {
            select: { id: true, email: true, fullName: true, specialty: true },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { scheduledFor: "asc" },
      }),
      prisma.appointment.count({ where }),
    ]);

    return { appointments, total, limit, offset };
  }

  /**
   * List appointments by patient
   */
  static async listByPatient(
    patientId: string,
    filters?: {
      status?: AppointmentStatus;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.listAppointments({
      patientId,
      status: filters?.status,
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  /**
   * List appointments by doctor
   */
  static async listByDoctor(
    doctorId: string,
    filters?: {
      status?: AppointmentStatus;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.listAppointments({
      doctorId,
      status: filters?.status,
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo,
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  /**
   * Create an appointment
   */
  static async createAppointment(
    data: CreateAppointmentInput & { createdById: string; patientUserId?: string },
  ) {
    let patientId = data.patientId;
    if (!patientId && data.patientUserId) {
      const patient = await prisma.patient.findUnique({ where: { userId: data.patientUserId } });
      patientId = patient?.id;
    }
    if (!patientId && data.patientName) {
      const patient = await prisma.patient.create({
        data: {
          userId: data.patientUserId,
          fullName: data.patientName,
          matricNumber: data.matricNumber || undefined,
          phone: data.phone || undefined,
        },
      });
      patientId = patient.id;
    }
    if (!patientId) throw new NotFoundError("Patient profile");

    if (data.doctorId) {
      const doctor = await prisma.user.findUnique({ where: { id: data.doctorId } });
      if (!doctor || doctor.role !== "DOCTOR") throw new NotFoundError("Doctor");
    }

    return prisma.appointment.create({
      data: {
        patientId,
        doctorId: data.doctorId,
        createdById: data.createdById,
        reason: data.reason,
        scheduledFor: new Date(data.scheduledFor),
        durationMin: data.durationMin,
        notes: data.notes,
      },
      include: {
        patient: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
        doctor: {
          select: { id: true, email: true, fullName: true, specialty: true },
        },
      },
    });
  }

  /**
   * Update an appointment
   */
  static async updateAppointment(appointmentId: string, data: UpdateAppointmentInput) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundError("Appointment");
    }

    // Cannot update cancelled appointments
    if (appointment.status === "CANCELLED") {
      throw new ConflictError("Cannot update a cancelled appointment");
    }

    return prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        reason: data.reason,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
        durationMin: data.durationMin,
        notes: data.notes,
        updatedAt: new Date(),
      },
      include: {
        patient: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
        doctor: {
          select: { id: true, email: true, fullName: true, specialty: true },
        },
      },
    });
  }

  /**
   * Update appointment status
   */
  static async updateStatus(appointmentId: string, status: AppointmentStatus) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundError("Appointment");
    }

    return prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status,
        updatedAt: new Date(),
      },
      include: {
        patient: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
        doctor: {
          select: { id: true, email: true, fullName: true, specialty: true },
        },
      },
    });
  }

  /**
   * Cancel an appointment
   */
  static async cancelAppointment(appointmentId: string, data?: CancelAppointmentInput) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundError("Appointment");
    }

    if (appointment.status === "CANCELLED") {
      throw new ConflictError("Appointment is already cancelled");
    }

    return prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        notes: data?.reason
          ? `${appointment.notes || ""}\n[Cancelled: ${data.reason}]`
          : appointment.notes,
        updatedAt: new Date(),
      },
      include: {
        patient: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
        doctor: {
          select: { id: true, email: true, fullName: true, specialty: true },
        },
      },
    });
  }
}
