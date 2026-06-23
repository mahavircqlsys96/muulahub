import React from 'react';

export const StatusBadge = ({ status, map }) => {
  const defaults = {
    active: { bg: '#dcfce7', color: '#16a34a' },
    approved: { bg: '#dcfce7', color: '#16a34a' },
    success: { bg: '#dcfce7', color: '#16a34a' },
    completed: { bg: '#dcfce7', color: '#16a34a' },
    pending: { bg: '#fef9c3', color: '#ca8a04' },
    rejected: { bg: '#fee2e2', color: '#dc2626' },
    failed: { bg: '#fee2e2', color: '#dc2626' },
    cancelled: { bg: '#fee2e2', color: '#dc2626' },
    blocked: { bg: '#fee2e2', color: '#dc2626' },
    reported: { bg: '#fde8d8', color: '#c2410c' },
    deleted: { bg: '#f3f4f6', color: '#9ca3af' },
    accepted: { bg: '#dbeafe', color: '#1d4ed8' },
    inactive: { bg: '#f3f4f6', color: '#6b7280' },
  };
  const style = (map && map[status]) || defaults[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      background: style.bg,
      color: style.color,
      textTransform: 'capitalize',
      display: 'inline-block'
    }}>
      {status || '—'}
    </span>
  );
};

export const PageHeader = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
    <div>
      <h5 style={{ margin: 0, fontWeight: '700', color: '#111827' }}>{title}</h5>
      {subtitle && <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const SearchBar = ({ value, onChange, placeholder = 'Search...' }) => (
  <div style={{ position: 'relative', width: '280px' }}>
    <i className="material-icons" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '18px' }}>search</i>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '8px 12px 8px 36px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '14px',
        outline: 'none',
        background: '#f9fafb'
      }}
    />
  </div>
);

export const FilterSelect = ({ value, onChange, options, placeholder = 'All' }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      padding: '8px 32px 8px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '14px',
      outline: 'none',
      background: '#f9fafb',
      cursor: 'pointer',
      appearance: 'none',
      minWidth: '130px'
    }}
  >
    <option value="">{placeholder}</option>
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

export const TableCard = ({ children }) => (
  <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', color: '#111827' }}>
    {children}
  </div>
);

export const TableHead = ({ columns }) => (
  <thead>
    <tr style={{ background: '#f9fafb' }}>
      {columns.map((col, i) => {
        const displayCol = (col === '#' || col === 'S No.' || col === 'S.No.' || col === 'S. No.') ? 'Sr. No.' : col;
        return (
          <th key={i} style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '13px', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
            {displayCol}
          </th>
        );
      })}
    </tr>
  </thead>
);

export const ActionBtn = ({ icon, onClick, color, title }) => {
  let finalColor = color;
  if (!color || color === '#6b7280') {
    if (icon === 'visibility') finalColor = '#0ea5e9'; // Blue for view
    else if (icon === 'edit') finalColor = '#f59e0b'; // Amber for edit
    else if (icon === 'delete') finalColor = '#ef4444'; // Red for delete
    else if (icon === 'add' || icon === 'add_circle') finalColor = '#10b981'; // Green for add
    else if (icon === 'check_circle') finalColor = '#10b981';
    else if (icon === 'cancel' || icon === 'block') finalColor = '#ef4444';
    else finalColor = '#6b7280';
  }
  
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '6px',
        color: finalColor,
        display: 'inline-flex',
        alignItems: 'center',
        transition: 'all 0.15s',
        opacity: 0.85
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `${finalColor}1A`; // 10% opacity background
        e.currentTarget.style.opacity = 1;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'none';
        e.currentTarget.style.opacity = 0.85;
      }}
    >
      <i className="material-icons" style={{ fontSize: '20px' }}>{icon}</i>
    </button>
  );
};

export const Pagination = ({ page, totalPages, onPage }) => {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', padding: '16px' }}>
      <button onClick={() => onPage(page - 1)} disabled={page === 1} style={paginBtnStyle(false, page === 1)}>
        <i className="material-icons" style={{ fontSize: '18px' }}>chevron_left</i>
      </button>
      {start > 1 && <><button onClick={() => onPage(1)} style={paginBtnStyle(false)}>1</button><span style={{ color: '#9ca3af' }}>...</span></>}
      {pages.map(p => (
        <button key={p} onClick={() => onPage(p)} style={paginBtnStyle(p === page)}>{p}</button>
      ))}
      {end < totalPages && <><span style={{ color: '#9ca3af' }}>...</span><button onClick={() => onPage(totalPages)} style={paginBtnStyle(false)}>{totalPages}</button></>}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages} style={paginBtnStyle(false, page === totalPages)}>
        <i className="material-icons" style={{ fontSize: '18px' }}>chevron_right</i>
      </button>
    </div>
  );
};

const paginBtnStyle = (active, disabled = false) => ({
  minWidth: '34px',
  height: '34px',
  padding: '0 8px',
  border: active ? 'none' : '1px solid #e5e7eb',
  borderRadius: '8px',
  background: active ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' : '#fff',
  color: active ? '#fff' : (disabled ? '#d1d5db' : '#374151'),
  fontWeight: active ? '600' : '400',
  fontSize: '13px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: disabled ? 0.5 : 1,
  transition: 'all 0.15s'
});

export const EmptyRow = ({ cols, message = 'No data found' }) => (
  <tr>
    <td colSpan={cols} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '14px' }}>
      <i className="material-icons" style={{ fontSize: '40px', display: 'block', marginBottom: '8px', opacity: 0.4 }}>inbox</i>
      {message}
    </td>
  </tr>
);

export const LoadingRow = ({ cols }) => (
  <tr>
    <td colSpan={cols} style={{ textAlign: 'center', padding: '40px' }}>
      <div className="spinner-border" style={{ width: '28px', height: '28px', color: '#3b82f6' }} />
    </td>
  </tr>
);

export const PrimaryBtn = ({ onClick, icon, label, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: disabled ? '#e5e7eb' : 'linear-gradient(90deg, #f91942, #ff4d6d)',
      color: disabled ? '#9ca3af' : '#fff',
      border: 'none',
      borderRadius: '10px',
      padding: '9px 18px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: disabled ? 'none' : '0 2px 8px rgba(249,25,66,0.3)',
      transition: 'all 0.2s'
    }}
  >
    {icon && <i className="material-icons" style={{ fontSize: '18px' }}>{icon}</i>}
    {label}
  </button>
);

export const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
};

export const formatCurrency = (v) => {
  if (v === null || v === undefined) return '$0.00';
  return `$${parseFloat(v).toFixed(2)}`;
};

export const ImageModal = ({ src, alt, onClose }) => {
  if (!src) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        cursor: 'zoom-out'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '90%',
          maxHeight: '90%',
          background: '#fff',
          borderRadius: '16px',
          padding: '8px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'default'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-16px',
            right: '-16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#fff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#374151',
            transition: 'transform 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <i className="material-icons" style={{ fontSize: '20px' }}>close</i>
        </button>
        <img
          src={src}
          alt={alt || 'Preview'}
          style={{
            maxWidth: '100%',
            maxHeight: 'calc(80vh - 40px)',
            objectFit: 'contain',
            borderRadius: '12px'
          }}
        />
        {alt && (
          <div style={{ padding: '8px 12px 4px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
            {alt}
          </div>
        )}
      </div>
    </div>
  );
};

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h5 style={{ margin: 0, fontWeight: '600', color: '#111827' }}>{title}</h5>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#6b7280' }}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
};
