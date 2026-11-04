import { createBrowserRouter } from 'react-router-dom'

import { ForgotPasswordPage } from '../modules/auth/views/ForgotPasswordPage'
import { LoginPage } from '../modules/auth/views/LoginPage'
import { RegisterPage } from '../modules/auth/views/RegisterPage'
import { AccountPage } from '../modules/account/views/AccountPage'
import { DashboardPage } from '../modules/dashboard/views/DashboardPage'
import { CalendarPage } from '../modules/calendar/views/CalendarPage'
import { NotesPage } from '../modules/notes/views/NotesPage'
import { ChatPage } from '../modules/chat/views/ChatPage'
import { LandingPage } from '../modules/landing/views/LandingPage'
import { PublicLayout } from '../shared/components/layout/PublicLayout'
import { App } from './App'
import { GuestOnly, RequireAuth } from './RouteGuards'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
      { path: '/register', element: <GuestOnly><RegisterPage /></GuestOnly> },
      { path: '/forgot-password', element: <GuestOnly><ForgotPasswordPage /></GuestOnly> },
    ],
  },
  {
    element: <RequireAuth><App /></RequireAuth>,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/notes', element: <NotesPage /> },
      {
        path: '/notes/trash',
        lazy: async () => {
          const { NoteTrashPage } = await import('../modules/notes/views/NoteTrashPage')
          return { Component: NoteTrashPage }
        },
      },
      {
        path: '/notes/:noteId',
        lazy: async () => {
          const { NoteEditorPage } = await import('../modules/notes/views/NoteEditorPage')
          return { Component: NoteEditorPage }
        },
      },
      { path: '/chat', element: <ChatPage /> },
      { path: '/account', element: <AccountPage /> },
    ],
  },
])
