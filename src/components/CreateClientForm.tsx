import React, { useState } from 'react';
import { supabase } from '../supabase';
import { mapDataError } from '../lib/error-mapping';
import { FieldErrors, validateClientForm } from '../lib/validation';
import { invalidateQueriesByPrefix } from '../lib/query-cache';

interface CreateClientFormProps {
  onClientAdded: () => void;
}

type ClientFields = 'firstName' | 'lastName' | 'phone' | 'address' | 'notes';

const CreateClientForm: React.FC<CreateClientFormProps> = ({ onClientAdded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ClientFields>>({});

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const validation = validateClientForm(formData);
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase.from('clients').insert([
        {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          notes: formData.notes.trim(),
          active: true,
        },
      ]);

      if (insertError) throw insertError;

      onClientAdded();
      invalidateQueriesByPrefix(['calendar-dashboard']);
      invalidateQueriesByPrefix(['admin-clients']);
      setFormData({ firstName: '', lastName: '', phone: '', address: '', notes: '' });
      setFieldErrors({});
    } catch (err: any) {
      setError(mapDataError(err?.message || 'Failed to add client.'));
    } finally {
      setLoading(false);
    }
  };

  const setField = (field: ClientFields, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm" noValidate>
      <div className="mb-4 border-b border-emerald-100 pb-2">
        <h3 className="text-lg font-bold text-emerald-900">Add New Client</h3>
        <p className="text-xs text-emerald-500">Managers must add a client before creating shifts for them.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-600" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-emerald-500">First Name</label>
          <input
            type="text"
            required
            placeholder="John"
            className="w-full rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
            value={formData.firstName}
            onChange={(e) => setField('firstName', e.target.value)}
            aria-invalid={Boolean(fieldErrors.firstName)}
          />
          {fieldErrors.firstName && <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>}
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-emerald-500">Last Name</label>
          <input
            type="text"
            required
            placeholder="Doe"
            className="w-full rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
            value={formData.lastName}
            onChange={(e) => setField('lastName', e.target.value)}
            aria-invalid={Boolean(fieldErrors.lastName)}
          />
          {fieldErrors.lastName && <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-emerald-500">Phone Number</label>
        <input
          type="tel"
          placeholder="(555) 000-0000"
          className="w-full rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
          value={formData.phone}
          onChange={(e) => setField('phone', e.target.value)}
          aria-invalid={Boolean(fieldErrors.phone)}
        />
        {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-emerald-500">Service Address</label>
        <input
          type="text"
          placeholder="123 Emerald St, Care City"
          className="w-full rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
          value={formData.address}
          onChange={(e) => setField('address', e.target.value)}
          aria-invalid={Boolean(fieldErrors.address)}
        />
        {fieldErrors.address && <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>}
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-emerald-500">Internal Notes</label>
        <textarea
          placeholder="Special care instructions or gate codes..."
          className="h-24 w-full resize-none rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
          value={formData.notes}
          onChange={(e) => setField('notes', e.target.value)}
          aria-invalid={Boolean(fieldErrors.notes)}
        />
        {fieldErrors.notes && <p className="mt-1 text-xs text-red-600">{fieldErrors.notes}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? 'Adding to Database...' : 'Save Client Profile'}
      </button>
    </form>
  );
};

export default CreateClientForm;
