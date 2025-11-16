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
<Link to="/root">Main Menu</Link> <br />
<Link to="/">Home</Link> <br />
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
    <Route path = "/root" element = {<ToRoot />} />
    <Route path = "/" element = {<PaymentTracker />} />
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

const goToRoot = () => {
navigate("/root")
};

return (
<div className = "NavButs">
<button onClick = {goToReports}> Report Cards </button>
<button onClick = {goToDashboard}> Dashboard </button>
<button onClick = {goToStudentDetails}> Edit Student Records </button>
<button onClick = {goToPayments}> Payment Tracker </button>
<button onClick = {goToRoot}  className = "HomeNav"> Main Menu </button>
<button onClick={() => window.location.href = "/login.html"}>
  Log out
</button>

</div>

);
};
