import React from 'react';

const Loader = ({ fullPage }) => (
  <div
    className={fullPage ? 'd-flex justify-content-center align-items-center' : ''}
    style={
      fullPage
        ? {
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.7)',
            zIndex: 1000,
          }
        : { textAlign: 'center', padding: 24 }
    }
  >
    <div className="spinner-border text-info" style={{ width: 48, height: 48 }} role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

export default Loader;
