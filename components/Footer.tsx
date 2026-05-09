import { Brain } from "lucide-react";
import Link from "next/link";
import React from "react";

const Footer = () => {
  return (
    <footer className="py-12 px-4 bg-gray-900 text-white">
      <div className="container mx-auto flex flex-col items-center">
        <p>
          &copy; {new Date().getFullYear()} JobPair AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
