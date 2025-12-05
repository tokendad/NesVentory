import React, { useState, useEffect, useMemo, useCallback } from "react";
import { fetchMaintenanceTasks, fetchItems, type MaintenanceTask, type Item } from "../lib/api";

type CalendarView = "daily" | "weekly" | "monthly" | "yearly";

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<CalendarView>("monthly");

  const MAX_YEARLY_TASKS_DISPLAYED = 5;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksData, itemsData] = await Promise.all([
        fetchMaintenanceTasks(),
        fetchItems(),
      ]);
      setTasks(tasksData);
      setItems(itemsData);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const previousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const previousYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth()));
  };

  const nextYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth()));
  };

  const getNavigationLabel = () => {
    const monthName = monthNames[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    const day = currentDate.getDate();

    switch (viewMode) {
      case "daily":
        return `${monthName} ${day}, ${year}`;
      case "weekly":
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} - ${
          weekStart.getMonth() !== weekEnd.getMonth() ? monthNames[weekEnd.getMonth()] + " " : ""
        }${weekEnd.getDate()}, ${year}`;
      case "monthly":
        return `${monthName} ${year}`;
      case "yearly":
        return `${year}`;
    }
  };

  const handlePrevious = () => {
    switch (viewMode) {
      case "daily":
        previousDay();
        break;
      case "weekly":
        previousWeek();
        break;
      case "monthly":
        previousMonth();
        break;
      case "yearly":
        previousYear();
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case "daily":
        nextDay();
        break;
      case "weekly":
        nextWeek();
        break;
      case "monthly":
        nextMonth();
        break;
      case "yearly":
        nextYear();
        break;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDateString = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  // Memoize task grouping by date to avoid recalculating on every render
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, MaintenanceTask[]> = {};
    tasks.forEach(task => {
      if (task.next_due_date) {
        if (!grouped[task.next_due_date]) {
          grouped[task.next_due_date] = [];
        }
        grouped[task.next_due_date].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  const getTasksForDay = useCallback((day: number) => {
    const dateStr = formatDateString(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    return tasksByDate[dateStr] || [];
  }, [currentDate, tasksByDate]);

  const getItemName = useCallback((itemId: string) => {
    const item = items.find(i => i.id.toString() === itemId);
    return item?.name || 'Unknown Item';
  }, [items]);

  const getTasksForDate = useCallback((date: Date) => {
    const dateStr = formatDateString(date);
    return tasksByDate[dateStr] || [];
  }, [tasksByDate]);

  const getTasksForWeek = useCallback(() => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    const tasksInWeek: { date: Date; tasks: MaintenanceTask[] }[] = [];
    
    // Compute tasks for each day of the week
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = formatDateString(date);
      tasksInWeek.push({
        date,
        tasks: tasksByDate[dateStr] || []
      });
    }
    
    return tasksInWeek;
  }, [currentDate, tasksByDate]);

  const getTasksForYear = useCallback(() => {
    const year = currentDate.getFullYear();
    const monthlyTasks: { month: number; tasks: MaintenanceTask[] }[] = [];
    
    // Filter tasks for the current year only once
    const yearTasks = tasks.filter(task => {
      if (!task.next_due_date) return false;
      return task.next_due_date.startsWith(`${year}-`);
    });
    
    // Group tasks by month
    for (let month = 0; month < 12; month++) {
      const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
      const monthTasks = yearTasks.filter(task => 
        task.next_due_date?.startsWith(monthPrefix)
      );
      monthlyTasks.push({ month, tasks: monthTasks });
    }
    
    return monthlyTasks;
  }, [currentDate, tasks]);

  const renderCalendar = () => {
    const days = [];
    const totalDays = daysInMonth(currentDate);
    const firstDay = firstDayOfMonth(currentDate);

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= totalDays; day++) {
      const dayTasks = getTasksForDay(day);
      const hasSelectedDay = selectedDay === day;
      
      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday(day) ? "today" : ""} ${hasSelectedDay ? "selected" : ""} ${dayTasks.length > 0 ? "has-tasks" : ""}`}
          onClick={() => setSelectedDay(hasSelectedDay ? null : day)}
        >
          <div className="day-number">{day}</div>
          {dayTasks.length > 0 && (
            <div className="task-indicators">
              {dayTasks.slice(0, 3).map((task, idx) => (
                <div
                  key={idx}
                  className="task-indicator"
                  style={{ backgroundColor: task.color || '#3b82f6' }}
                  title={task.name}
                />
              ))}
              {dayTasks.length > 3 && (
                <div className="task-indicator more">+{dayTasks.length - 3}</div>
              )}
            </div>
          )}
          {hasSelectedDay && dayTasks.length > 0 && (
            <div className="day-tasks-popup">
              {dayTasks.map((task) => (
                <div key={task.id} className="popup-task" style={{ borderLeftColor: task.color }}>
                  <div className="popup-task-name">{task.name}</div>
                  <div className="popup-task-item">{getItemName(task.item_id)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const renderDailyView = () => {
    const todayTasks = getTasksForDate(currentDate);
    
    return (
      <div className="daily-view">
        <h3 className="daily-view-title">
          {monthNames[currentDate.getMonth()]} {currentDate.getDate()}, {currentDate.getFullYear()}
        </h3>
        {todayTasks.length === 0 ? (
          <div className="no-tasks">No maintenance tasks scheduled for this day</div>
        ) : (
          <div className="daily-tasks-list">
            {todayTasks.map((task) => (
              <div key={task.id} className="daily-task-card" style={{ borderLeftColor: task.color || '#3b82f6' }}>
                <div className="daily-task-name">{task.name}</div>
                <div className="daily-task-item">Item: {getItemName(task.item_id)}</div>
                {task.description && <div className="daily-task-description">{task.description}</div>}
                <div className="daily-task-recurrence">
                  Recurrence: {task.recurrence_type?.replace(/_/g, ' ') || 'None'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderWeeklyView = () => {
    const weekTasks = getTasksForWeek();
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    
    return (
      <div className="weekly-view">
        <div className="weekly-grid">
          {weekTasks.map(({ date, tasks }, index) => {
            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index];
            const isCurrentDay = date.toDateString() === new Date().toDateString();
            
            return (
              <div key={index} className={`weekly-day ${isCurrentDay ? 'current-day' : ''}`}>
                <div className="weekly-day-header">
                  <div className="weekly-day-name">{dayName}</div>
                  <div className="weekly-day-date">
                    {monthNames[date.getMonth()]} {date.getDate()}
                  </div>
                </div>
                <div className="weekly-tasks">
                  {tasks.length === 0 ? (
                    <div className="no-tasks-small">No tasks</div>
                  ) : (
                    tasks.map((task) => (
                      <div key={task.id} className="weekly-task" style={{ borderLeftColor: task.color || '#3b82f6' }}>
                        <div className="weekly-task-name">{task.name}</div>
                        <div className="weekly-task-item">{getItemName(task.item_id)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearlyView = () => {
    const yearTasks = getTasksForYear();
    
    return (
      <div className="yearly-view">
        <div className="yearly-grid">
          {yearTasks.map(({ month, tasks }) => (
            <div key={month} className="yearly-month">
              <div className="yearly-month-header">{monthNames[month]}</div>
              <div className="yearly-month-tasks">
                {tasks.length === 0 ? (
                  <div className="no-tasks-small">No tasks</div>
                ) : (
                  <div className="yearly-task-count">
                    {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                  </div>
                )}
                {tasks.length > 0 && (
                  <div className="yearly-task-list">
                    {tasks.slice(0, MAX_YEARLY_TASKS_DISPLAYED).map((task) => (
                      <div key={task.id} className="yearly-task" style={{ borderLeftColor: task.color || '#3b82f6' }}>
                        <div className="yearly-task-name">{task.name}</div>
                      </div>
                    ))}
                    {tasks.length > MAX_YEARLY_TASKS_DISPLAYED && (
                      <div className="yearly-more">+{tasks.length - MAX_YEARLY_TASKS_DISPLAYED} more</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Maintenance Calendar</h2>
      </div>
      {loading ? (
        <div className="calendar-loading">Loading maintenance tasks...</div>
      ) : (
        <div className="calendar-container">
          <div className="calendar-controls">
            <div className="calendar-view-buttons">
              <button
                className={`calendar-view-btn ${viewMode === "daily" ? "active" : ""}`}
                onClick={() => setViewMode("daily")}
              >
                Daily
              </button>
              <button
                className={`calendar-view-btn ${viewMode === "weekly" ? "active" : ""}`}
                onClick={() => setViewMode("weekly")}
              >
                Weekly
              </button>
              <button
                className={`calendar-view-btn ${viewMode === "monthly" ? "active" : ""}`}
                onClick={() => setViewMode("monthly")}
              >
                Monthly
              </button>
              <button
                className={`calendar-view-btn ${viewMode === "yearly" ? "active" : ""}`}
                onClick={() => setViewMode("yearly")}
              >
                Yearly
              </button>
            </div>
            <button className="calendar-print-btn" onClick={handlePrint} title="Print Calendar" aria-label="Print Calendar">
              Print
            </button>
          </div>
          <div className="calendar-header">
            <button className="btn-outline" onClick={handlePrevious}>
              ‹
            </button>
            <h3>
              {getNavigationLabel()}
            </h3>
            <button className="btn-outline" onClick={handleNext}>
              ›
            </button>
          </div>
          {viewMode === "monthly" && (
            <>
              <div className="calendar-weekdays">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>
              <div className="calendar-grid">
                {renderCalendar()}
              </div>
            </>
          )}
          {viewMode === "daily" && renderDailyView()}
          {viewMode === "weekly" && renderWeeklyView()}
          {viewMode === "yearly" && renderYearlyView()}
        </div>
      )}
    </section>
  );
};

export default Calendar;
