import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { EtagCacher } from './eTagCacher';

export interface Todo {
  id: string;
  title: string;
  status: 'pending' | 'completed' | 'failed';
}

export const todosApi = createApi({
  reducerPath: 'todosApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/',
    responseHandler: async (response) => {
      const data = await response.json();
      return {
        data,
        meta: {
          etag: response.headers.get('ETag') || ''
        }
      };
    }
  }),
  tagTypes: ['Todos'],
  endpoints: (builder) => ({
    getTodos: builder.query<{data: Todo[], meta: {etag: string}}, void>({
      query: () => 'todos',
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          todosCacher.checkEtag(dispatch, "global", result.data.meta.etag);
        } catch (e) {
          console.error(e);
        }
      },
      providesTags: ['Todos'],
    }),
    updateTodoStatus: builder.mutation<{ success: boolean }, { id: string; status: Todo['status'] }>({
      query: ({ id, status }) => ({
        url: `todos/${id}`,
        method: 'PUT',
        body: { status },
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          todosCacher.setPoll('global');

        } catch (e) {
          console.error(e);
        }
      },
      invalidatesTags: ['Todos'],
    }),
    addTodo: builder.mutation<Todo, { title: string }>({
      query: (newTodo) => ({
        url: 'todos',
        method: 'POST',
        body: newTodo,
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          todosCacher.setPoll('global');

        } catch (e) {
          console.error(e);
        }
      },
      invalidatesTags: ['Todos'],
    }),
  }),
});

// Initialize the EtagCacher with proper types
export const todosCacher = new EtagCacher<typeof todosApi, Todo, 'Todos'>(
  'Todos',
  todosApi
);

export const {
  useGetTodosQuery,
  useUpdateTodoStatusMutation,
  useAddTodoMutation
} = todosApi;