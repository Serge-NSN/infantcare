// src/app/dashboard/admin/view-users-by-role/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, BriefcaseMedical, UserPlus, Users2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, Timestamp, orderBy, where } from 'firebase/firestore';
import { useEffect, useState, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDashboardLink } from '@/lib/utils/getDashboardLink';

interface UserAccount {
  id: string; // Firestore document ID (which is user.uid)
  fullName: string;
  email: string;
  role: 'Caregiver' | 'Medical Doctor' | 'Specialist' | 'Admin' | string;
  hospital: string; // Hospital/Affiliation
  career: string; // Career/Specialization
  createdAt: Timestamp;
}

function UserListContent() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const roleTitle = role ? `${role.replace(/([A-Z])/g, ' $1').trim()}s` : 'Users';
  const PageIcon = role === 'Caregiver' ? UserPlus : role === 'Medical Doctor' ? BriefcaseMedical : role === 'Specialist' ? Users2 : Users;

  useEffect(() => {
    if (!authLoading && currentUser) {
        const userRole = localStorage.getItem('userRole');
        if (userRole !== 'Admin') {
            router.replace(getDashboardLink(userRole));
            return;
        }
    } else if (!authLoading && !currentUser) {
        router.replace('/login');
        return;
    }
    
    if (!role) {
        setError("No user role specified in the URL.");
        setLoading(false);
        return;
    }

    async function fetchUsersByRole() {
      if (authLoading || !currentUser || localStorage.getItem('userRole') !== 'Admin') {
         if(!currentUser && !authLoading) setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const usersCollectionRef = collection(db, 'users');
        const q = query(usersCollectionRef, where('role', '==', role), orderBy('createdAt', 'desc'));

        const querySnapshot = await getDocs(q);
        const fetchedUsers: UserAccount[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            fullName: data.fullName || 'N/A',
            email: data.email,
            role: data.role || 'Unknown',
            hospital: data.hospital || 'N/A',
            career: data.career || 'N/A',
            createdAt: data.createdAt,
          } as UserAccount;
        });
        setUsers(fetchedUsers);
      } catch (err: any) {
        console.error(`Error fetching users for role ${role}:`, err);
        let specificError = "Could not load user list. Please try again later.";
        if (err.code === "unavailable" || err.message?.includes("client is offline")) {
          specificError = "Database is offline. Please check your internet connection.";
        } else if (err.code === "permission-denied") {
            specificError = "Permission denied. Please check Firestore security rules for admin access.";
        } else if (err.code === "failed-precondition" && err.message?.includes("index")) {
            specificError = "A required Firestore index is missing. Please check your browser's developer console for a link to create it for the 'users' collection (on 'role' and 'createdAt').";
        }
        setError(specificError);
      } finally {
        setLoading(false);
      }
    }
     if (currentUser && localStorage.getItem('userRole') === 'Admin') {
        fetchUsersByRole();
    }
  }, [currentUser, authLoading, router, role]);

  const getRoleBadgeVariant = (userRole: string) => {
    if (userRole === 'Admin') return 'destructive';
    if (userRole === 'Medical Doctor') return 'default';
    if (userRole === 'Specialist') return 'secondary';
    if (userRole === 'Caregiver') return 'outline';
    return 'outline';
  };
  
  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-8 w-1/2 mb-6" />
        <Card className="shadow-xl">
          <CardHeader>
            <Skeleton className="h-7 w-1/2 mb-1" />
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser || localStorage.getItem('userRole') !== 'Admin') {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>Access Denied. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/dashboard/admin">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Dashboard
        </Link>
      </Button>
      <div className="flex items-center gap-3 mb-6">
        <PageIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline">All {roleTitle}</h1>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">User List</CardTitle>
          <CardDescription className="font-body">
            Browse all user accounts for the selected role in the InfantCare system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
             <Card className="border-destructive bg-destructive/10 p-4">
              <CardTitle className="text-destructive flex items-center gap-2 text-lg">
                <AlertTriangle /> Error Loading Users
              </CardTitle>
              <CardDescription className="text-destructive">
                {error}
              </CardDescription>
            </Card>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No user accounts found for this role.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Career/Specialization</TableHead>
                  <TableHead>Hospital/Affiliation</TableHead>
                  <TableHead>Registered On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.career}</TableCell>
                    <TableCell>{user.hospital}</TableCell>
                    <TableCell>{user.createdAt?.toDate ? new Date(user.createdAt.toDate()).toLocaleDateString('en-US') : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function AdminViewUsersByRolePage() {
    return (
        <Suspense fallback={<div className="container mx-auto py-8 px-4 text-center">Loading user data...</div>}>
            <UserListContent />
        </Suspense>
    );
}
