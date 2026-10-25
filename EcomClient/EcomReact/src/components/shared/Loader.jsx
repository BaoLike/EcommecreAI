import React from "react";

const Loader = ({ text = "Please wait..." }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-3 text-gray-700 font-medium">{text}</p>
    </div>
  );
};

export default Loader;
