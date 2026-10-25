import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const PrivateRoute = ({publicPage = false, requiredRole}) =>{
    let user = null;
    try { user = JSON.parse(localStorage.getItem("auth") || "null"); } catch {}
    const roles = Array.isArray(user?.roles) ? user.roles : [];

    if (publicPage) {
        return user ? <Navigate to="/profile" /> : <Outlet/>
    }
    if (!user) return <Navigate to="/login" replace />;
    if (requiredRole && !roles.includes(requiredRole)) return <Navigate to="/profile" replace />;
    return <Outlet/>;
}

export default PrivateRoute
