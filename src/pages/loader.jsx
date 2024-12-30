import React, { useState, useEffect } from 'react';

const FunnyLoader = ({loading_heading}) => {
  const [loadingText, setLoadingText] = useState('');
  
  const funnyTexts = [
    "Downloading more RAM...",
    "Teaching AI to make coffee...",
    "Convincing electrons to flow faster...",
    "Debugging quantum fluctuations...",
    "Reticulating splines...",
    "Asking ChatGPT for the meaning of life...",
    "Updating HTML to version 6...",
    "Converting caffeine to code...",
    "Waiting for stackoverflow response...",
    "Negotiating with server hamsters..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * funnyTexts.length);
      setLoadingText(funnyTexts[randomIndex]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      {/* Loader container */}
      <div className="relative w-20 h-20">
        {/* Circular loader */}
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
      
      {/* Main loading text */}
      <div className="mt-8 text-xl font-semibold text-gray-700">
       {loading_heading}
      </div>
      
      {/* Funny text */}
      <div className="mt-4 text-gray-500 italic text-center px-4">
        {loadingText}
      </div>
    </div>
  );
};

export default FunnyLoader;