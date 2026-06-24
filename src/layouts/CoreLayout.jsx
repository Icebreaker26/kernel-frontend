import { Outlet } from 'react-router-dom';

const CoreLayout = () => {
  return (
    <div className="min-h-screen bg-[#020617] font-mono">
      <Outlet />
    </div>
  );
};

export default CoreLayout;
