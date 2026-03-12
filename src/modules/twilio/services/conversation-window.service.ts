import { Injectable, Logger } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { Connection, In, Repository } from 'typeorm'

import {
  ConversationWindowStatus,
  WhatsAppConversationWindow,
} from '../entities/whatsapp-conversation-window.entity'

@Injectable()
export class ConversationWindowService {
  private readonly logger = new Logger(ConversationWindowService.name)

  constructor(
    @InjectRepository(WhatsAppConversationWindow)
    private readonly conversationWindowRepository: Repository<WhatsAppConversationWindow>,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async hasActiveWindow(
    studentId: number,
    phoneNumber: string,
  ): Promise<boolean> {
    const window = await this.findActiveWindow(studentId, phoneNumber)
    return window !== null && window?.isActive()
  }

  async findActiveWindow(
    studentId: number,
    phoneNumber: string,
  ): Promise<WhatsAppConversationWindow | null> {
    const window = await this.conversationWindowRepository.findOne({
      where: {
        studentId,
        phoneNumber,
        status: ConversationWindowStatus.ACTIVE,
      },
      order: {
        updatedAt: 'DESC',
      },
    })

    if (window && !window.isActive()) {
      await this.expireWindow(window.id)
      return null
    }

    return window
  }

  async findOrCreatePendingOptIn(studentId: number, phoneNumber: string) {
    return await this.connection.transaction(async (manager) => {
      const repo = manager.getRepository(WhatsAppConversationWindow)

      let window = await repo.findOne({
        where: { studentId, phoneNumber },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      })

      const previousStatus = window?.status

      if (!window) {
        window = repo.create({
          studentId,
          phoneNumber,
          status: ConversationWindowStatus.PENDING_OPT_IN,
        })
      } else if (window.status !== ConversationWindowStatus.PENDING_OPT_IN) {
        window.status = ConversationWindowStatus.PENDING_OPT_IN
      }

      await repo.save(window)

      this.expireOldWindows(window.id, studentId)

      return { window, status: previousStatus }
    })
  }

  async expireOldWindows(windowId: number, studentId: number) {
    await this.conversationWindowRepository
      .createQueryBuilder()
      .update(WhatsAppConversationWindow)
      .set({
        status: ConversationWindowStatus.EXPIRED,
      })
      .where('id != :windowId', { windowId })
      .andWhere('studentId = :studentId', { studentId })
      .execute()
  }

  async openWindow(
    originalMessageSid: string,
  ): Promise<WhatsAppConversationWindow> {
    const WINDOW_DURATION_HOURS = 23
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + WINDOW_DURATION_HOURS)

    const window = await this.conversationWindowRepository.findOne({
      where: {
        messageSid: originalMessageSid,
      },
    })

    if (!window || window?.status === ConversationWindowStatus.EXPIRED) {
      return null
    }

    window.status = ConversationWindowStatus.ACTIVE
    window.expiresAt = expiresAt

    const savedWindow = await this.conversationWindowRepository.save(window)

    return savedWindow
  }

  async expireWindow(windowId: number): Promise<void> {
    await this.conversationWindowRepository.update(
      { id: windowId },
      { status: ConversationWindowStatus.EXPIRED },
    )
  }

  async optOut(originalMessageSid: string) {
    const window = await this.conversationWindowRepository.findOne({
      where: {
        messageSid: originalMessageSid,
      },
    })

    if (!window || window?.status === ConversationWindowStatus.EXPIRED) {
      return
    }

    await this.conversationWindowRepository.update(
      {
        id: window.id,
      },
      { status: ConversationWindowStatus.OPTED_OUT },
    )

    return {
      window,
    }
  }

  async updateOptInMessageSid(
    windowId: number,
    messageSid: string,
  ): Promise<void> {
    await this.conversationWindowRepository.update(
      { id: windowId },
      { messageSid },
    )
  }

  async getOptedOutByStudentId(
    studentId: number,
    phoneNumber: string,
  ): Promise<boolean> {
    const window = await this.conversationWindowRepository.findOne({
      where: {
        studentId,
        phoneNumber,
        status: ConversationWindowStatus.OPTED_OUT,
      },
    })

    return !!window
  }

  async getOptedOutStudents(studentIds: number[]): Promise<number[]> {
    if (!studentIds.length) {
      return []
    }

    const windows = await this.conversationWindowRepository.find({
      where: {
        studentId: In(studentIds),
        status: ConversationWindowStatus.OPTED_OUT,
      },
      select: ['studentId'],
    })

    return windows.map((w) => w.studentId)
  }

  async deleteOptedOutWindowsOlderThan90Days(): Promise<number> {
    const days = 90

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - days)

    const result = await this.conversationWindowRepository
      .createQueryBuilder()
      .delete()
      .from(WhatsAppConversationWindow)
      .where('status = :status', {
        status: ConversationWindowStatus.OPTED_OUT,
      })
      .andWhere('updatedAt < :date', { date: ninetyDaysAgo })
      .execute()

    return result.affected || 0
  }
}
