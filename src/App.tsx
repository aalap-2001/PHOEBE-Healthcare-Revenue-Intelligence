import { Navigate, Route, Routes } from 'react-router-dom'
import { ProfileProvider } from './profile'
import { AppShell } from './components/AppShell'
import { DEFAULT_CODE } from './data/clinic'
import { Overview } from './pages/Overview'
import { CodeDetail } from './pages/CodeDetail'
import { ClinicProfile } from './pages/ClinicProfile'
import { Opportunity } from './pages/Opportunity'

export default function App() {
  return (
    <ProfileProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Overview />} />
          <Route path="codes" element={<Navigate to={`/codes/${DEFAULT_CODE}`} replace />} />
          <Route path="codes/:code" element={<CodeDetail />} />
          <Route path="opportunities" element={<Opportunity />} />
          <Route path="profile" element={<ClinicProfile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ProfileProvider>
  )
}
