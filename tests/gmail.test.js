import { jest } from '@jest/globals'
import { gmailService } from '../lib/gmailService'

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn()
      }))
    },
    gmail: jest.fn().mockImplementation(() => ({
      users: {
        messages: {
          send: jest.fn().mockResolvedValue({ data: { id: 'mock-message-id' } })
        }
      }
    }))
  }
}))

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(JSON.stringify({
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    expiry_date: Date.now() + 3600000 
  })),
  writeFileSync: jest.fn()
}))

describe('GmailNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendScheduleNotification', () => {
    const testAssignments = [
      {
        title: 'Math Assignment',
        description: 'Complete practice',
        due_date: '2025-08-01T23:59:59Z',
        type: 'homework',
        priority: 'medium',
        estimated_hours: 3
      }
    ]

    test('should send schedule notification successfully', async () => {
      const result = await gmailService.sendScheduleNotification('test@example.com', testAssignments)
      
      expect(result.success).toBe(true)
      expect(result.messageId).toBe('mock-message-id')
      expect(result.message).toContain('Schedule notification sent successfully')
    })

    test('should handle empty assignments array', async () => {
      const result = await gmailService.sendScheduleNotification('test@example.com', [])
      
      expect(result.success).toBe(true)
    })
  })

  describe('sendReminderNotification', () => {
    const testTasks = [
      {
        title: 'CS Project',
        due_date: '2025-08-02T18:00:00Z',
        priority: 'high'
      }
    ]

    test('should send reminder notification successfully', async () => {
      const result = await gmailService.sendReminderNotification('test@example.com', testTasks)
      
      expect(result.success).toBe(true)
      expect(result.messageId).toBe('mock-message-id')
      expect(result.message).toContain('Reminder notification sent successfully')
    })
  })


  describe('getTimeUntilDue', () => {
    test('should calculate time until due correctly', () => {
      const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) 
      const result = gmailService.getTimeUntilDue(future.toISOString())
      
      expect(result).toContain('2 days')
    })

    test('should handle overdue tasks', () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000) 
      const result = gmailService.getTimeUntilDue(past.toISOString())
      
      expect(result).toBe('Overdue')
    })
  })
})
