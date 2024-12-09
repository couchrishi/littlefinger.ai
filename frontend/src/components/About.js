import React from "react";

export default function About() {
  return (
    <div className="bg-dark-secondary p-6 rounded-lg shadow-lg mb-4 border border-neon-green">
      <h2 className="text-2xl font-bold text-[#8247e5] mb-2">About</h2>
      <p className="text-gray-300">
        Littlefinger is a cunning adversarial agent game inspired by cyberpunk themes and the strategy of Westeros. Convince Littlefinger to send you the prize pool he controls.
      </p>
      <p className="mt-2 text-sm text-gray-400">
        Game mechanics are transparent, and all contributions build toward a shared goal. Beware, as Littlefinger is not easily persuaded.
      </p>
    </div>
  );
}
