// src/lib/shift-service.ts
export const createShift = async (supabase, shiftData) => {
  const { data, error } = await supabase
    .from('shifts')
    .insert([
      {
        start_time: shiftData.startTime, // ISO string
        end_time: shiftData.endTime,     // ISO string
        status: 'open',                  // Default status from your enum
        notes: shiftData.notes,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        // Optional: assigned_to or assigned_user_id if known
      }
    ])
    .select();

  if (error) throw error;
  return data;
};