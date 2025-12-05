import React, { useState, useEffect, useMemo, useCallback } from "react";
import { fetchMaintenanceTasks, fetchItems, type MaintenanceTask, type Item } from "../lib/api";

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

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
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasksByDate[dateStr] || [];
  }, [currentDate, tasksByDate]);

  const getItemName = useCallback((itemId: string) => {
    const item = items.find(i => i.id.toString() === itemId);
    return item?.name || 'Unknown Item';
  }, [items]);

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

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Maintenance Calendar</h2>
      </div>
      {loading ? (
        <div className="calendar-loading">Loading maintenance tasks...</div>
      ) : (
        <div className="calendar-container">
          <div className="calendar-header">
            <button className="btn-outline" onClick={previousMonth}>
              ‹
            </button>
            <h3>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button className="btn-outline" onClick={nextMonth}>
              ›
            </button>
          </div>
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
        </div>
      )}
    </section>
  );
};

export default Calendar;
