import React from 'react';

const EmptyState = ({ message = 'No data found.' }) => (
  <div className="text-info text-center py-4" style={{ fontSize: 18 }}>
    {message}
  </div>
);

export default EmptyState;
