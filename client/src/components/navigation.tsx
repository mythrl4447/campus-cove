// navbar component

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, LogOut, ChevronDown } from "lucide-react";

export default function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();



  const handleLogout = async () => {
    await logout();
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/courses", label: "Courses" },
    { path: "/resources", label: "Resources" },
    { path: "/forums", label: "Forums" },
    { path: "/study-groups", label: "Study Groups" },
    { path: "/calendar", label: "Calendar" },
    { path: "/messages", label: "Messages" },
  ];

  return (
    <header className="campus-bg-white border-b campus-border-gray-300 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <img 
                  src="/attached_assets/GradCap_1753408806409.png" 
                  alt="Campus Cove Logo" 
                  className="w-8 h-8"
                />
                <h1 className="text-2xl font-bold campus-text-black cursor-pointer">
                  Campus Cove
                </h1>
              </Link>
            </div>
            <nav className="hidden md:ml-8 md:flex md:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                    location === item.path
                      ? "campus-text-black font-semibold"
                      : "campus-text-gray-700 hover:campus-text-black"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">

            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="campus-bg-gray-300 campus-text-gray-700">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm font-medium campus-text-gray-700">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <ChevronDown className="w-4 h-4 campus-text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
