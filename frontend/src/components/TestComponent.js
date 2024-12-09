import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { increment, decrement } from './redux/slices/dummySlice';

const TestComponent = () => {
  const counter = useSelector((state) => state.dummy.counter);
  const dispatch = useDispatch();

  return (
    <div className="text-center mt-4">
      <h1 className="text-neon-green">Redux Counter: {counter}</h1>
      <button
        onClick={() => dispatch(increment())}
        className="p-2 bg-neon-green text-black rounded-md mx-2"
      >
        Increment
      </button>
      <button
        onClick={() => dispatch(decrement())}
        className="p-2 bg-red-500 text-white rounded-md mx-2"
      >
        Decrement
      </button>
    </div>
  );
};

export default TestComponent;
