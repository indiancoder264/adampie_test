"use client";

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  rating: number;
  totalStars?: number;
  onRate?: (rating: number) => void;
  readOnly?: boolean;
  className?: string;
};

export function StarRating({ rating, totalStars = 5, onRate, readOnly = true, className }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const handleMouseOver = (rate: number) => {
    if (readOnly) return;
    setHoverRating(rate);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverRating(0);
  };

  const handleClick = (rate: number) => {
    if (readOnly || !onRate) return;
    onRate(rate);
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= (hoverRating || rating);
        return (
          <Star
            key={starValue}
            className={cn(
              'h-5 w-5',
              isFilled ? 'text-primary fill-primary' : 'text-muted-foreground/50',
              !readOnly && 'cursor-pointer transition-transform hover:scale-125'
            )}
            onMouseOver={() => handleMouseOver(starValue)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(starValue)}
          />
        );
      })}
    </div>
  );
}
