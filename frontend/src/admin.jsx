import React, { StrictMode , useState,useEffect } from "react";
import {BrowserRouter, Routes, Route, Link, useLocation,useNavigate} from "react-router-dom";
import { createRoot } from "react-dom/client";
import AdminHome from "./admin-home.jsx";
import {Browser, NavButtons} from "./admin-nav.jsx";
import {ReportCards, StudentDetails, Dashboard, PaymentTracker,ToRoot} from "./temp.jsx";
import './admin.css';

const AdminPage = () => (
  <BrowserRouter basename="/admin">
    {/* This stays visible on every page */}
    <NavButtons />

    {/* Page content changes below */}
    <div className="page-content">
      <Routes>
        <Route path="reportcards" element={<ReportCards />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="studentdetails" element={<StudentDetails />} />
        <Route path="payments" element={<PaymentTracker />} />
        <Route path="/" element={<ToRoot />} /> {/* Default page */}
      </Routes>
    </div>
  </BrowserRouter>
);

const DummyApp = () => {
return <p> Well, would you look at that! </p>;
};


const rootElement = document.getElementById("root");
console.log("rootElement:", rootElement)
const root = createRoot(rootElement);
root.render(<AdminPage />);



