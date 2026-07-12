import { useEffect, useState } from "react";

function AnimatedNumber({ value, duration = 600 }) {
  const numericValue = Number(value);

  const [displayValue, setDisplayValue] = useState(
    Number.isFinite(numericValue) ? 0 : value
  );

  useEffect(() => {
    if (!Number.isFinite(numericValue)) {
      setDisplayValue(value);
      return;
    }

    let frameId;
    const startTime = performance.now();

    function animate(currentTime) {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const nextValue = Math.round(numericValue * progress);

      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    }

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [numericValue, value, duration]);

  return displayValue;
}

export default AnimatedNumber;
