
"use client";

import * as React from 'react'; // Added React import
import { Button, type ButtonProps } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmailButtonProps extends Omit<ButtonProps, 'onClick' | 'asChild'> {
  senderEmail?: string; // Optional: if you want to prefill sender if mailto client supports it (rare)
  receiverEmail: string;
  subject?: string;
  body?: string;
  buttonText: string;
  icon?: React.ReactElement<LucideIcon>;
}

export function EmailButton({ 
  senderEmail, 
  receiverEmail, 
  subject = "", 
  body = "", 
  buttonText,
  icon,
  variant = "outline",
  size = "default",
  className,
  ...props
}: EmailButtonProps) {
  
  const handleEmailRedirect = () => {
    let mailtoLink = `mailto:${receiverEmail}`;
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    if (body) params.append('body', body);
    // Not all clients support 'from' or 'cc' reliably via mailto
    // if (senderEmail) params.append('from', senderEmail); 

    const queryString = params.toString();
    if (queryString) {
      mailtoLink += `?${queryString}`;
    }
    
    window.location.href = mailtoLink;
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleEmailRedirect}
      className={className}
      {...props}
    >
      {icon && React.cloneElement(icon, { className: `mr-2 h-${size === 'sm' ? '3.5' : '4'} w-${size === 'sm' ? '3.5' : '4'}` })}
      {buttonText}
    </Button>
  );
}
