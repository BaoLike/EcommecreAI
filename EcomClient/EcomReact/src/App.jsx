import './App.css'
import Home from './components/home/Home'
import Products from './components/products/Product'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/shared/Navbar'
import About from './components/About'
import Contact from './components/Contact'
import { Toaster } from 'react-hot-toast'
import React, { useEffect } from 'react'
import Cart from './components/cart/Cart'
import Login from './components/auth/Login'
import PrivateRoute from './components/PrivateRoute'
import Register from './components/auth/Register'
import Profile from './profile/profile'
import Dashboard from './admin/Dashboard'
import OrderManagement from './admin/OrderManagement'
import ProductManagement from './admin/ProductManagement'
import AddProduct from './admin/AddProduct'
import OrderHistory from './components/order/OrderHistory'
import { fetchCart } from './store/action'
import Checkout from './components/checkout/Checkout'
import { useDispatch } from 'react-redux'

import { fetchLocations } from "./store/reducers/LocateReducer";
import { fetchLocationsAddress } from './store/reducers/LocationReducer'
import PaymentResult from './components/checkout/PaymentResult'
import AssistantWidget from './components/assistant/AssistantWidget'


function AppContent() {
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
          if (localStorage.getItem('auth')) {
            fetchCart();
            dispatch(fetchLocationsAddress()).catch(() => {});
          }
          dispatch(fetchLocations());
  }, [dispatch]);

  const hideNavbarRoutes = ['/login', '/register'];
  const shouldShowNavbar = !hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      {shouldShowNavbar && <Navbar />}
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/products' element={<Products />} />
        <Route path='/about' element={<About />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/cart' element={<Cart />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/checkout' element={<Checkout/>}/>
        <Route path='/payment' element={<PaymentResult/>}/>
        <Route element={<PrivateRoute />}>
          <Route path='profile' element={<Profile />}>
            <Route element={<PrivateRoute requiredRole="ROLE_ADMIN" />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="admin/orders" element={<OrderManagement />} />
              <Route path="admin/products" element={<ProductManagement />} />
              <Route path="admin/products/add" element={<AddProduct />} />
            </Route>
          </Route>
          <Route path='/profile/order' element={<OrderHistory />} />
        </Route>
      </Routes>
      <Toaster position='top-center' />
      <AssistantWidget />
    </>
  )
}

// Component chính
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
