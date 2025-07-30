import { POST } from '../app/api/add-task/route.js'; 
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GmailNotificationService } from '../lib/gmailService';

jest.mock('@supabase/ssr');
jest.mock('next/headers');
jest.mock('../lib/gmailService');

describe('POST handler', () => {
  let mockReq;
  let mockCookiesStore;

  beforeEach(() => {
    jest.clearAllMocks();

    
    mockReq = {
      json: jest.fn(),
    };

    
    mockCookiesStore = {
      getAll: jest.fn(),
      set: jest.fn(),
    };
    cookies.mockResolvedValue(mockCookiesStore);

    
    const mockSupabase = {
      auth: {
        getSession: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      insert: jest.fn(),
    };
    createServerClient.mockReturnValue(mockSupabase);

    
    GmailNotificationService.mockImplementation(() => ({
      sendScheduleNotification: jest.fn(),
    }));

    
    global.Response = {
      json: jest.fn((body, opts) => ({ body, opts })),
    };
  });

  it('successfully inserts task and sends Gmail notification', async () => {
    const body = {
      user_id: 'user-123',
      class_id: '5',
      title: 'New Task',
    };

    mockReq.json.mockResolvedValue(body);

    
    const mockDataInserted = [{ id: 42 }];

    createServerClient.mockReturnValueOnce({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: body.user_id } } }, error: null }),
      },
      from: () => ({
        insert: jest.fn().mockResolvedValue({ data: mockDataInserted, error: null }),
      }),
    });

    
    const sendScheduleNotificationMock = jest.fn().mockResolvedValue();

    GmailNotificationService.mockImplementation(() => ({
      sendScheduleNotification: sendScheduleNotificationMock,
    }));

    const response = await POST(mockReq);

    expect(mockReq.json).toHaveBeenCalled();

    
    expect(createServerClient).toHaveBeenCalled();

    
    const expectedInsertArg = expect.arrayContaining([
      expect.objectContaining({
        class_id: 5,
        user_id: 'user-123',
        title: 'New Task',
      }),
    ]);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockDataInserted);

    
    expect(GmailNotificationService).toHaveBeenCalled();
    expect(sendScheduleNotificationMock).toHaveBeenCalledWith(
      'stclairevin@gmail.com',
      expect.arrayContaining([
        expect.objectContaining({
          id: 42,
          title: 'New Task',
          class_name: 'Assignment',
        }),
      ])
    );

    
    expect(Response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockDataInserted })
    );
  });

  it('returns 401 when no session or session error', async () => {
    mockReq.json.mockResolvedValue({ user_id: 'user-123', class_id: '' });

    createServerClient.mockReturnValueOnce({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: 'SessionError' }),
      },
      from: jest.fn().mockReturnThis(),
    });

    const response = await POST(mockReq);

    expect(Response.json).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  });

  it('returns 403 when user_id mismatch', async () => {
    const body = { user_id: 'user-abc', class_id: '' };

    mockReq.json.mockResolvedValue(body);

    createServerClient.mockReturnValueOnce({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-xyz' } } }, error: null }),
      },
      from: jest.fn().mockReturnThis(),
    });

    const response = await POST(mockReq);

    expect(Response.json).toHaveBeenCalledWith(
      { error: 'Unauthorized: User ID mismatch' },
      { status: 403 }
    );
  });

  it('handles supabase insert error', async () => {
    const body = { user_id: 'user-123', class_id: '' };

    mockReq.json.mockResolvedValue(body);

    createServerClient.mockReturnValueOnce({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null }),
      },
      from: () => ({
        insert: jest.fn().mockResolvedValue({ data: null, error: 'InsertError' }),
      }),
    });

    const response = await POST(mockReq);

    expect(Response.json).toHaveBeenCalledWith(
      { error: 'InsertError' },
      { status: 500 }
    );
  });

  it('catches error in Gmail notification but still returns success', async () => {
    const body = {
      user_id: 'user-123',
      class_id: '',
      title: 'Task Title',
    };

    mockReq.json.mockResolvedValue(body);

    const mockDataInserted = [{ id: 77 }];

    createServerClient.mockReturnValueOnce({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: body.user_id } } }, error: null }),
      },
      from: () => ({
        insert: jest.fn().mockResolvedValue({ data: mockDataInserted, error: null }),
      }),
    });

    
    GmailNotificationService.mockImplementation(() => ({
      sendScheduleNotification: jest.fn().mockRejectedValue(new Error('Gmail error')),
    }));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(mockReq);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send Gmail notification:', expect.any(Error));
    expect(Response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockDataInserted })
    );

    consoleErrorSpy.mockRestore();
  });

  it('returns 500 on unexpected error', async () => {
    mockReq.json.mockRejectedValue(new Error('Unexpected error'));

    const response = await POST(mockReq);

    expect(Response.json).toHaveBeenCalledWith(
      { error: 'Internal server error' },
      { status: 500 }
    );
  });
});