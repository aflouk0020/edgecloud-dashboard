import { useEffect, useState } from "react";

function NumericAnimatedNumber({ value, duration }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId;
    const startTime = performance.now();

    function animate(currentTime) {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const nextValue = Math.round(value * progress);

      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    }

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return displayValue;
}

function AnimatedNumber({ value, duration = 600 }) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value;
  }

  return (
    <NumericAnimatedNumber
      key={numericValue}
      value={numericValue}
      duration={duration}
    />
  );
}

export default AnimatedNumber;
