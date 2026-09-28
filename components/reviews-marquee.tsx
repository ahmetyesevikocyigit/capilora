"use client";

import type { ReactNode } from "react";

interface ReviewsMarqueeProps {
  children: ReactNode;
}

export function ReviewsMarquee({ children }: ReviewsMarqueeProps) {
  return (
    <div className="reviews-marquee">
      <div
        className="reviews-window"
        onBlurCapture={(event) => {
          // Return to the loop's origin after keyboard navigation scrolls the list.
          if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.scrollLeft = 0;
        }}
      >
        {children}
      </div>
    </div>
  );
}
