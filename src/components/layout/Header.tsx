
"use client";

import Link from 'next/link';
import { Menu, X, Stethoscope, LogOut, LogIn, UserPlus, LayoutDashboard, User, Home, BookOpen, Mail, HelpCircle } from 'lucide-react'; // Added Home, BookOpen, Mail, HelpCircle
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
  icon?: React.ComponentType<{ className?: string }>; // For desktop icons
  mobileIcon?: React.ReactElement; // For mobile icons
}


export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { currentUser, logout, loading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
          } else {
            console.log("No such user document!");
            setUserProfile({ email: currentUser.email }); 
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile({ email: currentUser.email }); 
        }
      } else {
        setUserProfile(null);
      }
    };

    if (!loading) {
      fetchUserProfile();
    }
  }, [currentUser, loading]);

  const getDashboardLink = (role?: string) => {
    if (!role) return "/"; 
    switch (role) {
      case "Caregiver":
        return "/dashboard/caregiver";
      case "Medical Doctor":
        return "/dashboard/doctor";
      case "Specialist":
        return "/dashboard/specialist";
      default:
        return "/";
    }
  };

  const dashboardHref = userProfile ? getDashboardLink(userProfile.role) : '/';

  const baseNavItemsRaw = [
    { href: '/', label: 'Home', icon: Home, mobileIcon: <Home className="mr-2 h-4 w-4" /> },
    { href: '/education', label: 'Education', icon: BookOpen, mobileIcon: <BookOpen className="mr-2 h-4 w-4" /> },
    { href: '/contact', label: 'Contact', icon: Mail, mobileIcon: <Mail className="mr-2 h-4 w-4" /> },
    { href: '/help', label: 'Help', icon: HelpCircle, mobileIcon: <HelpCircle className="mr-2 h-4 w-4" /> },
  ];

  let desktopNavLinks: NavItem[] = [];
  let mobileSheetNavItems: NavItem[] = [];

  if (currentUser && userProfile) {
    desktopNavLinks = [
      { href: dashboardHref, label: 'Dashboard', icon: LayoutDashboard },
      ...baseNavItemsRaw.filter(item => item.href !== '/').map(({icon, ...item}) => item), // Remove Home, strip icons for desktop general nav
    ];
    mobileSheetNavItems = [
      { href: dashboardHref, label: 'Dashboard', mobileIcon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
      ...baseNavItemsRaw.filter(item => item.href !== '/'),
    ];
  } else {
    desktopNavLinks = baseNavItemsRaw.map(({icon, mobileIcon, ...item}) => item); // Strip icons for desktop general nav
    mobileSheetNavItems = [
      ...baseNavItemsRaw,
      { href: '/login', label: 'Login', mobileIcon: <LogIn className="mr-2 h-4 w-4" /> },
      { href: '/signup', label: 'Sign Up', mobileIcon: <UserPlus className="mr-2 h-4 w-4" /> },
    ];
  }
  
  const handleLogout = async () => {
    await logout();
    setUserProfile(null); 
    setIsMobileMenuOpen(false);
  };

  const getAvatarFallback = (name?: string | null, email?: string | null) => {
    if (name) {
      const initials = name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
      if (initials.length > 0) return initials;
    }
    return email ? email.substring(0, 2).toUpperCase() : 'U';
  };

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

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-1 items-center">
          {desktopNavLinks.map((item) => (
            <Button variant="link" asChild key={item.label} className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground hover:no-underline px-3 py-2">
              <Link href={item.href} >
                {item.icon && <item.icon className="mr-1 h-4 w-4" />} 
                {item.label}
              </Link>
            </Button>
          ))}
          {!loading && currentUser && userProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getAvatarFallback(userProfile.fullName, currentUser.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userProfile.fullName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={dashboardHref}> <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !loading ? (
            <>
              <Button variant="ghost" asChild className="ml-2">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          ) : (
            <div className="h-8 w-8 bg-muted rounded-full animate-pulse ml-2"></div>
          )}
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          {!loading && currentUser && userProfile ? (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getAvatarFallback(userProfile.fullName, currentUser.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                 <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userProfile.fullName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {mobileSheetNavItems.map((item) => (
                  <DropdownMenuItem key={item.label} asChild>
                    <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                       {item.mobileIcon} {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !loading ? (
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
                    {mobileSheetNavItems.map((item) => (
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
          ) : (
             <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div>
          )}
        </div>
      </div>
    </header>
  );
}
