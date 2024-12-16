import { useSelector } from "react-redux";

export default function PrizePool() {

  const prizePool = useSelector((state) => state.gameStats.prizePool); 
  const prizePoolInUsd = useSelector((state) => state.gameStats.prizePoolInUsd); 

  return (
    // <div className="relative bg-gradient-to-br from-purple-900 via-black to-purple-900 p-6 rounded-lg shadow-md border border-neon-green">
    <div className="relative bg-gradient-to-br from-purple-900 via-black to-purple-900 p-4 rounded-lg shadow-md">
   {/* <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 p-4 rounded-lg shadow-md"> */}

      <h2 className="text-2xl font-extrabold text-purple-500 mb-2 text-center tracking-wider">
        Prize Pool
      </h2>

      <div className="flex flex-col items-center justify-center">
        <p className="text-3xl font-extrabold text-green-400 animate-pulse">
          {prizePool ? prizePool : '0.00'} POL
        </p>
        <p className="text-2xl font-extrabold text-yellow-400">
          ${prizePoolInUsd ? prizePoolInUsd : '0.00'}
        </p>
      </div>

      <p className="text-sm text-gray-400 mt-2 text-center">
        70% of query fees contribute to this pool. Make your moves wisely.
      </p>

      <div className="absolute inset-0 bg-neon-green opacity-10 blur-2xl rounded-lg pointer-events-none"></div>
    </div>
  );
}
