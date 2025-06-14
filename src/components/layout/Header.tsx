// src/components/layout/Header.tsx
"use client";

import Link from 'next/link';
import { Menu, X, Stethoscope, LogOut, LogIn, UserPlus, LayoutDashboard, User, BookOpen, Mail, HelpCircle, UserCog, PlusCircle, ListOrdered, FileSearch, ShieldCheck, Users2, Settings2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import { getDashboardLink } from '@/lib/utils/getDashboardLink'; 
import { NotificationBell } from './NotificationBell';

const Logo = () => (
  <Link href="/" className="flex items-center gap-2">
    <Stethoscope className="h-8 w-8 text-primary" />
    <span className="text-2xl font-headline font-bold">InfantCare</span>
  </Link>
);

interface UserProfile extends DocumentData {
  role?: string;
  fullName?: string;
  email?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  mobileIcon?: React.ReactElement;
  roles?: string[]; 
}


export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { currentUser, logout, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (currentUser) {
        setProfileLoading(true);
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data() as UserProfile;
            setUserProfile(profileData);
             if (typeof window !== 'undefined') {
                localStorage.setItem('userRole', profileData.role || '');
                localStorage.setItem('userFullName', profileData.fullName || currentUser.email || 'User');
                localStorage.setItem('userEmail', currentUser.email || '');
            }
          } else {
            console.log("No such user document! Logging out for safety.");
            setUserProfile({ email: currentUser.email }); 
            await logout();
          }
        } catch (error: any) {
          console.error("Error fetching user profile:", error);
          setUserProfile({ email: currentUser.email }); 
          if (error.code === "unavailable" || error.message?.includes("client is offline")) {
             console.warn("Firestore is offline. User profile might be stale or unavailable.");
            if (typeof window !== 'undefined') {
                const storedRole = localStorage.getItem('userRole');
                const storedFullName = localStorage.getItem('userFullName');
                const storedEmail = localStorage.getItem('userEmail');
                if (storedRole && storedEmail) {
                    setUserProfile({ role: storedRole, fullName: storedFullName || storedEmail, email: storedEmail });
                }
            }
          }
        } finally {
          setProfileLoading(false);
        }
      } else {
        setUserProfile(null);
        setProfileLoading(false);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('userRole');
            localStorage.removeItem('userFullName');
            localStorage.removeItem('userEmail');
        }
      }
    };

    if (!authLoading) {
      fetchUserProfile();
    }
  }, [currentUser, authLoading, logout]);

  const dashboardHref = userProfile ? getDashboardLink(userProfile.role) : '/login';

  const unauthenticatedNavItems: NavItem[] = [
    { href: '/', label: 'Home', icon: LayoutDashboard, mobileIcon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
    { href: '/education', label: 'Education', icon: BookOpen, mobileIcon: <BookOpen className="mr-2 h-4 w-4" /> },
    { href: '/contact', label: 'Contact', icon: Mail, mobileIcon: <Mail className="mr-2 h-4 w-4" /> },
    { href: '/help', label: 'Help', icon: HelpCircle, mobileIcon: <HelpCircle className="mr-2 h-4 w-4" /> },
  ];
  
  let authenticatedBaseNavItems: NavItem[] = [
     { href: dashboardHref, label: 'Dashboard', icon: LayoutDashboard, mobileIcon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
  ];
  
  if (currentUser && userProfile?.role === 'Caregiver') {
    authenticatedBaseNavItems.push(
      { href: '/dashboard/caregiver/add-patient', label: 'Add Patient', icon: PlusCircle, mobileIcon: <PlusCircle className="mr-2 h-4 w-4" /> },
      { href: '/dashboard/caregiver/view-patients', label: 'View Patients', icon: ListOrdered, mobileIcon: <ListOrdered className="mr-2 h-4 w-4" /> },
      { href: '/dashboard/caregiver/test-requests', label: 'Test Requests', icon: FileSearch, mobileIcon: <FileSearch className="mr-2 h-4 w-4" /> }
    );
  } else if (currentUser && userProfile?.role === 'Medical Doctor') {
     authenticatedBaseNavItems.push(
      { href: '/dashboard/doctor/awaiting-review', label: 'Awaiting Review', icon: PlusCircle, mobileIcon: <PlusCircle className="mr-2 h-4 w-4" /> },
      { href: '/dashboard/doctor/view-all-patients', label: 'All Patients', icon: ListOrdered, mobileIcon: <ListOrdered className="mr-2 h-4 w-4" /> }
    );
  } else if (currentUser && userProfile?.role === 'Admin') {
    authenticatedBaseNavItems = [ // Admin gets a different set of primary nav links
        { href: '/dashboard/admin', label: 'Admin Dashboard', icon: ShieldCheck, mobileIcon: <ShieldCheck className="mr-2 h-4 w-4" /> },
        { href: '/dashboard/admin/view-all-patients', label: 'All Patients', icon: ListOrdered, mobileIcon: <ListOrdered className="mr-2 h-4 w-4" /> },
        { href: '/dashboard/admin/view-all-users', label: 'All Users', icon: Users2, mobileIcon: <Users2 className="mr-2 h-4 w-4" /> },
    ];
  }


  if (currentUser) {
    authenticatedBaseNavItems.push({ href: '/help', label: 'Help', icon: HelpCircle, mobileIcon: <HelpCircle className="mr-2 h-4 w-4" /> });
  }

  const currentNavItems: NavItem[] = currentUser ? authenticatedBaseNavItems : unauthenticatedNavItems;
  
  const mobileAuthLinks: NavItem[] = [
    { href: '/login', label: 'Login', mobileIcon: <LogIn className="mr-2 h-4 w-4" /> },
    { href: '/signup', label: 'Sign Up', mobileIcon: <UserPlus className="mr-2 h-4 w-4" /> },
  ];
  
  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
        localStorage.removeItem('userRole');
        localStorage.removeItem('userFullName');
        localStorage.removeItem('userEmail');
    }
  };

  const getAvatarFallback = (name?: string | null, email?: string | null) => {
    if (name && name !== email) { 
      const initials = name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
      if (initials.length > 0) return initials;
    }
    return email ? email.substring(0, 2).toUpperCase() : 'U';
  };
  
  const isLoading = authLoading || (!currentUser && !authLoading && mounted === false) || (currentUser && profileLoading);


  if (!mounted) { 
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
           <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div> 
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden md:flex gap-1 items-center">
          {currentNavItems.map((item) => (
            <Button variant="link" asChild key={item.label} className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground hover:no-underline px-3 py-2">
              <Link href={item.href} >
                {item.icon && <item.icon className="mr-1 h-4 w-4" />} 
                {item.label}
              </Link>
            </Button>
          ))}
          {isLoading ? (
            <div className="h-8 w-8 bg-muted rounded-full animate-pulse ml-2"></div>
          ) : currentUser && userProfile ? (
            <>
              <NotificationBell /> 
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} /> 
                      <AvatarFallback>{getAvatarFallback(userProfile.fullName, currentUser.email)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none truncate">
                        {userProfile.fullName || currentUser.email?.split('@')[0]}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={dashboardHref}> 
                      {userProfile.role === 'Admin' ? <ShieldCheck className="mr-2 h-4 w-4" /> : <LayoutDashboard className="mr-2 h-4 w-4" /> }
                      Dashboard 
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile"> <UserCog className="mr-2 h-4 w-4" /> Modify Profile </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="ml-2">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2">
          {isLoading ? (
             <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div>
          ) : currentUser && userProfile ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                       <AvatarImage src={undefined} />
                      <AvatarFallback>{getAvatarFallback(userProfile.fullName, currentUser.email)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                   <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none truncate">
                        {userProfile.fullName || currentUser.email?.split('@')[0]}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {currentNavItems.map((item) => (
                    <DropdownMenuItem key={item.label} asChild>
                      <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                         {item.mobileIcon} {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                   <DropdownMenuItem asChild>
                    <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}> <UserCog className="mr-2 h-4 w-4" /> Modify Profile </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-3/4 sm:w-1/2">
                <div className="p-4">
                  <div className="mb-6 flex justify-between items-center">
                    <Logo />
                    <SheetClose asChild>
                       <Button variant="ghost" size="icon">
                          <X className="h-6 w-6" />
                          <span className="sr-only">Close menu</span>
                        </Button>
                    </SheetClose>
                  </div>
                  <nav className="flex flex-col gap-4">
                    {currentNavItems.map((item) => (
                      <SheetClose asChild key={item.label}>
                        <Link
                          href={item.href}
                          className="text-lg font-medium text-foreground/80 hover:text-foreground flex items-center"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.mobileIcon} {item.label}
                        </Link>
                      </SheetClose>
                    ))}
                    <hr className="my-2"/>
                    {mobileAuthLinks.map((item) => (
                       <SheetClose asChild key={item.label}>
                        <Link
                          href={item.href}
                          className="text-lg font-medium text-foreground/80 hover:text-foreground flex items-center"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.mobileIcon} {item.label}
                        </Link>
                      </SheetClose>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  );
}
