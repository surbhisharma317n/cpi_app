

// Upload.tsx
import { Outlet } from 'react-router-dom';
import React from 'react';

const Upload: React.FC = () => {
  return (
    <div className="mx-auto">
      {/* Removed "Data" heading */}
      <Outlet />
    </div>
  );
};

export default Upload;