import React from 'react';
import { useNavigate } from 'react-router-dom';

const Unauthorized = ({ moduleName = 'this' }) => {
  const navigate = useNavigate();

  const formattedName = moduleName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div style={{
      minHeight: '75vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '20px',
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        border: '1px solid #fee2e2'
      }}>
        <div style={{
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          background: '#fee2e2',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto'
        }}>
          <i className="material-icons" style={{ fontSize: '40px' }}>lock</i>
        </div>

        <h3 style={{ fontWeight: '800', color: '#111827', marginBottom: '12px', fontSize: '24px' }}>
          Unauthorized Access
        </h3>

        <p style={{ color: '#4b5563', fontSize: '15px', lineHeight: '1.6', marginBottom: '8px' }}>
          You do not have permission to access the <strong>{formattedName}</strong> module.
        </p>
        <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.5', marginBottom: '28px' }}>
          Your administrative role does not include viewing or editing privileges for this section. Please contact your Super Admin if you need access.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 20px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #f91942 0%, #6366f1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(249, 25, 66, 0.2)'
            }}
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
