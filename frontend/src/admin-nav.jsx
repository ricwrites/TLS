import React, { StrictMode , useState,useEffect } from "react";
import {BrowserRouter, Routes, Route, Link, useLocation,useNavigate} from "react-router-dom";
import { createRoot } from 'react-dom/client';
import {ReportCards, StudentDetails, Dashboard, PaymentTracker,ToRoot, CertificatesHome} from "./temp.jsx";
import { AdminCalendar } from "./admincalendar.jsx";
import './admin.css';


const NavBar = () => {
return (
<nav className = "Navga">
<Link to="/reportcards">Report Cards</Link> <br />
<Link to="/dashboard">Dashboard</Link> <br />
<Link to = "/studentdetails">Modify Student Info</Link>
<Link to="/payments">Payment Tracker</Link> <br />
<Link to="/certificates">Certificates</Link> <br />
<Link to="/events">Events</Link> <br />
<Link to="/newsletter">Newsletter</Link> <br />
<Link to="/calendar">Calendar</Link> <br />
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
    <Route path = "/certificates" element = {<CertificatesHome />} />
    <Route path = "/events" element = {<Events />} />
    <Route path = "/calendar" element = {<AdminCalendar />} />
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
  window.location.href = 'https://thelearningsanctuary.quest';
};

const goToCertificates = () => {
  navigate("/certificates");
};

const goToEvents = () => {
  navigate("/events");
};

const goToNewsletter = () => {
  navigate("/newsletter");
};

const goToCalendar = () => {
  navigate("/calendar");
};


return (
<div className = "NavButs">
<button onClick = {goToReports}> Report Cards </button>
<button onClick = {goToDashboard}> Dashboard </button>
<button onClick = {goToStudentDetails}> Edit Student Records </button>
<button onClick = {goToPayments}> Payment Tracker </button>
<button onClick = {goToCertificates}> Certificates </button>
<button onClick = {goToEvents}> Events </button>
<button onClick = {goToNewsletter}> Newsletter </button>
<button onClick = {goToCalendar}> Calendar </button>
<button onClick={goToLogin} className="HomeNav">Website</button>

</div>

);
};
