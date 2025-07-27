import { useState } from "react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { InsertUser, LoginCredentials } from "@shared/schema";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { login, register, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    major: '',
    year: ''
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen campus-bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="campus-text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const credentials: LoginCredentials = {
        email: formData.email,
        password: formData.password
      };
      await login(credentials);
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData: InsertUser = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        major: formData.major || undefined,
        year: formData.year || undefined
      };
      await register(userData);
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen campus-bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src="/attached_assets/GradCap_1753408806409.png" 
              alt="Campus Cove Logo" 
              className="w-10 h-10"
            />
            <h2 className="text-4xl font-bold campus-text-black">Campus Cove</h2>
          </div>
          <p className="campus-text-gray-500 mb-8">Academic Social Network for Students</p>
        </div>
        
        <Card className="campus-bg-white rounded-xl shadow-lg">
          <CardContent className="p-8">
            <div className="flex mb-6 campus-bg-gray-50 rounded-lg p-1">
              <Button
                variant={activeTab === 'login' ? 'default' : 'ghost'}
                className={`flex-1 ${
                  activeTab === 'login' 
                    ? 'campus-bg-white campus-text-black shadow-sm' 
                    : 'campus-text-gray-500'
                }`}
                onClick={() => setActiveTab('login')}
              >
                Login
              </Button>
              <Button
                variant={activeTab === 'register' ? 'default' : 'ghost'}
                className={`flex-1 ${
                  activeTab === 'register' 
                    ? 'campus-bg-white campus-text-black shadow-sm' 
                    : 'campus-text-gray-500'
                }`}
                onClick={() => setActiveTab('register')}
              >
                Register
              </Button>
            </div>

            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="campus-text-gray-700">Email</Label>
                  <Input
                    type="email"
                    placeholder="your.email@university.edu"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label className="campus-text-gray-700">Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="mt-2"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full campus-bg-black campus-text-white hover:campus-bg-gray-900"
                >
                  Sign In
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="campus-text-gray-700">First Name</Label>
                    <Input
                      type="text"
                      placeholder="Alex"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="mt-2"
                      required
                    />
                  </div>
                  <div>
                    <Label className="campus-text-gray-700">Last Name</Label>
                    <Input
                      type="text"
                      placeholder="Johnson"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="mt-2"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label className="campus-text-gray-700">Email</Label>
                  <Input
                    type="email"
                    placeholder="alex.johnson@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-2"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="campus-text-gray-700">Major</Label>
                    <Select onValueChange={(value) => handleInputChange('major', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select major" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Computer Science">Computer Science</SelectItem>
                        <SelectItem value="Business Administration">Business Administration</SelectItem>
                        <SelectItem value="Psychology">Psychology</SelectItem>
                        <SelectItem value="Biology">Biology</SelectItem>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="Physics">Physics</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="campus-text-gray-700">Year</Label>
                    <Select onValueChange={(value) => handleInputChange('year', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Freshman">Freshman</SelectItem>
                        <SelectItem value="Sophomore">Sophomore</SelectItem>
                        <SelectItem value="Junior">Junior</SelectItem>
                        <SelectItem value="Senior">Senior</SelectItem>
                        <SelectItem value="Graduate">Graduate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="campus-text-gray-700">Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="mt-2"
                    minLength={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full campus-bg-black campus-text-white hover:campus-bg-gray-900"
                >
                  Create Account
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
