import React from 'react';
import NavigationBar from './NavigationBar';
import { Outlet } from 'react-router-dom';

const Layout = () => (
  <>
    <NavigationBar />
    <main className="main-content">
      <Outlet />
    </main>
  </>
);

export default Layout;
