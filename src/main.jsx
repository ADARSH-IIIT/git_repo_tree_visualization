import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'




import { Toaster } from 'react-hot-toast';




ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>

    <Toaster  toastOptions={{
    style: {
      // border: '.1px solid black', // Customize border
      // padding: '16px',            // Add padding
      // color: '#4CAF50',             // Text color
      // background: '#f9f9f9',      // Background color
      borderRadius: '8px',        // Rounded corners
      boxShadow: 'rgba(50, 50, 93, 0.25) 0px 30px 60px -12px inset, rgba(0, 0, 0, 0.3) 0px 18px 36px -18px inset'
      // box-shadow: rgba(50, 50, 93, 0.25) 0px 30px 60px -12px inset, rgba(0, 0, 0, 0.3) 0px 18px 36px -18px inset;
    },
  }} />
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
