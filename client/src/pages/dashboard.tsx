import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, Users, FileText, Calendar, ArrowRight, Upload, Plus, Clock, MapPin, AlertTriangle, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  // get dashboard stats
  const { data: dashboardData, isLoading } = useQuery<{
    courseCount: number;
    groupCount: number;
    resourceCount: number;
    upcomingEvents: any[];
  }>({
    queryKey: ['/api/dashboard'],
    enabled: isAuthenticated
  });

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen campus-bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="campus-text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold campus-text-black">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="campus-text-gray-500 mt-2">
          Here's what's happening in your academic network
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="campus-bg-white campus-border-gray-300 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6" onClick={() => navigate('/courses')}>
                <div className="flex items-center">
                  <div className="p-2 campus-bg-gray-100 rounded-lg">
                    <Book className="campus-text-gray-700" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium campus-text-gray-500">Active Courses</p>
                    <p className="text-2xl font-bold campus-text-black">
                      {dashboardData?.courseCount || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="campus-bg-white campus-border-gray-300 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6" onClick={() => navigate('/study-groups')}>
                <div className="flex items-center">
                  <div className="p-2 campus-bg-gray-100 rounded-lg">
                    <Users className="campus-text-gray-700" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium campus-text-gray-500">Study Groups</p>
                    <p className="text-2xl font-bold campus-text-black">
                      {dashboardData?.groupCount || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="campus-bg-white campus-border-gray-300 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6" onClick={() => navigate('/resources')}>
                <div className="flex items-center">
                  <div className="p-2 campus-bg-gray-100 rounded-lg">
                    <FileText className="campus-text-gray-700" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium campus-text-gray-500">Shared Resources</p>
                    <p className="text-2xl font-bold campus-text-black">
                      {dashboardData?.resourceCount || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events */}
          <Card className="campus-bg-white campus-border-gray-300">
            <CardHeader className="border-b campus-border-gray-300">
              <div className="flex justify-between items-center">
                <CardTitle className="campus-text-black">Upcoming Events & Study Sessions</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {dashboardData?.upcomingEvents?.length ? (
                <div className="space-y-3">
                  {dashboardData.upcomingEvents.slice(0, 5).map((event: any) => {
                    const typeIcons: any = {
                      deadline: AlertTriangle,
                      study_group: Users,
                      assignment: BookOpen,
                      exam: AlertTriangle,
                      meeting: Users
                    };
                    const typeLabels: any = {
                      deadline: 'Deadline',
                      study_group: 'Study Session',
                      assignment: 'Assignment',
                      exam: 'Exam',
                      meeting: 'Meeting'
                    };
                    const IconComponent = typeIcons[event.type] || Calendar;
                    const priorityColors: any = {
                      low: "campus-bg-green-100 campus-text-green-800",
                      medium: "campus-bg-yellow-100 campus-text-yellow-800",
                      high: "campus-bg-red-100 campus-text-red-800"
                    };
                    
                    return (
                      <div key={event.id} className="p-3 rounded-lg campus-bg-gray-50 hover:campus-bg-gray-100 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded ${priorityColors[event.priority]}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium campus-text-gray-900 truncate">{event.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs campus-text-gray-500">{typeLabels[event.type]}</span>
                              <span className="text-xs campus-text-gray-400">•</span>
                              <Clock className="h-3 w-3 campus-text-gray-500" />
                              <span className="text-xs campus-text-gray-600">
                                {format(new Date(event.startDate), "MMM dd, h:mm a")}
                              </span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2 mt-1">
                                <MapPin className="h-3 w-3 campus-text-gray-500" />
                                <span className="text-xs campus-text-gray-600">{event.location}</span>
                              </div>
                            )}
                            {(event.course || event.studyGroup) && (
                              <div className="mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {event.course ? event.course.code : event.studyGroup.name}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 campus-text-gray-400 mx-auto mb-4" />
                  <p className="campus-text-gray-500">No upcoming events</p>
                  <p className="text-sm campus-text-gray-400 mt-2">
                    Create events in the calendar to see them here
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/calendar')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Event
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sidebar content removed - Quick Actions section removed per user request */}
        </div>
      </div>
    </div>
  );
}
