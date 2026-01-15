
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { supabase } from './supabase';

// Mock the supabase client
jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
    },
    from: jest.fn(() => ({})),
  },
}));

describe('App', () => {
  const mockGetSession = supabase.auth.getSession as jest.Mock;
  const mockFrom = supabase.from as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<App />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders the login page when no user is logged in', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/FlexShift Login/i)).toBeInTheDocument();
    });
  });

  it('renders the employee dashboard for a user with the "user" role', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: '123' } } } });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { id: '123', full_name: 'Test User', role: 'user' }, 
        error: null 
      }),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Employee Dashboard/i)).toBeInTheDocument();
    });
  });

  it('renders the admin dashboard for a user with the "admin" role', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: '456' } } } });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { id: '456', full_name: 'Test Admin', role: 'admin' }, 
        error: null 
      }),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
    });
  });

  it('renders the no role page for a user with no assigned role', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: '789' } } } });
    mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { id: '789', full_name: 'Test NoRole', role: null }, 
          error: null 
        }),
      });
  
      render(<App />);
  
      await waitFor(() => {
        expect(screen.getByText(/Account Pending Approval/i)).toBeInTheDocument();
      });
  });
});
