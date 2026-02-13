export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export interface ValidationResult<T extends string> {
  valid: boolean;
  fieldErrors: FieldErrors<T>;
}

type Rule<TValues> = {
  test: (value: string, values: TValues) => boolean;
  message: string;
};

type Schema<TValues extends Record<string, string>> = {
  [K in keyof TValues]?: Rule<TValues>[];
};

const required = (value: string) => value.trim().length > 0;

const validateBySchema = <TValues extends Record<string, string>>(
  values: TValues,
  schema: Schema<TValues>
): ValidationResult<Extract<keyof TValues, string>> => {
  const fieldErrors: FieldErrors<Extract<keyof TValues, string>> = {};

  (Object.keys(schema) as Array<keyof TValues>).forEach((field) => {
    const rules = schema[field] ?? [];
    const value = values[field] ?? '';

    for (const rule of rules) {
      if (!rule.test(value, values)) {
        fieldErrors[field as Extract<keyof TValues, string>] = rule.message;
        break;
      }
    }
  });

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9()+\-\s]{7,20}$/;

export interface LoginFormValues {
  email: string;
  password: string;
}

export const validateLoginForm = (values: LoginFormValues) => {
  return validateBySchema(values, {
    email: [
      { test: required, message: 'Email is required.' },
      { test: (value) => emailPattern.test(value), message: 'Enter a valid email address.' },
    ],
    password: [
      { test: required, message: 'Password is required.' },
      { test: (value) => value.length >= 8, message: 'Password must be at least 8 characters.' },
    ],
  });
};

export interface ClientFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  notes: string;
}

export const validateClientForm = (values: ClientFormValues) => {
  return validateBySchema(values, {
    firstName: [
      { test: required, message: 'First name is required.' },
      { test: (value) => value.trim().length <= 50, message: 'First name must be 50 characters or less.' },
    ],
    lastName: [
      { test: required, message: 'Last name is required.' },
      { test: (value) => value.trim().length <= 50, message: 'Last name must be 50 characters or less.' },
    ],
    phone: [
      { test: (value) => !value || phonePattern.test(value), message: 'Phone format is invalid.' },
    ],
    address: [
      { test: (value) => value.trim().length <= 200, message: 'Address must be 200 characters or less.' },
    ],
    notes: [
      { test: (value) => value.trim().length <= 500, message: 'Notes must be 500 characters or less.' },
    ],
  });
};

export interface ShiftFormValues {
  clientId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

const timePattern = /^\d{2}:\d{2}$/;

export const validateShiftForm = (values: ShiftFormValues) => {
  const base = validateBySchema(values, {
    clientId: [{ test: required, message: 'Please select a client.' }],
    date: [{ test: required, message: 'Date is required.' }],
    startTime: [
      { test: required, message: 'Start time is required.' },
      { test: (value) => timePattern.test(value), message: 'Start time is invalid.' },
    ],
    endTime: [
      { test: required, message: 'End time is required.' },
      { test: (value) => timePattern.test(value), message: 'End time is invalid.' },
    ],
    notes: [{ test: (value) => value.trim().length <= 500, message: 'Notes must be 500 characters or less.' }],
  });

  if (!base.fieldErrors.startTime && !base.fieldErrors.endTime && values.date) {
    const start = new Date(`${values.date}T${values.startTime}:00`);
    const end = new Date(`${values.date}T${values.endTime}:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return {
        valid: false,
        fieldErrors: {
          ...base.fieldErrors,
          startTime: 'Invalid date/time combination.',
        },
      };
    }

    if (end <= start) {
      return {
        valid: false,
        fieldErrors: {
          ...base.fieldErrors,
          endTime: 'End time must be after start time.',
        },
      };
    }
  }

  return base;
};
