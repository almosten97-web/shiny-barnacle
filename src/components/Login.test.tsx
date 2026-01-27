import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Login from './Login';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
    },
  },
}));

describe('Login', () => {
  it('submits the email for magic link login', async () => {
    const onError = vi.fn();
    const onLoginSuccess = vi.fn();
    const signInWithOtp = vi.mocked(supabase.auth.signInWithOtp);
    signInWithOtp.mockResolvedValue({ error: null } as never);

    render(
      <Login
        onError={onError}
        onLoginSuccess={onLoginSuccess}
        message={null}
      />
    );

    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send sign-in link/i }));

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: {
        emailRedirectTo: window.location.href,
      },
    });
    expect(await screen.findByText(/sign-in link sent/i)).toBeInTheDocument();
  });
});
