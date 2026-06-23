import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * Mobile-style back control for admin view/detail pages.
 */
const ViewBackButton = ({ to, label = "BACK" }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="btn d-inline-flex align-items-center gap-2"
      style={{
        backgroundColor: '#e9ecef',
        color: '#2b3d51',
        borderRadius: '12px',
        padding: '6px 16px',
        border: 'none',
        fontWeight: '700',
        fontSize: '14px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        marginRight: '12px'
      }}
      onClick={() => (to != null && to !== "" ? navigate(to) : navigate(-1))}
    >
      <i className="material-icons" style={{ fontSize: '20px', fontWeight: 'bold' }}>
        arrow_back
      </i>
      <span style={{ letterSpacing: '0.5px' }}>{label}</span>
    </button>
  );
};

export default ViewBackButton;
