import React from 'react';

const SimpleLoader = () => {
  return (
    <div className="w-[100%] h-screen flex items-center justify-center">
      <div className="flex gap-1 items-end">
        <div className="flex flex-col items-center animate-[bounce_1s_ease-in-out_infinite_0.1s]">
          <div className="w-1 h-6 bg-green-500" />
          <div className="w-3 h-12 bg-green-500 rounded-sm" />
          <div className="w-1 h-6 bg-green-500" />
        </div>
        <div className="flex flex-col items-center animate-[bounce_1s_ease-in-out_infinite_0.2s] relative bottom-4">
          <div className="w-1 h-6 bg-green-500" />
          <div className="w-3 h-12 bg-green-500 rounded-sm" />
          <div className="w-1 h-6 bg-green-500" />
        </div>
        <div className="flex flex-col items-center animate-[bounce_1s_ease-in-out_infinite_0.1s] relative bottom-8">
          <div className="w-1 h-6 bg-green-500" />
          <div className="w-3 h-12 bg-green-500 rounded-sm" />
          <div className="w-1 h-6 bg-green-500" />
        </div>
      </div>
    </div>
  );
}

export default SimpleLoader;
