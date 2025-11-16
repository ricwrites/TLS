import React, { StrictMode , useState,useEffect } from "react";
import {BrowserRouter, Routes, Route, Link, useLocation,useNavigate} from "react-router-dom";
import { createRoot } from 'react-dom/client';
import {NavButtons} from "./admin-nav.jsx"
import './admin.css';

const AdminHome = () => {
return (
<div>
<NavButtons />
</div>
);
};

export default AdminHome;






