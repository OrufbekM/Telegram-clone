import React, { useState, useEffect } from 'react';

const DarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check for existing dark mode preference in localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    
    // Apply dark mode styles to the document
    if (savedDarkMode) {
      applyDarkMode();
    }
  }, []);

  const applyDarkMode = () => {
    // Apply dark mode styles directly to the document
    document.documentElement.style.backgroundColor = '#000000';
    document.documentElement.style.color = '#ffffff';
    
    // Apply to all elements
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      // Only change text color if it's not already explicitly set to something else
      if (!element.style.color || element.style.color === 'rgb(255, 255, 255)') {
        element.style.color = '#ffffff';
      }
    });
  };

  const removeDarkMode = () => {
    // Remove dark mode styles
    document.documentElement.style.backgroundColor = '';
    document.documentElement.style.color = '';
    
    // Reset all elements
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      if (element.style.color === 'rgb(255, 255, 255)') {
        element.style.color = '';
      }
    });
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      applyDarkMode();
    } else {
      removeDarkMode();
    }
  };

  return (
    <div>
      <button 
        onClick={toggleDarkMode}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '10px 15px',
          backgroundColor: isDarkMode ? '#ffffff' : '#000000',
          color: isDarkMode ? '#000000' : '#ffffff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 9999
        }}
      >
        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
      </button>
    </div>
  );
};

export default DarkMode;