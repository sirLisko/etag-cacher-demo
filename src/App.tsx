import React, { useState, useEffect } from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import {
  todosApi,
  todosCacher,
  useGetTodosQuery,
  useUpdateTodoStatusMutation,
  useAddTodoMutation,
} from "./api/todosApi";
import type { Todo } from "./api/todosApi";

// Configure the Redux store
const store = configureStore({
  reducer: {
    [todosApi.reducerPath]: todosApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(todosApi.middleware),
});

// TodoItem component
const TodoItem: React.FC<{ todo: Todo }> = ({ todo }) => {
  const [updateStatus] = useUpdateTodoStatusMutation();

  const handleStatusChange = async () => {
    const newStatus = todo.status === "pending" ? "completed" : "pending";

    try {
      await updateStatus({ id: todo.id, status: newStatus });
      // This will trigger polling via the EtagCacher
      todosCacher.setPoll("global");
    } catch (error) {
      console.error("Failed to update todo status:", error);
    }
  };

  return (
    <div
      className="todo-item"
      style={{
        display: "flex",
        alignItems: "center",
        marginBottom: "10px",
        padding: "10px",
        backgroundColor: todo.status === "pending" ? "#fffdeb" : "#e8f6e8",
        borderRadius: "4px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        transition: "all 0.2s ease",
      }}
    >
      <input
        type="checkbox"
        checked={todo.status === "completed"}
        onChange={handleStatusChange}
        style={{ marginRight: "10px" }}
      />
      <span
        style={{
          textDecoration: todo.status === "completed" ? "line-through" : "none",
          flexGrow: 1,
          color: todo.status === "completed" ? "#666" : "#333",
        }}
      >
        {todo.title}
      </span>
      <span
        style={{
          fontSize: "0.8rem",
          color: todo.status === "pending" ? "#f57c00" : "#4caf50",
          fontWeight: "bold",
          padding: "2px 6px",
          borderRadius: "3px",
          backgroundColor: todo.status === "pending" ? "#fff3e0" : "#e8f5e9",
        }}
      >
        {todo.status.toUpperCase()}
      </span>
    </div>
  );
};

// TodoList component with polling status indicator
const TodoList: React.FC = () => {
  const { data, isFetching, isLoading } = useGetTodosQuery();
  const todos = data?.data || [];

  const [addTodo] = useAddTodoMutation();
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [pollingStatus, setPollingStatus] = useState({
    polling: false,
    retries: 0,
  });

  // Check polling status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const status = todosCacher.getPollStatus("global");
      if (status) {
        setPollingStatus(status);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    try {
      await addTodo({ title: newTodoTitle });
      setNewTodoTitle("");

      // Set polling to check for changes
      todosCacher.setPoll("global");
    } catch (error) {
      console.error("Failed to add todo:", error);
    }
  };

  if (isLoading) return <div>Loading todos...</div>;

  return (
    <div className="todo-list">
      <div
        className="status-bar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          marginBottom: "15px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        }}
      >
        <div>
          <span style={{ fontWeight: "bold" }}>Status:</span>{" "}
          {isFetching ? "Refreshing data..." : "Idle"}
        </div>
        <div
          style={{
            color: pollingStatus.polling ? "#f57c00" : "#4caf50",
            fontWeight: "bold",
            fontSize: "0.9rem",
          }}
        >
          {pollingStatus.polling
            ? `Polling active (retry ${pollingStatus.retries})`
            : "No active polling"}
        </div>
      </div>

      <form
        onSubmit={handleAddTodo}
        style={{
          display: "flex",
          marginBottom: "20px",
        }}
      >
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="Add a new todo..."
          style={{
            flexGrow: 1,
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "4px 0 0 4px",
            fontSize: "1rem",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 16px",
            backgroundColor: "#2196f3",
            color: "white",
            border: "none",
            borderRadius: "0 4px 4px 0",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Add
        </button>
      </form>

      <div className="todos-container">
        {Array.isArray(todos) && todos.length > 0 ? (
          todos.map((todo) => <TodoItem key={todo.id} todo={todo} />)
        ) : (
          <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
            No todos yet. Add one to get started!
          </div>
        )}
      </div>

      <div
        className="info-panel"
        style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#e3f2fd",
          borderRadius: "4px",
          fontSize: "0.9rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ marginTop: 0, color: "#0d47a1" }}>About EtagCacher</h3>
        <p>
          This demo showcases efficient data polling with ETag caching. When you
          add or update todos:
        </p>
        <ul style={{ paddingLeft: "20px", lineHeight: "1.5" }}>
          <li>The EtagCacher tracks server-side changes via ETags</li>
          <li>Polling automatically starts when you make changes</li>
          <li>
            Polling stops when all todos are completed or a new ETag is received
          </li>
          <li>
            <strong>Note:</strong> There's a 2-second delay when adding a todo
            before the server updates the ETag after changes
          </li>
        </ul>
        <p style={{ marginBottom: 0 }}>
          Try adding todos and marking them as completed to see the polling in
          action!
        </p>
      </div>
    </div>
  );
};

// Main application component
function App() {
  return (
    <Provider store={store}>
      <div
        className="app"
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "20px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <h1 style={{ color: "#1976d2", marginBottom: "8px" }}>
          EtagCacher Demo
        </h1>
        <p style={{ color: "#555", marginBottom: "20px" }}>
          A demonstration of efficient polling and cache invalidation with RTK
          Query and ETag caching.
        </p>

        <TodoList />
      </div>
    </Provider>
  );
}

export default App;
