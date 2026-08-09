"use client";

import { useState } from "react";
import { Drawer } from "../../components/ui/Drawer";

export default function TestDrawerPage() {
  // Create a state variable to track if the drawer is open
  const [open, setOpen] = useState(false);

  return (
    <div className="p-10">
      {/* This button will trigger the drawer */}
      <button 
        onClick={() => setOpen(true)}
        className="bg-black text-white px-4 py-2 rounded-md"
      >
        Open Drawer
      </button>

      <Drawer
        isOpen={open}
        onClose={() => setOpen(false)} // Updates state to false when closed
        side="right"
      >
        <div className="p-6 bg-white h-full">
          <h2 className="text-xl font-bold">Isolated Component!</h2>
          <p className="mb-4">This is running without loading the whole repo.</p>
          
          <button 
            onClick={() => setOpen(false)}
            className="text-blue-600 underline"
          >
            Close
          </button>
        </div>
      </Drawer>
    </div>
  );
}