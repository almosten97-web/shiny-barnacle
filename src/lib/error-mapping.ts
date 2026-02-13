const fallbackMessage = 'An unexpected error occurred. Please try again.';

const includes = (value: string, pattern: string) => value.toLowerCase().includes(pattern);

export const mapAuthError = (rawMessage?: string) => {
  const message = rawMessage || fallbackMessage;
  const normalized = message.toLowerCase();

  if (includes(normalized, 'invalid login credentials')) {
    return 'Email or password is incorrect.';
  }

  if (includes(normalized, 'email not confirmed')) {
    return 'Please confirm your email before logging in.';
  }

  if (includes(normalized, 'password should be at least')) {
    return 'Password does not meet minimum security requirements.';
  }

  if (includes(normalized, 'user already registered')) {
    return 'An account with this email already exists.';
  }

  return message;
};

export const mapDataError = (rawMessage?: string) => {
  const message = rawMessage || fallbackMessage;
  const normalized = message.toLowerCase();

  if (includes(normalized, 'duplicate key')) {
    return 'This record already exists.';
  }

  if (includes(normalized, 'violates foreign key constraint')) {
    return 'Some selected data is no longer valid. Refresh and try again.';
  }

  if (includes(normalized, 'violates row-level security policy')) {
    return 'You do not have permission to perform this action.';
  }

  return message;
};
