import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processEmailWithAI } from '../ai-email-processor'

// Mock fetch
global.fetch = vi.fn()

describe('AI Email Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should process email and return analysis', async () => {
    const mockEmail = {
      id: 'test-123',
      threadId: 'thread-123',
      subject: 'Meeting Request',
      from: 'test@example.com',
      body: 'Can we schedule a meeting for next week?',
      date: '2024-01-01',
    }

    const mockLabelsResponse = {
      labels: [
        { id: 'label-1', name: 'Important', type: 'user' },
        { id: 'label-2', name: 'Meeting', type: 'user' },
      ]
    }

    const mockAnalysisResponse = {
      suggestedLabels: ['Meeting', 'Important'],
      needsReply: true,
      suggestedReply: 'Thank you for reaching out. I\'m available next week...',
      confidence: 0.85,
      reasoning: 'This is a meeting request that requires a response.'
    }

    // Mock the fetch calls in the correct order
    ;(fetch as any)
      // First call: get labels (processEmailWithAI)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLabelsResponse
      })
      // Second call: analyze email
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse
      })
      // Third call: get labels again (getLabelIds)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLabelsResponse
      })
      // Fourth call: apply labels
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'modified-message' })
      })
      // Fifth call: create draft
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'draft-123' })
      })

    const result = await processEmailWithAI(mockEmail, {
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      openaiApiKey: 'test-openai-key'
    })

    // Validate the result
    expect(result.id).toBe('test-123')
    expect(result.suggestedLabels).toEqual(['Meeting', 'Important'])
    expect(result.needsReply).toBe(true)
    expect(result.confidence).toBe(0.85)
    expect(result.reasoning).toBe('This is a meeting request that requires a response.')
    expect(result.replyDraft).toBeDefined()

    // Validate that all expected API calls were made
    expect(fetch).toHaveBeenCalledTimes(5)

    // Validate first call: Get labels
    expect(fetch).toHaveBeenNthCalledWith(1, 
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      }
    )

    // Validate second call: Analyze email
    expect(fetch).toHaveBeenNthCalledWith(2, 
      '/api/analyze-email',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: {
            subject: 'Meeting Request',
            from: 'test@example.com',
            content: 'Can we schedule a meeting for next week?',
            date: '2024-01-01',
          },
          existingLabels: ['Important', 'Meeting'],
        }),
      }
    )

    // Validate third call: Get labels again (getLabelIds)
    expect(fetch).toHaveBeenNthCalledWith(3, 
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      }
    )

    // Validate fourth call: Apply labels
    expect(fetch).toHaveBeenNthCalledWith(4, 
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/test-123/modify',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: ['label-2', 'label-1'], // Meeting and Important label IDs
        }),
      }
    )

    // Validate fifth call: Create draft
    expect(fetch).toHaveBeenNthCalledWith(5, 
      'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        // We'll validate the body structure but not the exact base64 content
        body: expect.stringContaining('"threadId":"thread-123"')
      })
    )
  })

  it('should handle API errors gracefully', async () => {
    const mockEmail = {
      id: 'test-123',
      subject: 'Test',
      from: 'test@example.com',
      body: 'Test content',
      date: '2024-01-01',
    }

    // Mock failed fetch for the first call (get labels)
    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
      json: async () => {
        throw new Error('Failed to parse JSON')
      }
    })

    await expect(
      processEmailWithAI(mockEmail, {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        openaiApiKey: 'test-openai-key'
      })
    ).rejects.toThrow('Failed to fetch labels: Unauthorized')
  })
}) 