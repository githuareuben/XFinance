// src/components/LottieIcon.jsx
import { useRef, useEffect } from "react";
import Lottie from "lottie-react";

export default function LottieIcon({
  animationData,
  size = 24,
  hoverPlay = true,
  loop = true,
  speed = 1,
  className = "",
}) {
  const lottieRef = useRef(null);

  useEffect(() => {
    if (lottieRef.current) lottieRef.current.setSpeed(speed);
  }, [speed]);

  return (
    <div
      className={className}
      style={{ width: size, height: size, lineHeight: 0 }}
      onMouseEnter={() => hoverPlay && lottieRef.current?.play()}
      onMouseLeave={() => hoverPlay && lottieRef.current?.stop()}
      // optional: improve focus behavior for keyboard
      onFocus={() => hoverPlay && lottieRef.current?.play()}
      onBlur={() => hoverPlay && lottieRef.current?.stop()}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={false}
        renderer="svg"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}