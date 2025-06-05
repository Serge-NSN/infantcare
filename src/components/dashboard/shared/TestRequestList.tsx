
// src/components/dashboard/shared/TestRequestList.tsx
"use client";

import type { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, UserCircle, CalendarClock, CheckCircle, AlertCircle, Clock, Edit3, Paperclip } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export interface TestRequestItem {
  id: string;
  patientId: string;
  patientName?: string; // For caregiver view
  testName: string;
  reason: string;
  status: 'Pending' | 'Fulfilled' | 'Reviewed by Doctor';
  requestingDoctorId: string;
  requestingDoctorName?: string;
  requestedAt: Timestamp;
  fulfilledAt?: Timestamp;
  resultNotes?: string;
  resultFileNames?: string[];
  doctorNotes?: string; // Notes from doctor after reviewing fulfilled test
}

interface TestRequestListProps {
  requests: TestRequestItem[];
  isLoading: boolean;
  title?: string;
  userRole: 'doctor' | 'caregiver';
  onFulfillClick?: (requestId: string) => void; // For caregiver
}

const getStatusVariant = (status: TestRequestItem['status']): "destructive" | "secondary" | "default" | "outline" => {
  switch (status) {
    case 'Pending': return 'destructive';
    case 'Fulfilled': return 'secondary'; // Or a more distinct color like 'warning' if available
    case 'Reviewed by Doctor': return 'default';
    default: return 'outline';
  }
};

const StatusIcon = ({ status }: { status: TestRequestItem['status'] }) => {
  switch (status) {
    case 'Pending': return <Clock className="w-4 h-4 text-destructive" />;
    case 'Fulfilled': return <AlertCircle className="w-4 h-4 text-yellow-600" />; // Pending doctor review of results
    case 'Reviewed by Doctor': return <CheckCircle className="w-4 h-4 text-green-600" />;
    default: return <Clock className="w-4 h-4" />;
  }
};


export function TestRequestList({ requests, isLoading, title = "Test Requests", userRole, onFulfillClick }: TestRequestListProps) {
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-3 border rounded-md bg-secondary/20 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">No test requests found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-headline flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
        {userRole === 'caregiver' && <CardDescription>Review and fulfill test requests from doctors.</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((req) => (
          <div key={req.id} className="p-4 border rounded-lg bg-secondary/20 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
              <h3 className="text-lg font-semibold text-foreground">{req.testName}</h3>
              <Badge variant={getStatusVariant(req.status)} className="flex items-center gap-1 mt-1 sm:mt-0">
                <StatusIcon status={req.status} /> {req.status}
              </Badge>
            </div>
            
            {userRole === 'caregiver' && req.patientName && (
                <p className="text-sm text-muted-foreground mb-1">Patient: <Link href={`/dashboard/caregiver/patient/${req.patientId}`} className="text-primary hover:underline">{req.patientName}</Link></p>
            )}

            <p className="text-sm text-muted-foreground mb-1">Reason: <span className="text-foreground">{req.reason}</span></p>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <UserCircle className="w-3.5 h-3.5 text-primary" />
              <span>Requested by: Dr. {req.requestingDoctorName || 'N/A'}</span>
              <span className="mx-1">|</span>
              <CalendarClock className="w-3.5 h-3.5 text-primary" />
              <span>Requested: {req.requestedAt?.toDate ? new Date(req.requestedAt.toDate()).toLocaleDateString() : 'N/A'}</span>
            </div>

            {req.status === 'Fulfilled' || req.status === 'Reviewed by Doctor' ? (
              <div className="mt-2 p-3 border-t border-border/50">
                <p className="text-sm font-medium text-muted-foreground">Results:</p>
                {req.resultNotes && <p className="text-sm text-foreground whitespace-pre-wrap mt-1">Notes: {req.resultNotes}</p>}
                {req.resultFileNames && req.resultFileNames.length > 0 && (
                  <div className="mt-1">
                    <span className="text-xs font-medium text-muted-foreground">Files: </span> 
                    {req.resultFileNames.map(name => (
                        <Badge variant="outline" key={name} className="mr-1 text-xs"><Paperclip className="w-3 h-3 mr-1"/>{name}</Badge>
                    ))}
                  </div>
                )}
                {req.fulfilledAt?.toDate && <p className="text-xs text-muted-foreground mt-1">Fulfilled: {new Date(req.fulfilledAt.toDate()).toLocaleDateString()}</p>}
              </div>
            ) : null}

            {req.status === 'Reviewed by Doctor' && req.doctorNotes && (
                <div className="mt-2 p-3 border-t border-green-500/30 bg-green-500/10 rounded-b-md">
                    <p className="text-sm font-medium text-green-700">Doctor's Review of Results:</p>
                    <p className="text-sm text-green-700 whitespace-pre-wrap mt-1">{req.doctorNotes}</p>
                </div>
            )}
            
            {userRole === 'caregiver' && req.status === 'Pending' && onFulfillClick && (
              <div className="mt-3 text-right">
                <Button size="sm" onClick={() => onFulfillClick(req.id)}>
                  <Edit3 className="mr-1.5 h-4 w-4" /> Fulfill Request
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
