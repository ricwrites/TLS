import React, { StrictMode , useState,useEffect } from "react";
import {BrowserRouter, Routes, Route, Link, useLocation,useNavigate} from "react-router-dom";
import { createRoot } from "react-dom/client";
import AdminHome from "./admin-home.jsx";
import {Browser, NavButtons} from "./admin-nav.jsx";
import {ReportCards, StudentDetails, Dashboard, PaymentTracker,ToRoot, CertificatesHome, TransferCertificate, Events, Newsletter } from "./temp.jsx";
import { AdminCalendar } from "./admincalendar.jsx"; 
import './admin.css';



const AdminPage = () => {

  useEffect(() => {
    const afterPrint = () => {
      document.body.style.visibility = "visible";
    };

    window.addEventListener("afterprint", afterPrint);

    return () => {
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  return (
    <BrowserRouter>
      {/* This stays visible on every page */}
      <NavButtons />

      {/* Page content changes below */}
      <div className="page-content">
        <Routes>
          <Route path="/reportcards" element={<ReportCards />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/studentdetails" element={<StudentDetails />} />
          <Route path="/payments" element={<PaymentTracker />} />
          <Route path="/" element={<ToRoot />} />
          <Route path="/certificates" element={<CertificatesHome />} />
          <Route path="/certificates/transfer" element={<TransferCertificate />} />
          <Route path="/events" element={<Events />} />
          <Route path="/newsletter" element={<Newsletter />} />
          <Route path="/calendar" element={<AdminCalendar />} />            
        </Routes>
      </div>
    </BrowserRouter>
  );
};




const rootElement = document.getElementById("root");
console.log("rootElement:", rootElement)
const root = createRoot(rootElement);
root.render(<AdminPage />);



