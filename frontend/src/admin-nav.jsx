import React, { StrictMode , useState,useEffect } from "react";
import {BrowserRouter, Routes, Route, Link, useLocation,useNavigate} from "react-router-dom";
import { createRoot } from 'react-dom/client';
import {ReportCards, StudentDetails, Dashboard, PaymentTracker,ToRoot} from "./temp.jsx";
import './admin.css';


const NavBar = () => {
return (
<nav className = "Navga">
<Link to="/reportcards">Report Cards</Link> <br />
<Link to="/dashboard">Dashboard</Link> <br />
<Link to = "/studentdetails">Modify Student Info</Link>
<Link to="/payments">Payment Tracker</Link> <br />
<a href="/">Main Menu</a> <br />
</nav>
);
};

export const Browser = () => {
return (
<BrowserRouter>
    <NavBar /> <br />
    <Routes>
    <Route path = "/reportcards" element = {<ReportCards />} />
    <Route path = "/dashboard" element = {<Dashboard />} />
    <Route path = "/studentdetails" element = {<StudentDetails />} />
    <Route path = "/payments" element = {<PaymentTracker />} />
    </Routes>
</BrowserRouter>
);
};


export const NavButtons = () => {

    const navigate = useNavigate(); 

    const location = useLocation();



const goToReports = () => {
navigate("/reportcards")
};

const goToDashboard = () => {
navigate("/dashboard")
};

const goToPayments = () => {
navigate("/payments")
};

const goToStudentDetails = () => {
navigate("/studentdetails")
};

const goToLogin = () => {
  window.location.href = '/';
};


return (
<div className = "NavButs">
<button onClick = {goToReports}> Report Cards </button>
<button onClick = {goToDashboard}> Dashboard </button>
<button onClick = {goToStudentDetails}> Edit Student Records </button>
<button onClick = {goToPayments}> Payment Tracker </button>
<button onClick={goToLogin} className="HomeNav">Main Menu</button>

</div>

);
};
