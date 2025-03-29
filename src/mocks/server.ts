import { rest } from 'msw';
import { setupWorker } from 'msw';

// Mock database
let todos = [
  { id: '1', title: 'Learn RTK Query', status: 'pending' },
  { id: '2', title: 'Implement EtagCacher', status: 'pending' },
];

let counter = 1;
// ETag tracking
let currentEtag = 'etag-1';

// Generate a new ETag when data changes
const generateNewEtag = () => {
  currentEtag = `etag-${counter += 1}`;
  return currentEtag;
};

export const handlers = [
  rest.get('/api/todos', (_req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.set('ETag', currentEtag),
      ctx.json(todos)
    );
  }),

  rest.put('/api/todos/:id', (req, res, ctx) => {
    const { id } = req.params;
    const { status } = req.body as { status: string };

    todos = todos.map(todo =>
      todo.id === id ? { ...todo, status } : todo
    );

    // Generate new ETag since data changed
    generateNewEtag();

    // Return success with a slight delay to simulate server processing
    return res(
      ctx.delay(500),
      ctx.status(200),
      ctx.set('ETag', currentEtag),
      ctx.json({ success: true })
    );
  }),

  // Add a new todo
  rest.post('/api/todos', async (req, res, ctx) => {
    const body = await req.json();
    const newTodo = {
      id: `${todos.length + 1}`,
      title: body.title,
      status: 'pending'
    };

    todos = [...todos, newTodo];

    // Generate new ETag after 2 seconds to simulate server processing
    setTimeout(() => {
      generateNewEtag();
    }, 2000);

    return res(
      ctx.delay(500),
      ctx.status(201),
      ctx.set('ETag', currentEtag),
      ctx.json(newTodo)
    );
  })
];

// Setup the worker
export const worker = setupWorker(...handlers);