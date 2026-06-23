import React from 'react';

const tone = (s) => {
  const v = String(s || '').toLowerCase();
  if (['active', 'success', 'completed', 'approved', 'confirmed'].includes(v)) return 'success';
  if (['inactive', 'cancelled', 'failed', 'rejected', 'hidden', 'closed'].includes(v)) return 'danger';
  if (['pending', 'ongoing', 'in_progress', 'open'].includes(v)) return 'warning';
  return 'secondary';
};

const StatusBadge = ({ status }) => {
  const t = tone(status);
  return (
    <span className={`badge bg-${t} text-capitalize`} style={{ fontSize: 12 }}>
      {status || '—'}
    </span>
  );
};

export default StatusBadge;
