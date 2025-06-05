
// src/components/dashboard/shared/FeedbackList.tsx
"use client";

import type { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquareText, UserCircle, CalendarClock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface FeedbackItem {
  id: string;
  feedbackNotes: string;
  doctorId: string;
  doctorName?: string;
  createdAt: Timestamp;
}

interface FeedbackListProps {
  feedbacks: FeedbackItem[];
  isLoading: boolean;
  title?: string;
}

export function FeedbackList({ feedbacks, isLoading, title = "Feedback History" }: FeedbackListProps) {
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-3 border rounded-md bg-secondary/20 space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">No feedback has been provided yet for this patient.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-headline flex items-center gap-2">
          <MessageSquareText className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedbacks.map((feedback) => (
          <div key={feedback.id} className="p-4 border rounded-lg bg-secondary/20 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <UserCircle className="w-4 h-4 text-primary" />
              <span>Dr. {feedback.doctorName || 'N/A'}</span>
              <span className="mx-1">|</span>
              <CalendarClock className="w-4 h-4 text-primary" />
              <span>{feedback.createdAt?.toDate ? new Date(feedback.createdAt.toDate()).toLocaleString() : 'Date N/A'}</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{feedback.feedbackNotes}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
