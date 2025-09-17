import React from 'react';
const TypingIndicator = ({ typingText, className = "" }) => {
  if (!typingText) return null;
  return (
    <div className={`flex items-center space-x-2 py-2 px-4 text-sm text-gray-600 ${className}`}>
      <div className="flex items-center space-x-1">
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
      </div>
      <span className="italic opacity-80 animate-pulse">{typingText}</span>
    </div>
  );
};
export default TypingIndicator;

