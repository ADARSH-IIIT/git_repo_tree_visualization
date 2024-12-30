import React, { useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import './landing_page.css';
import toast from 'react-hot-toast'

export default function LandingPage() {


const navigate = useNavigate();



function handle_click() {

      const url  = document.getElementById('git_repo_link').value;
  
  
  const regex = /^https?:\/\/github\.com\/([a-zA-Z0-9-_]+)\/([a-zA-Z0-9-_]+)(\/tree\/([a-zA-Z0-9-_]+))?.*$/;
  const match = url.match(regex);

  if (!match) {
    
    toast.error("invalid repo link")
    return;
  }

  // Extracting owner, repo, and branch (default to 'main' if not specified)
  const owner = match[1];
  const repo = match[2];
  const branch = match[4] || "main";

  // Constructing the new path
  const newPath = `/${owner}/${repo}/${branch}`;

  // Navigating to the new page
  navigate(newPath);
}



useEffect(() => {
  const handleKeyDown = (e) => {
  

    if (e.key === 'Enter') {
      handle_click()
  }
  };

  document.addEventListener("keydown", handleKeyDown);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
  };
}, []);


  return (
    <div className="landing-page">
      {/* Background Circles for blur effect */}
      <div className="blur-circle blur-circle1" />
      <div className="blur-circle blur-circle2" />
      <div className="blur-circle blur-circle3" />

      {/* Content Container */}
      <div className="content-container">
        <div className="content">
          {/* Heading */}
          <div className="text-center">
            <h1 className="heading">Visualize Repo</h1>
            <p className="subheading">
              Transform your repository into an interactive visualization
            </p>
          </div>

          {/* Input Field */}
          <div className="input-container">
            <input
              type="text"
              placeholder="repository_link_here.git"
              className="input-field" 
              id='git_repo_link'
            />
          </div>

          {/* Button */}
          <button className="action-button" onClick={handle_click}>Go Blast 🚀</button>

          {/* Footer Text */}
          <p className="footer-text">Enter a GitHub repository link to begin</p>
        </div>
      </div>

      {/* Attribution */}
      <div className="attribution">Credit : Adarsh_Dwivedi_Claude_Chatgpt</div>
    </div>
  );
}
