import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { mapDataError } from '../lib/error-mapping';
import { invalidateQueriesByPrefix, useCachedQuery } from '../lib/query-cache';
import { FieldErrors, validateShiftForm } from '../lib/validation';
import { toUtcISOString } from '../lib/datetime';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface CreateShiftFormProps {
  onShiftCreated: () => void;
}

type ShiftFields = 'clientId' | 'date' | 'startTime' | 'endTime' | 'notes';

const CreateShiftForm: React.FC<CreateShiftFormProps> = ({ onShiftCreated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ShiftFields>>({});

  const [formData, setFormData] = useState({
    clientId: '',
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    notes: '',
  });

  const {
    data: clients = [],
    error: clientsError,
    isLoading: loadingClients,
  } = useCachedQuery<Client[]>({
    queryKey: ['form-clients'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .eq('active', true)
        .order('last_name', { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  useEffect(() => {
    if (clientsError) {
      setError(clientsError);
    }
  }, [clientsError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateShiftForm(formData);
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startDateTime = toUtcISOString(formData.date, formData.startTime);
      const endDateTime = toUtcISOString(formData.date, formData.endTime);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from('shifts').insert([
        {
          start_time: startDateTime,
          end_time: endDateTime,
          notes: formData.notes.trim(),
          status: 'draft',
          created_by: user?.id,
          assigned_to: formData.clientId,
        },
      ]);

      if (insertError) throw insertError;

      onShiftCreated();
      invalidateQueriesByPrefix(['employee-dashboard']);
      setFormData({ clientId: '', date: '', startTime: '09:00', endTime: '17:00', notes: '' });
      setFieldErrors({});
    } catch (err: any) {
      setError(mapDataError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const setField = (field: ShiftFields, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm" noValidate>
      <div className="mb-4 border-b border-emerald-100 pb-2">
        <h3 className="font-bold text-emerald-900">Create New Shift</h3>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-600" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-emerald-500">Assign to Client</label>
        <select
          required
          className="w-full rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
          value={formData.clientId}
          onChange={(e) => setField('clientId', e.target.value)}
          aria-invalid={Boolean(fieldErrors.clientId)}
          disabled={loadingClients}
        >
          <option value="">-- Select a Client --</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}
            </option>
          ))}
        </select>
        {fieldErrors.clientId && <p className="mt-1 text-xs text-red-600">{fieldErrors.clientId}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-emerald-500">Date</label>
          <input
            type="date"
            required
            className="w-full rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-900"
            value={formData.date}
            onChange={(e) => setField('date', e.target.value)}
            aria-invalid={Boolean(fieldErrors.date)}
          />
          {fieldErrors.date && <p className="mt-1 text-xs text-red-600">{fieldErrors.date}</p>}
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-emerald-500">Start</label>
          <input
            type="time"
            required
            className="w-full rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-900"
            value={formData.startTime}
            onChange={(e) => setField('startTime', e.target.value)}
            aria-invalid={Boolean(fieldErrors.startTime)}
          />
          {fieldErrors.startTime && <p className="mt-1 text-xs text-red-600">{fieldErrors.startTime}</p>}
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-emerald-500">End</label>
          <input
            type="time"
            required
            className="w-full rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-900"
            value={formData.endTime}
            onChange={(e) => setField('endTime', e.target.value)}
            aria-invalid={Boolean(fieldErrors.endTime)}
          />
          {fieldErrors.endTime && <p className="mt-1 text-xs text-red-600">{fieldErrors.endTime}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-emerald-500">Shift Notes</label>
        <textarea
          placeholder="Add specific care instructions..."
          className="h-20 w-full resize-none rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-900"
          value={formData.notes}
          onChange={(e) => setField('notes', e.target.value)}
          aria-invalid={Boolean(fieldErrors.notes)}
        />
        {fieldErrors.notes && <p className="mt-1 text-xs text-red-600">{fieldErrors.notes}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-200 transition-colors hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Post Shift'}
      </button>
    </form>
  );
};

export default CreateShiftForm;
