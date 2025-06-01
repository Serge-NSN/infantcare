
"use client";

import Link from 'next/link';
import { Menu, X, Stethoscope, LogOut, LogIn, UserPlus, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


const Logo = () => (
  <Link href="/" className="flex items-center gap-2">
    <Stethoscope className="h-8 w-8 text-primary" />
    <span className="text-2xl font-headline font-bold">InfantCare</span>
  </Link>
);

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { currentUser, logout, loading } = useAuth(); // Get auth state

  const baseNavItems = [
    { href: '/', label: 'Home' },
    { href: '/education', label: 'Education' },
    { href: '/contact', label: 'Contact' },
    { href: '/help', label: 'Help' },
  ];

  const navItems = currentUser
    ? [
        ...baseNavItems,
        // Placeholder for dashboard link. This will be dynamic based on role later.
        { href: '/dashboard/caregiver', label: 'Dashboard', icon: <LayoutDashboard className="mr-2 h-4 w-4" /> }, 
      ]
    : [
        ...baseNavItems,
        { href: '/login', label: 'Login', icon: <LogIn className="mr-2 h-4 w-4" /> },
        { href: '/signup', label: 'Sign Up', icon: <UserPlus className="mr-2 h-4 w-4" /> },
      ];

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false); // Close mobile menu on logout
  };
  
  const getAvatarFallback = (email?: string | null) => {
    return email ? email.substring(0, 2).toUpperCase() : 'U';
  };


  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
           <div className="h-8 w-8"></div> {/* Placeholder for button/menu */}
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-4 items-center">
          {navItems.filter(item => item.label !== 'Login' && item.label !== 'Sign Up' && item.label !== 'Dashboard').map((item) => ( // Exclude auth/dashboard links here
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          {!loading && currentUser && (
             <Link
              href="/dashboard/caregiver" // Placeholder, will be dynamic
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground flex items-center"
            >
              <LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard
            </Link>
          )}
          {!loading && currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    {/* Placeholder for user avatar image if available */}
                    {/* <AvatarImage src={currentUser.photoURL || "https://placehold.co/40x40.png"} alt={currentUser.displayName || currentUser.email || "User"} /> */}
                    <AvatarFallback>{getAvatarFallback(currentUser.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile"> <User className="mr-2 h-4 w-4" /> Profile </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings"> <Settings className="mr-2 h-4 w-4" /> Settings </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator /> */}
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !loading && (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          {!loading && currentUser ? (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getAvatarFallback(currentUser.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                 <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.label} asChild>
                    <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                      {item.icon} {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                    {navItems.map((item) => (
                      <SheetClose asChild key={item.label}>
                        <Link
                          href={item.href}
                          className="text-lg font-medium text-foreground/80 hover:text-foreground flex items-center"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.icon} {item.label}
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
