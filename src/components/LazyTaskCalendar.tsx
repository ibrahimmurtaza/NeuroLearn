'use client';

import { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/Card';

// Lazy load the TaskCalendar component
const TaskCalendar = lazy(() => import('@/components/calendar/TaskCalendar'));

// Loading component for the calendar
const CalendarSkeleton = () => (
  <Card className="w-full">
    <CardContent className="p-6">
      <div className="animate-pulse space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-gray-200 rounded"></div>
            <div className="h-8 w-20 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded border"></div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

interface LazyTaskCalendarProps {
  className?: string;
  height?: number;
}

export default function LazyTaskCalendar({ className, height }: LazyTaskCalendarProps) {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <TaskCalendar className={className} height={height} />
    </Suspense>
  );
}