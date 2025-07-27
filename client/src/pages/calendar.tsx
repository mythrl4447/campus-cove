import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Clock, MapPin, BookOpen, Users, AlertTriangle, CheckCircle } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCalendarEventSchema, type CalendarEvent, type Course, type StudyGroup } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  allDay: z.boolean().optional(),
  priority: z.string(),
  location: z.string().optional(),
  courseId: z.string().optional(),
  studyGroupId: z.string().optional(),
  reminderMinutes: z.number().optional(),
});

type EventFormData = z.infer<typeof eventFormSchema>;

const priorityColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
};

const typeIcons = {
  deadline: AlertTriangle,
  study_group: Users,
  assignment: BookOpen,
  exam: AlertTriangle,
  meeting: Users
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<(CalendarEvent & { course?: Course; studyGroup?: StudyGroup }) | null>(null);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const queryClient = useQueryClient();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "deadline",
      startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endDate: "",
      allDay: false,
      priority: "medium",
      location: "",
      courseId: "",
      studyGroupId: "",
      reminderMinutes: 60
    }
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ["/api/calendar/events", { start: monthStart.toISOString(), end: monthEnd.toISOString() }],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/events?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json() as Promise<(CalendarEvent & { course?: Course; studyGroup?: StudyGroup })[]>;
    }
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["/api/courses"]
  });

  const { data: studyGroups = [] } = useQuery({
    queryKey: ["/api/study-groups"]
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const eventData = {
        title: data.title,
        description: data.description || null,
        type: data.type,
        startDate: data.startDate, // Send as string, backend will convert
        endDate: data.endDate || null,
        allDay: data.allDay || false,
        priority: data.priority,
        location: data.location || null,
        courseId: data.courseId ? parseInt(data.courseId.toString()) : null,
        studyGroupId: data.studyGroupId ? parseInt(data.studyGroupId.toString()) : null,
        reminderMinutes: data.reminderMinutes || null
      };
      const response = await apiRequest("POST", "/api/calendar/events", eventData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create event');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error("Calendar event creation error:", error);
      alert(`Failed to create event: ${error.message}`);
    }
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await apiRequest("PATCH", `/api/calendar/events/${id}/complete`, { completed });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
    }
  });

  const onSubmit = (data: EventFormData) => {
    console.log("Calendar form submitted:", data);
    console.log("Form errors:", form.formState.errors);
    createEventMutation.mutate(data);
  };

  const getEventsForDay = (day: Date) => {
    if (!events) return [];
    return events.filter((event) =>
      isSameDay(new Date(event.startDate), day)
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'next' ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your deadlines and study sessions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
              <DialogDescription>Add a new deadline, study session, or meeting to your calendar.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" 
                    onInvalid={() => console.log("Form validation failed", form.formState.errors)}>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Assignment deadline, Study session..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="deadline">Deadline</SelectItem>
                          <SelectItem value="study_group">Study Group</SelectItem>
                          <SelectItem value="assignment">Assignment</SelectItem>
                          <SelectItem value="exam">Exam</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date & Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course (Optional)</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(courses as Course[]).map((course) => (
                            <SelectItem key={course.id} value={course.id.toString()}>
                              {course.code} - {course.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="studyGroupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Study Group (Optional)</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a study group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(studyGroups as StudyGroup[]).map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Library, Room 205..." {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional details..." {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createEventMutation.isPending}
                    onClick={(e) => {
                      console.log("Create Event button clicked");
                      console.log("Form state:", form.formState);
                      console.log("Form values:", form.getValues());
                      // Let the form handle the submission
                    }}
                  >
                    {createEventMutation.isPending ? "Creating..." : "Create Event"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => navigateMonth('prev')}>
          Previous Month
        </Button>
        <h2 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <Button variant="outline" onClick={() => navigateMonth('next')}>
          Next Month
        </Button>
      </div>

      {/* Calendar Header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {calendarDays.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

          return (
            <Card key={day.toISOString()} className={`min-h-32 ${isToday ? 'ring-2 ring-blue-500' : ''} ${!isCurrentMonth ? 'opacity-50' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium ${isToday ? 'text-blue-600 font-bold' : isCurrentMonth ? '' : 'text-gray-400'}`}>
                  {format(day, "d")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {dayEvents.map((event) => {
                    const IconComponent = typeIcons[event.type as keyof typeof typeIcons] || Calendar;
                    
                    return (
                      <div
                        key={event.id}
                        className={`p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-all ${
                          event.isCompleted 
                            ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 line-through' 
                            : priorityColors[event.priority as keyof typeof priorityColors]
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                          setIsEventDetailsOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {event.isCompleted ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <IconComponent className="h-3 w-3" />
                          )}
                          <span className="font-medium truncate">{event.title}</span>
                        </div>
                        {!event.allDay && (
                          <div className="flex items-center gap-1 text-xs opacity-75">
                            <Clock className="h-2 w-2" />
                            {format(new Date(event.startDate), "HH:mm")}
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1 text-xs opacity-75">
                            <MapPin className="h-2 w-2" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                        {event.course && (
                          <div className="text-xs opacity-75">
                            {event.course.code}
                          </div>
                        )}
                        {event.studyGroup && (
                          <div className="text-xs opacity-75 flex items-center gap-1">
                            <Users className="h-2 w-2" />
                            {event.studyGroup.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Event Details Dialog */}
      <Dialog open={isEventDetailsOpen} onOpenChange={setIsEventDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && (
                <>
                  {React.createElement(typeIcons[selectedEvent.type as keyof typeof typeIcons] || Calendar, { className: "w-5 h-5" })}
                  {selectedEvent.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={priorityColors[selectedEvent.priority as keyof typeof priorityColors]}>
                    {selectedEvent.priority} priority
                  </Badge>
                  <Badge variant="outline">{selectedEvent.type}</Badge>
                </div>
                <Button
                  variant={selectedEvent.isCompleted ? "outline" : "default"}
                  size="sm"
                  onClick={() => {
                    toggleCompleteMutation.mutate({ 
                      id: selectedEvent.id, 
                      completed: !selectedEvent.isCompleted 
                    });
                    setIsEventDetailsOpen(false);
                  }}
                >
                  {selectedEvent.isCompleted ? "Mark Incomplete" : "Mark Complete"}
                </Button>
              </div>
              
              {selectedEvent.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selectedEvent.description}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{format(new Date(selectedEvent.startDate), "MMMM d, yyyy 'at' h:mm a")}</span>
                </div>
                
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                
                {selectedEvent.course && (
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>{selectedEvent.course.code} - {selectedEvent.course.name}</span>
                  </div>
                )}
                
                {selectedEvent.studyGroup && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{selectedEvent.studyGroup.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events & Study Sessions</CardTitle>
          <CardDescription>Your next deadlines, assignments, and study group sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events
              ?.filter((event) => !event.isCompleted && new Date(event.startDate) >= new Date())
              ?.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
              ?.slice(0, 5)
              ?.map((event) => {
                const IconComponent = typeIcons[event.type as keyof typeof typeIcons] || Calendar;
                
                return (
                  <div key={event.id} className={`flex items-center justify-between p-3 border rounded-lg ${
                    event.isCompleted ? 'opacity-50' : ''
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${priorityColors[event.priority as keyof typeof priorityColors]}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{event.title}</div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(event.startDate), "MMM d, yyyy 'at' h:mm a")}</span>
                          {event.location && (
                            <>
                              <span>•</span>
                              <MapPin className="h-3 w-3" />
                              <span>{event.location}</span>
                            </>
                          )}
                        </div>
                        <div className="flex gap-2 mt-1">
                          {event.course && (
                            <Badge variant="secondary" className="text-xs">
                              {event.course.code}
                            </Badge>
                          )}
                          {event.studyGroup && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700">
                              <Users className="h-2 w-2 mr-1" />
                              Study Session
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleCompleteMutation.mutate({ 
                        id: event.id, 
                        completed: !event.isCompleted 
                      })}
                    >
                      {event.isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })}
            {(!events || events.filter((event) => !event.isCompleted).length === 0) && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No upcoming events. Create your first event to get started!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}