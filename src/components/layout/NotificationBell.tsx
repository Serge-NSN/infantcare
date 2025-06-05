
// src/components/layout/NotificationBell.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Bell, CircleAlert, CheckCircle2, Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Unsubscribe, Timestamp, doc, updateDoc, writeBatch } from 'firebase/firestore';
import Link from 'next/link';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  recipientUid: string;
  type: 'NEW_FEEDBACK' | 'TEST_REQUESTED' | 'TEST_FULFILLED' | 'SPECIALIST_FEEDBACK';
  message: string;
  relatedPatientId?: string;
  relatedPatientName?: string;
  relatedDocId?: string; // Could be feedbackId, testRequestId
  isRead: boolean;
  createdAt: Timestamp;
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'NEW_FEEDBACK': return <Mail className="w-4 h-4 text-blue-500" />;
    case 'TEST_REQUESTED': return <FileText className="w-4 h-4 text-orange-500" />;
    case 'TEST_FULFILLED': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'SPECIALIST_FEEDBACK': return <CircleAlert className="w-4 h-4 text-purple-500" />;
    default: return <Bell className="w-4 h-4 text-gray-500" />;
  }
};

const getNotificationLink = (notification: Notification, userRole?: string | null): string => {
    if (!notification.relatedPatientId) return '#';
    
    switch (notification.type) {
        case 'NEW_FEEDBACK':
            return userRole === 'Caregiver' ? `/dashboard/caregiver/patient/${notification.relatedPatientId}` : `/dashboard/doctor/patient/${notification.relatedPatientId}`;
        case 'TEST_REQUESTED':
             return userRole === 'Caregiver' ? `/dashboard/caregiver/test-requests?patientId=${notification.relatedPatientId}` : `/dashboard/doctor/patient/${notification.relatedPatientId}`;
        case 'TEST_FULFILLED':
            return `/dashboard/doctor/patient/${notification.relatedPatientId}`;
        case 'SPECIALIST_FEEDBACK':
             return `/dashboard/doctor/patient/${notification.relatedPatientId}`; // Assuming doctor checks this
        default:
            return '#';
    }
};


export function NotificationBell() {
  const { currentUser, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
     if (typeof window !== 'undefined') {
        setUserRole(localStorage.getItem('userRole'));
     }
  }, [currentUser]);


  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    if (currentUser && !authLoading) {
      setIsLoading(true);
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('recipientUid', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
        // limit(10) // Consider limiting for performance
      );

      unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        const fetchedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        setNotifications(fetchedNotifications);
        setUnreadCount(fetchedNotifications.filter(n => !n.isRead).length);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching notifications:", error);
        setIsLoading(false);
      });
    } else if (!currentUser && !authLoading) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser, authLoading]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
      // Optimistic update or rely on onSnapshot
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser || notifications.filter(n => !n.isRead).length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
        if (!n.isRead) {
            batch.update(doc(db, 'notifications', n.id), { isRead: true });
        }
    });
    try {
        await batch.commit();
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
    }
  };


  if (authLoading) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }
  
  if (!currentUser) return null; // Don't show bell if not logged in

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-96" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notifications</span>
            {notifications.filter(n => !n.isRead).length > 0 && (
                <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={handleMarkAllAsRead}>Mark all as read</Button>
            )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
            <DropdownMenuItem disabled className="flex justify-center p-2">
                <Skeleton className="h-5 w-1/2" />
            </DropdownMenuItem>
        ) : notifications.length === 0 ? (
          <DropdownMenuItem disabled>
            <p className="text-sm text-muted-foreground text-center py-2">No notifications yet.</p>
          </DropdownMenuItem>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} asChild className={cn("cursor-pointer p-0", !notification.isRead && "bg-blue-500/10 hover:bg-blue-500/20")}>
                <Link href={getNotificationLink(notification, userRole)} className="block p-2" onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1">
                      <p className={cn("text-sm", !notification.isRead && "font-semibold")}>
                        {notification.message}
                        {notification.relatedPatientName && <span className="text-primary"> for {notification.relatedPatientName}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.createdAt?.toDate ? new Date(notification.createdAt.toDate()).toLocaleString() : 'Just now'}
                      </p>
                    </div>
                    {!notification.isRead && (
                       <div className="h-2 w-2 bg-blue-500 rounded-full mt-1 self-center"></div>
                    )}
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        {notifications.length > 5 && ( // Example: Show "View All" if more than 5
             <DropdownMenuItem asChild className="justify-center mt-1">
                <Link href="/dashboard/notifications" className="text-sm text-primary hover:underline">
                    View All Notifications
                </Link>
            </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
